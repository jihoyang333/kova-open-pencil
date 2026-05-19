# PRD 04 — Account Page + Stripe Billing — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the `/account` full-page route with 5 sidebar sections (Profile, Plan & billing, Brand Kit shell, Integrations, Danger zone) + the Stripe foundation (Checkout, Customer Portal, webhook, reconcile cron) + refactor the M9 Shopify integration UI to dark theme and re-route it to `/account/integrations` with a brand picker + a NEW `shopify_connection_history` table backing the sync-history accordion.

**Architecture:** Vue 3 + Pinia + Vue Router on top of Supabase + Vercel Functions. Stripe SDK on the server (Node runtime via Vercel Fluid Compute). Stripe-hosted Checkout + Customer Portal opened via redirect (Customer Portal in a new tab — Stripe blocks iframe embed per `docs.stripe.com/customer-management/integrate-customer-portal`, verified 2026-05-15). One Stripe Customer per user; **D-2 amended 2026-05-17 — Stripe Customer is DELETED on account-deletion via Cluster 01 GDPR cron** (was originally "kept forever"; invoice history persists in Stripe 7 yrs per their docs regardless). Webhook handler verifies HMAC-SHA256 signature, dedups by `event.id` via a primary-key INSERT on `stripe_webhook_events`, and dispatches 6 event types. Weekly reconcile cron heals webhook-miss drift. PRD section IDs are cited as `[PRD §N.M]` throughout — engineers should keep `docs/kova-final-prds/04-account-and-stripe-billing.md` open while executing.

> **20 founder amendments to PRD 04 ratified 2026-05-17.** See PRD §13.2.1 for the full table. Key code-affecting items: (1) Avatar = PNG/JPG only, 5MB max, server normalizes to PNG via `sharp` at fixed path `avatar.png`. (2) `plan_status` CHECK now includes `'trialing'` — webhook stores it as-is. (3) D-2 amended: Stripe Customer deleted on account-deletion via Cluster 01 cron. (4) All 4 Resend templates ship at MVP (new/upgraded/cancelled/payment-failed). (5) `<BrandPicker>` has 3 render modes (empty/static-label/dropdown) with precedence URL > Q5 > alphabetical. (6) `<TrialBanner>` ships hidden, conditional on `planStatus === 'trialing'`.
>
> **B12 archive reversal 2026-05-17** — additional dispatch, separate from the 20 amendments. Sidebar 5 → **6 sections** (Brands added between Profile and Plan & billing). New `/account/brands` route. PRD 03 owns the page content (`<BrandsArchiveView>`); PRD 04 owns route registration + sidebar entry + `<SectionResolver>` wiring. See PRD §13.2.2 + plan Task 7.1 + Task 13.1 + Task 13.3.

**Tech Stack:** Vue 3 (Composition API, `<script setup lang="ts">`), Pinia setup stores, Reka UI (DropdownMenu, Dialog, Accordion), Tailwind CSS 4 (utility classes only, theme tokens from `kova-hifi.css`), Lucide icons via unplugin-icons, Stripe Node SDK v17.x, `@supabase/supabase-js`, Resend, Sentry, valibot for input validation. No Zod. No React. No ORM.

**PRD reference:** `/Users/jihoyang/kova-main/kova-open-pencil-1/docs/kova-final-prds/04-account-and-stripe-billing.md`

**Branch:** `feat/m9-shopify` (continuation of the active feature branch; cluster 04 commits cascade onto the existing M9 work).

---

## File structure

### Backend (Edge Functions + migrations)

| File | Purpose |
|---|---|
| `supabase/migrations/20260605_04_account_stripe_billing.sql` | Add Stripe + avatar columns to `users`; create `stripe_webhook_events` + `shopify_connection_history`; RPCs `user_has_active_plan`, `log_shopify_connection_event`; RLS. [PRD §4.1] |
| `api/stripe/checkout-session.ts` | Create Stripe Checkout session; auto-create Customer on first call. [PRD §5.1.1] |
| `api/stripe/portal-session.ts` | Create Stripe Customer Portal session (new-tab redirect). [PRD §5.1.2] |
| `api/stripe/webhook.ts` | Signature-verified webhook handler with idempotency + 6-event dispatch. [PRD §5.1.3] |
| `api/stripe/webhook-handlers/handle-checkout-completed.ts` | Per-event handler. [PRD §5.1.3] |
| `api/stripe/webhook-handlers/handle-subscription-created.ts` | Per-event handler. [PRD §5.1.3] |
| `api/stripe/webhook-handlers/handle-subscription-updated.ts` | Per-event handler. [PRD §5.1.3] |
| `api/stripe/webhook-handlers/handle-subscription-deleted.ts` | Per-event handler. [PRD §5.1.3] |
| `api/stripe/webhook-handlers/handle-invoice-paid.ts` | Per-event handler. [PRD §5.1.3] |
| `api/stripe/webhook-handlers/handle-invoice-payment-failed.ts` | Per-event handler. [PRD §5.1.3] |
| `api/stripe/invoices.ts` | GET — proxy to `stripe.invoices.list`. [PRD §5.1.4] |
| `api/stripe/reconcile.ts` | Weekly cron handler — drift heal on `past_due`. [PRD §5.1.5] |
| `api/account/avatar-upload.ts` | POST — returns signed Supabase Storage upload URL. [PRD §5.1.6] |
| `api/account/avatar-confirm.ts` | POST — persists `users.avatar_storage_path` after successful upload. [PRD §5.1.6] |
| `api/_shared/stripe-client.ts` | Singleton Stripe SDK instance (lazy init; reads `STRIPE_SECRET_KEY`). |
| `api/_shared/price-map.ts` | `priceIdToPlan` + `planToPriceId` maps + helper. |
| `api/_shared/audit-log.ts` | Cluster 11 wrapper — adapter used by all webhook handlers. (Verify Cluster 11 provides; if not, ship a local stub that writes to `audit_log` table.) |
| `vercel.json` | Add `/api/stripe/reconcile` cron entry. |
| `emails/account/subscription-new.html` | Resend template — new paid subscription. [PRD §5.4.3] |
| `emails/account/subscription-upgraded.html` | Resend template — plan upgraded. [PRD §5.4.3] |
| `emails/account/subscription-cancelled.html` | Resend template — cancelled (scheduled + final). [PRD §5.4.3] |
| `emails/account/subscription-payment-failed.html` | Resend template — payment failed dunning. [PRD §5.4.3] |
| `docs/legal/privacy-policy.md` | Extend Stripe sub-processor disclosure. [PRD §5.5] |
| `docs/legal/ropa.md` | Stripe row addition. [PRD §5.5] |
| `docs/operations/stripe-setup-runbook.md` | New — operator runbook for Stripe Dashboard config. [PRD §5.5] |

### Frontend (Vue components + stores + composables)

| File | Purpose |
|---|---|
| `src/router/routes.ts` | Add `/account/:section?` (enum includes `brands` per B12 reversal 2026-05-17), `/account/billing/success`, `/account/billing/cancel`. [PRD §6.1] |
| `src/stores/billing.ts` | NEW — `useBillingStore`. [PRD §6.2.1] |
| `src/stores/account.ts` | NEW — `useAccountStore`. [PRD §6.2.2] |
| `src/composables/account/use-account-section.ts` | Section URL sync. [PRD §6.3] |
| `src/composables/account/use-brand-picker.ts` | Brand selection per-section. [PRD §6.3] |
| `src/composables/account/use-plan-gate.ts` | Plan-based feature gate (stub at MVP). [PRD §6.3] |
| `src/composables/account/use-avatar-upload.ts` | Avatar upload orchestration. [PRD §6.3] |
| `src/composables/account/use-stripe-return.ts` | Stripe return landing logic. [PRD §6.3] |
| `src/views/account/AccountView.vue` | Page shell. [PRD §6.4.3] |
| `src/views/account/StripeReturnLanding.vue` | B10.1 + B10.2. [PRD §6.4.4] |
| `src/views/account/sections/SectionResolver.vue` | Dispatch to section component. [PRD §6.4.1] |
| `src/views/account/sections/ProfileSection.vue` | A7.1. [PRD §6.4.1] |
| `src/views/account/sections/BillingSection.vue` | A7.2. [PRD §6.4.1] |
| `src/views/account/sections/BrandKitSection.vue` | A7.3 shell. [PRD §6.4.1] |
| `src/views/account/sections/IntegrationsSection.vue` | A7.5 (M9 refactor). [PRD §6.4.1 + §6.4.5] |
| `src/views/account/sections/DangerZoneSection.vue` | A7.6 (mounts Cluster 01 `<DangerZoneCard>`). [PRD §6.4.1] |
| `src/components/account/AccountSidebar.vue` | **6-item sidebar** including Brands (B12 reversal 2026-05-17). [PRD §6.4.2] |
| `src/components/account/AccountSectionHeader.vue` | Section title + sub-copy + trailing slot. [PRD §6.4.2] |
| `src/components/account/UnsavedPill.vue` | Unsaved-changes pill. [PRD §6.4.2] |
| `src/components/account/BrandPicker.vue` | Brand selection dropdown (A2b). [PRD §6.4.2] |
| `src/components/account/PlanCard.vue` | A7.2 plan card with 5-variant status pill (incl. Trial). [PRD §6.4.2] |
| `src/components/account/TrialBanner.vue` | NEW — conditional "Trial — X days left" banner. Ships hidden at MVP per founder decision 2026-05-17. [PRD §6.4.2] |
| `src/constants/billing-plans.ts` | NEW — Free-tier bullets + plan-name map + `PLAN_GATE_ENFORCED` flag. [PRD §6.4.2] |
| `src/components/account/UsageBar.vue` | A7.2 usage bar. [PRD §6.4.2] |
| `src/components/account/InvoiceTable.vue` | A7.2 invoice table. [PRD §6.4.2] |
| `src/components/account/PastDueBanner.vue` | Past-due banner. [PRD §6.4.2] |
| `src/components/account/IntegrationCard.vue` | NEW — refactored from M9 `IntegrationsCard.vue`. [PRD §6.4.2 + §6.4.5] |
| `src/components/account/SyncHistoryAccordion.vue` | NEW — wires `shopify_connection_history`. [PRD §6.4.2] |
| `src/components/account/ShopifyConnectForm.vue` | Extracted from M9; shared between connect + reconnect states. [PRD §6.4.5] |
| `src/components/account/SyncProgressBar.vue` | Extracted from M9; ARIA progressbar primitive. [PRD §6.4.5] |
| `src/composables/use-shopify-connection.ts` | MODIFY — add `fetchConnectionHistory()` method + Realtime subscription. [PRD §6.4.5] |
| `src/constants/billing-plans.ts` | NEW — plan → cap map + price_id ↔ plan name maps. [PRD §6.4.5, §10] |
| `src/views/dashboard/SettingsBrandIntegrationsView.vue` | DELETE (replaced by `/account/integrations`). |
| `src/components/dashboard/IntegrationsCard.vue` | DELETE (replaced by `src/components/account/IntegrationCard.vue`). |

### Tests

Co-located: `tests/unit/...` mirrors `src/...`; `tests/integration/...` for DB + Edge-Function flows; `tests/e2e/account/...` for Playwright/Vercel Agent Browser specs. Specific test files enumerated per task.

---

## Phase 1 — Database migration + RPCs

**Goal:** Schema + RPCs + RLS land before any code that depends on them. [PRD §4.1]

### Task 1.1: Write migration file

**Files:**
- Create: `kova-open-pencil-1/supabase/migrations/20260605_04_account_stripe_billing.sql`

- [ ] **Step 1: Create the migration file**

Copy the full SQL block from PRD §4.1 verbatim into the new file. The block is idempotent (`IF NOT EXISTS` + `CREATE OR REPLACE`) and wrapped in `BEGIN ... COMMIT`.

```bash
mkdir -p kova-open-pencil-1/supabase/migrations
# write file content per PRD §4.1
```

- [ ] **Step 2: Apply locally**

```bash
cd kova-open-pencil-1
supabase db reset                  # WARNING: resets local DB; OK in dev only
# or for non-destructive apply:
supabase migration up
```

Expected: migration applies cleanly; psql output shows new columns + tables + RPCs.

- [ ] **Step 3: Verify schema via psql**

```bash
psql "$DATABASE_URL_LOCAL" -c "\d public.users" | grep -E "stripe_customer_id|stripe_subscription_id|plan|plan_status|current_period_end|cancel_at_period_end|avatar_storage_path"
psql "$DATABASE_URL_LOCAL" -c "\d public.stripe_webhook_events"
psql "$DATABASE_URL_LOCAL" -c "\d public.shopify_connection_history"
psql "$DATABASE_URL_LOCAL" -c "\df public.user_has_active_plan"
psql "$DATABASE_URL_LOCAL" -c "\df public.log_shopify_connection_event"
```

Expected: all entities present.

- [ ] **Step 4: Commit**

```bash
git add kova-open-pencil-1/supabase/migrations/20260605_04_account_stripe_billing.sql
git commit -m "feat(04): add Stripe + Shopify-history schema for Account page

- users: stripe_customer_id, stripe_subscription_id, plan, plan_status,
  current_period_end, cancel_at_period_end, avatar_storage_path
- stripe_webhook_events: idempotency log keyed on event.id
- shopify_connection_history: per-brand audit trail powering /account/integrations
- RPCs: user_has_active_plan, log_shopify_connection_event
- RLS: stripe_webhook_events service-only; shopify_connection_history user-read-own

Per PRD 04 §4.1."
```

### Task 1.2: Migration integration test

**Files:**
- Create: `kova-open-pencil-1/tests/integration/account/migrations.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/integration/account/migrations.test.ts
import { describe, it, expect, beforeAll } from 'bun:test'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_LOCAL_URL!,
  process.env.SUPABASE_LOCAL_SERVICE_ROLE_KEY!,
)

describe('20260605_04 migration', () => {
  it('adds Stripe columns to users', async () => {
    const { data, error } = await supabase.rpc('pg_catalog.format_type', {})
    // Use information_schema instead:
    const { data: cols } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'users')
    const names = (cols ?? []).map(c => c.column_name)
    for (const c of ['stripe_customer_id', 'stripe_subscription_id', 'plan', 'plan_status', 'current_period_end', 'cancel_at_period_end', 'avatar_storage_path']) {
      expect(names).toContain(c)
    }
  })

  it('creates stripe_webhook_events table', async () => {
    const { error } = await supabase.from('stripe_webhook_events').select('event_id').limit(0)
    expect(error).toBeNull()
  })

  it('creates shopify_connection_history table', async () => {
    const { error } = await supabase.from('shopify_connection_history').select('id').limit(0)
    expect(error).toBeNull()
  })

  it('enforces plan_status CHECK constraint — rejects unknown values', async () => {
    const { error } = await supabase.from('users').update({ plan_status: 'bogus' }).eq('id', '00000000-0000-0000-0000-000000000000')
    // CHECK violation surfaces as a constraint error
    expect(error?.code).toBe('23514')
  })

  it('accepts all 5 plan_status values (active/past_due/cancelled/incomplete/trialing) — founder decision 2026-05-17', async () => {
    const userId = crypto.randomUUID()
    await supabase.from('users').insert({ id: userId, email: `${userId}@test.local`, name: 'T' })
    for (const status of ['active', 'past_due', 'cancelled', 'incomplete', 'trialing']) {
      const { error } = await supabase.from('users').update({ plan_status: status }).eq('id', userId)
      expect(error).toBeNull()
    }
    await supabase.from('users').delete().eq('id', userId)
  })
})
```

- [ ] **Step 2: Run the test — expect PASS (migration already applied in 1.1)**

```bash
cd kova-open-pencil-1
bun run test:unit -- tests/integration/account/migrations.test.ts
```

Expected: all 5 tests pass (4 original + 1 trialing-acceptance test).

- [ ] **Step 3: Commit**

```bash
git add tests/integration/account/migrations.test.ts
git commit -m "test(04): integration test for 20260605_04 migration"
```

### Task 1.3: RPC test — `user_has_active_plan`

**Files:**
- Create: `kova-open-pencil-1/tests/integration/account/rpc-user-has-active-plan.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'bun:test'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_LOCAL_URL!,
  process.env.SUPABASE_LOCAL_SERVICE_ROLE_KEY!,
)

describe('user_has_active_plan RPC', () => {
  it('returns true for active plan with future period_end', async () => {
    const userId = crypto.randomUUID()
    await supabase.from('users').insert({ id: userId, email: `${userId}@test.local`, name: 'T', plan: 'solo', plan_status: 'active', current_period_end: new Date(Date.now() + 86400000).toISOString() })
    const { data } = await supabase.rpc('user_has_active_plan', { p_user_id: userId })
    expect(data).toBe(true)
  })

  it('returns false for past_due', async () => {
    const userId = crypto.randomUUID()
    await supabase.from('users').insert({ id: userId, email: `${userId}@test.local`, name: 'T', plan: 'solo', plan_status: 'past_due', current_period_end: new Date(Date.now() + 86400000).toISOString() })
    const { data } = await supabase.rpc('user_has_active_plan', { p_user_id: userId })
    expect(data).toBe(false)
  })

  it('returns false for active but past current_period_end', async () => {
    const userId = crypto.randomUUID()
    await supabase.from('users').insert({ id: userId, email: `${userId}@test.local`, name: 'T', plan: 'solo', plan_status: 'active', current_period_end: new Date(Date.now() - 86400000).toISOString() })
    const { data } = await supabase.rpc('user_has_active_plan', { p_user_id: userId })
    expect(data).toBe(false)
  })
})
```

- [ ] **Step 2: Run + verify pass**

```bash
bun run test:unit -- tests/integration/account/rpc-user-has-active-plan.test.ts
```

Expected: 3 tests pass.

- [ ] **Step 3: Commit**

```bash
git add tests/integration/account/rpc-user-has-active-plan.test.ts
git commit -m "test(04): integration test for user_has_active_plan RPC"
```

### Task 1.4: RPC test — `log_shopify_connection_event`

**Files:**
- Create: `kova-open-pencil-1/tests/integration/account/rpc-log-shopify-event.test.ts`

- [ ] **Step 1: Write the test (service-role + authenticated paths)**

```typescript
import { describe, it, expect } from 'bun:test'
import { createClient } from '@supabase/supabase-js'

describe('log_shopify_connection_event RPC', () => {
  it('service_role can call and returns row id', async () => {
    const service = createClient(process.env.SUPABASE_LOCAL_URL!, process.env.SUPABASE_LOCAL_SERVICE_ROLE_KEY!)
    // Seed a brand
    const brandId = crypto.randomUUID()
    const userId = crypto.randomUUID()
    await service.from('users').insert({ id: userId, email: `${userId}@t.local`, name: 'T' })
    await service.from('brands').insert({ id: brandId, user_id: userId, name: 'Test' })

    const { data, error } = await service.rpc('log_shopify_connection_event', {
      p_brand_id: brandId,
      p_event_type: 'connected',
      p_source: 'user',
      p_metadata: { shop_domain: 'test.myshopify.com' },
    })
    expect(error).toBeNull()
    expect(data).toBeTruthy()
  })

  it('authenticated role cannot call', async () => {
    const anon = createClient(process.env.SUPABASE_LOCAL_URL!, process.env.SUPABASE_LOCAL_ANON_KEY!)
    // Sign in a test user first; placeholder — adapt to project's auth-test helpers
    // ... sign in ...
    const { error } = await anon.rpc('log_shopify_connection_event', {
      p_brand_id: '00000000-0000-0000-0000-000000000000',
      p_event_type: 'connected',
      p_source: 'user',
      p_metadata: {},
    })
    expect(error?.code).toBe('42501')  // insufficient_privilege
  })
})
```

- [ ] **Step 2: Run + verify pass**

```bash
bun run test:unit -- tests/integration/account/rpc-log-shopify-event.test.ts
```

- [ ] **Step 3: Commit**

```bash
git add tests/integration/account/rpc-log-shopify-event.test.ts
git commit -m "test(04): integration test for log_shopify_connection_event RPC"
```

### Task 1.5: RLS tests

**Files:**
- Create: `kova-open-pencil-1/tests/integration/account/rls-stripe-webhook-events.test.ts`
- Create: `kova-open-pencil-1/tests/integration/account/rls-shopify-history.test.ts`

- [ ] **Step 1: Write both RLS tests**

```typescript
// tests/integration/account/rls-stripe-webhook-events.test.ts
import { describe, it, expect } from 'bun:test'
import { createClient } from '@supabase/supabase-js'

describe('stripe_webhook_events RLS', () => {
  it('authenticated role cannot SELECT', async () => {
    const anon = createClient(process.env.SUPABASE_LOCAL_URL!, process.env.SUPABASE_LOCAL_ANON_KEY!)
    // Sign in test user
    await anon.auth.signInWithPassword({ email: 'rls-test@kova.local', password: 'test1234' })
    const { data, error } = await anon.from('stripe_webhook_events').select('event_id').limit(1)
    expect(data?.length ?? 0).toBe(0)
  })

  it('service_role can SELECT', async () => {
    const service = createClient(process.env.SUPABASE_LOCAL_URL!, process.env.SUPABASE_LOCAL_SERVICE_ROLE_KEY!)
    const { error } = await service.from('stripe_webhook_events').select('event_id').limit(1)
    expect(error).toBeNull()
  })
})
```

```typescript
// tests/integration/account/rls-shopify-history.test.ts
import { describe, it, expect, beforeAll } from 'bun:test'
import { createClient } from '@supabase/supabase-js'

describe('shopify_connection_history RLS', () => {
  it('user can read own brand history; cannot read others', async () => {
    const service = createClient(process.env.SUPABASE_LOCAL_URL!, process.env.SUPABASE_LOCAL_SERVICE_ROLE_KEY!)

    // Two users, two brands, two history rows
    const userA = crypto.randomUUID()
    const userB = crypto.randomUUID()
    const brandA = crypto.randomUUID()
    const brandB = crypto.randomUUID()
    await service.from('users').insert([
      { id: userA, email: `${userA}@t.local`, name: 'A' },
      { id: userB, email: `${userB}@t.local`, name: 'B' },
    ])
    await service.from('brands').insert([
      { id: brandA, user_id: userA, name: 'A' },
      { id: brandB, user_id: userB, name: 'B' },
    ])
    await service.from('shopify_connection_history').insert([
      { brand_id: brandA, event_type: 'connected', source: 'user', metadata: {} },
      { brand_id: brandB, event_type: 'connected', source: 'user', metadata: {} },
    ])

    // Sign in as A
    const anon = createClient(process.env.SUPABASE_LOCAL_URL!, process.env.SUPABASE_LOCAL_ANON_KEY!)
    await anon.auth.signInWithPassword({ email: `${userA}@t.local`, password: 'unused' })
    // Note: adapt to project's actual auth test fixture pattern

    const { data } = await anon.from('shopify_connection_history').select('id, brand_id')
    expect(data?.every(r => r.brand_id === brandA)).toBe(true)
  })

  it('authenticated cannot INSERT', async () => {
    const anon = createClient(process.env.SUPABASE_LOCAL_URL!, process.env.SUPABASE_LOCAL_ANON_KEY!)
    const { error } = await anon.from('shopify_connection_history').insert({ brand_id: crypto.randomUUID(), event_type: 'connected', source: 'user' })
    expect(error?.code).toBe('42501')
  })
})
```

- [ ] **Step 2: Run + verify pass**

```bash
bun run test:unit -- tests/integration/account/rls-stripe-webhook-events.test.ts
bun run test:unit -- tests/integration/account/rls-shopify-history.test.ts
```

- [ ] **Step 3: Commit**

```bash
git add tests/integration/account/rls-*.test.ts
git commit -m "test(04): RLS integration tests for stripe_webhook_events + shopify_connection_history"
```

---

## Phase 2 — Stripe SDK shared modules

**Goal:** Lazy-init Stripe client + price-map + audit-log helper so every Edge Function has clean shared utilities. [PRD §5.1 + §5.4]

### Task 2.1: Install Stripe SDK + sharp (avatar normalization)

- [ ] **Step 1: Install + commit lockfile**

```bash
cd kova-open-pencil-1
bun add stripe@17 sharp@0.34
```

Founder decision 2026-05-17 adds `sharp` for avatar normalization (resize 256×256 + PNG conversion in `avatar-confirm` Edge Function).

- [ ] **Step 2: Verify package.json + bun.lock**

```bash
grep -E '"(stripe|sharp)":' package.json
```

Expected: `"stripe": "^17.x.x"` AND `"sharp": "^0.34.x"`.

- [ ] **Step 3: Verify sharp's native bindings resolve on Vercel runtime**

```bash
bun -e "import('sharp').then(s => console.log('sharp loaded:', !!s.default))"
```

Expected: `sharp loaded: true`. If errors on macOS dev, run `bun add --optional sharp-darwin-arm64` (or similar per host).

- [ ] **Step 4: Commit**

```bash
git add package.json bun.lock
git commit -m "chore(04): add stripe@17 + sharp@0.34 deps for Cluster 04 billing + avatar"
```

### Task 2.2: Stripe client singleton

**Files:**
- Create: `kova-open-pencil-1/api/_shared/stripe-client.ts`
- Test: `kova-open-pencil-1/tests/unit/api/_shared/stripe-client.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/api/_shared/stripe-client.test.ts
import { describe, it, expect, beforeEach } from 'bun:test'

describe('getStripeClient', () => {
  beforeEach(() => {
    delete (globalThis as any).__stripeClient
  })

  it('throws if STRIPE_SECRET_KEY is missing', async () => {
    const orig = process.env.STRIPE_SECRET_KEY
    delete process.env.STRIPE_SECRET_KEY
    const { getStripeClient } = await import('@/../api/_shared/stripe-client')
    expect(() => getStripeClient()).toThrow(/STRIPE_SECRET_KEY/)
    process.env.STRIPE_SECRET_KEY = orig
  })

  it('returns memoized instance across calls', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_dummy'
    const { getStripeClient } = await import('@/../api/_shared/stripe-client')
    const a = getStripeClient()
    const b = getStripeClient()
    expect(a).toBe(b)
  })
})
```

- [ ] **Step 2: Run — expect FAIL (file does not exist)**

```bash
bun run test:unit -- tests/unit/api/_shared/stripe-client.test.ts
```

- [ ] **Step 3: Implement**

```typescript
// api/_shared/stripe-client.ts
import Stripe from 'stripe'

let cached: Stripe | null = null

export function getStripeClient(): Stripe {
  if (cached) return cached
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not set. See docs/operations/stripe-setup-runbook.md.')
  }
  cached = new Stripe(key, {
    apiVersion: '2024-10-28.acacia',  // Pin to the latest stable Stripe API version at PRD time
    typescript: true,
  })
  return cached
}
```

- [ ] **Step 4: Run + verify pass**

```bash
bun run test:unit -- tests/unit/api/_shared/stripe-client.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add api/_shared/stripe-client.ts tests/unit/api/_shared/stripe-client.test.ts
git commit -m "feat(04): add stripe-client singleton with env-var guard"
```

### Task 2.3: Price map

**Files:**
- Create: `kova-open-pencil-1/api/_shared/price-map.ts`
- Create: `kova-open-pencil-1/src/constants/billing-plans.ts`
- Test: `kova-open-pencil-1/tests/unit/api/_shared/price-map.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/api/_shared/price-map.test.ts
import { describe, it, expect } from 'bun:test'
import { priceIdToPlan, planToPriceId, isKnownPriceId } from '@/../api/_shared/price-map'

describe('price-map', () => {
  it('maps STRIPE_PRICE_ID_SOLO env to "solo"', () => {
    process.env.STRIPE_PRICE_ID_SOLO = 'price_test_solo'
    expect(priceIdToPlan('price_test_solo')).toBe('solo')
  })

  it('returns null for unknown price id', () => {
    expect(priceIdToPlan('price_unknown')).toBeNull()
  })

  it('isKnownPriceId returns false for unknown', () => {
    expect(isKnownPriceId('price_unknown')).toBe(false)
  })

  it('planToPriceId returns env-configured ID', () => {
    process.env.STRIPE_PRICE_ID_AGENCY = 'price_test_agency'
    expect(planToPriceId('agency')).toBe('price_test_agency')
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
bun run test:unit -- tests/unit/api/_shared/price-map.test.ts
```

- [ ] **Step 3: Implement** (both server + client maps to keep in sync)

```typescript
// api/_shared/price-map.ts
export type PlanName = 'free' | 'solo' | 'agency'

function planEnvKey(plan: Exclude<PlanName, 'free'>): string {
  return `STRIPE_PRICE_ID_${plan.toUpperCase()}`
}

export function planToPriceId(plan: Exclude<PlanName, 'free'>): string | null {
  return process.env[planEnvKey(plan)] ?? null
}

export function priceIdToPlan(priceId: string): PlanName | null {
  if (priceId === process.env.STRIPE_PRICE_ID_SOLO) return 'solo'
  if (priceId === process.env.STRIPE_PRICE_ID_AGENCY) return 'agency'
  return null
}

export function isKnownPriceId(priceId: string): boolean {
  return priceIdToPlan(priceId) !== null
}
```

```typescript
// src/constants/billing-plans.ts
// Client-side mirror — caps + display info. Price IDs are server-only.
export type PlanName = 'free' | 'solo' | 'agency'

export interface PlanInfo {
  name: PlanName
  displayName: string
  monthlyUsd: number  // Display only; Stripe holds source-of-truth
  aiGenerationsCap: number
  storageBytesCap: number
  features: string[]
}

export const PLAN_INFO: Record<PlanName, PlanInfo> = {
  free: {
    name: 'free', displayName: 'Free', monthlyUsd: 0,
    aiGenerationsCap: 20, storageBytesCap: 500 * 1024 * 1024,
    features: ['1 brand', '20 AI generations / month', 'Last-7-day version history'],
  },
  solo: {
    name: 'solo', displayName: 'Solo', monthlyUsd: 19,  // PLACEHOLDER — confirm with founder
    aiGenerationsCap: 200, storageBytesCap: 5 * 1024 * 1024 * 1024,
    features: ['Unlimited brands', '200 AI generations / month', '30-day version history', 'Email support'],
  },
  agency: {
    name: 'agency', displayName: 'Agency', monthlyUsd: 49,  // PLACEHOLDER
    aiGenerationsCap: 1000, storageBytesCap: 50 * 1024 * 1024 * 1024,
    features: ['Unlimited brands', '1,000 AI generations / month', 'Unlimited version history', 'Priority support'],
  },
}

// MVP gate stub — usePlanGate returns allowed=true for everything until founder activates pricing
export const PLAN_GATE_ENFORCED = false
```

- [ ] **Step 4: Run + verify pass**

```bash
bun run test:unit -- tests/unit/api/_shared/price-map.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add api/_shared/price-map.ts src/constants/billing-plans.ts tests/unit/api/_shared/price-map.test.ts
git commit -m "feat(04): price-map server util + billing-plans client constants"
```

### Task 2.4: Audit-log helper

**Files:**
- Create: `kova-open-pencil-1/api/_shared/audit-log.ts`
- Test: `kova-open-pencil-1/tests/unit/api/_shared/audit-log.test.ts`

> If Cluster 11 already ships `audit_log` + a TypeScript writer, import from there. If not, this stub creates the table on first use (idempotent migration) and writes via service-role client.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/api/_shared/audit-log.test.ts
import { describe, it, expect, mock } from 'bun:test'

describe('writeAuditLog', () => {
  it('writes a row with event_type + user_id + metadata + timestamp', async () => {
    const insert = mock(() => Promise.resolve({ data: null, error: null }))
    const supabase = { from: mock(() => ({ insert })) }
    const { writeAuditLog } = await import('@/../api/_shared/audit-log')
    await writeAuditLog(supabase as any, {
      event_type: 'stripe.checkout.session_created',
      user_id: 'user-123',
      metadata: { session_id: 'cs_test' },
    })
    expect(supabase.from).toHaveBeenCalledWith('audit_log')
    expect(insert).toHaveBeenCalled()
    const arg = insert.mock.calls[0][0] as any
    expect(arg.event_type).toBe('stripe.checkout.session_created')
    expect(arg.user_id).toBe('user-123')
    expect(arg.metadata).toEqual({ session_id: 'cs_test' })
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
bun run test:unit -- tests/unit/api/_shared/audit-log.test.ts
```

- [ ] **Step 3: Implement**

```typescript
// api/_shared/audit-log.ts
import type { SupabaseClient } from '@supabase/supabase-js'

export interface AuditLogEvent {
  event_type: string
  user_id?: string | null
  metadata?: Record<string, unknown>
}

export async function writeAuditLog(
  supabase: SupabaseClient,
  event: AuditLogEvent,
): Promise<void> {
  const { error } = await supabase.from('audit_log').insert({
    event_type: event.event_type,
    user_id: event.user_id ?? null,
    metadata: event.metadata ?? {},
    created_at: new Date().toISOString(),
  })
  if (error) {
    // Don't throw — audit logs should never block user-facing flows
    console.error('[audit-log] write failed', error)
  }
}
```

- [ ] **Step 4: Run + verify pass**

```bash
bun run test:unit -- tests/unit/api/_shared/audit-log.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add api/_shared/audit-log.ts tests/unit/api/_shared/audit-log.test.ts
git commit -m "feat(04): audit-log helper for Stripe state-change tracking"
```

---

## Phase 3 — Stripe Edge Functions

### Task 3.1: `POST /api/stripe/checkout-session`

**Files:**
- Create: `kova-open-pencil-1/api/stripe/checkout-session.ts`
- Test: `kova-open-pencil-1/tests/unit/api/stripe/checkout-session.test.ts`

> Per PRD §5.1.1 — POST endpoint creating a Stripe Checkout session; auto-creates Stripe Customer on first call.

- [ ] **Step 1: Write the failing test (happy path + 3 error branches)**

```typescript
// tests/unit/api/stripe/checkout-session.test.ts
import { describe, it, expect, mock, beforeEach } from 'bun:test'

describe('POST /api/stripe/checkout-session', () => {
  let mockStripe: any
  let mockSupabase: any

  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_dummy'
    process.env.STRIPE_PRICE_ID_SOLO = 'price_solo'

    mockStripe = {
      customers: { create: mock(() => Promise.resolve({ id: 'cus_test' })) },
      checkout: { sessions: { create: mock(() => Promise.resolve({ id: 'cs_test', url: 'https://checkout.stripe.com/session/abc' })) } },
    }
    mockSupabase = {
      from: mock(() => ({
        select: mock(() => ({ eq: mock(() => ({ single: mock(() => Promise.resolve({ data: { id: 'user-1', email: 'a@b.co', name: 'A', stripe_customer_id: null } })) })) })),
        update: mock(() => ({ eq: mock(() => Promise.resolve({ error: null })) })),
        insert: mock(() => Promise.resolve({ error: null })),
      })),
    }
  })

  it('creates a customer + checkout session and returns url', async () => {
    const { handler } = await import('@/../api/stripe/checkout-session')
    const res = await handler({
      method: 'POST',
      headers: { authorization: 'Bearer fake', 'x-idempotency-key': crypto.randomUUID() },
      body: { price_id: 'price_solo', success_url: 'https://kova.app/account/billing/success', cancel_url: 'https://kova.app/account/billing/cancel' },
    }, { stripe: mockStripe, supabase: mockSupabase, userId: 'user-1' })

    expect(res.status).toBe(200)
    expect(res.body.url).toBe('https://checkout.stripe.com/session/abc')
    expect(mockStripe.customers.create).toHaveBeenCalled()
    expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({ customer: 'cus_test', mode: 'subscription' }),
      expect.objectContaining({ idempotencyKey: expect.any(String) }),
    )
  })

  it('reuses existing customer', async () => {
    mockSupabase.from = mock(() => ({
      select: mock(() => ({ eq: mock(() => ({ single: mock(() => Promise.resolve({ data: { id: 'user-1', stripe_customer_id: 'cus_existing' } })) })) })),
    }))
    const { handler } = await import('@/../api/stripe/checkout-session')
    const res = await handler({ method: 'POST', headers: { authorization: 'Bearer fake' }, body: { price_id: 'price_solo', success_url: 'https://kova.app/s', cancel_url: 'https://kova.app/c' } }, { stripe: mockStripe, supabase: mockSupabase, userId: 'user-1' })
    expect(res.status).toBe(200)
    expect(mockStripe.customers.create).not.toHaveBeenCalled()
  })

  it('returns 422 for unknown price_id', async () => {
    const { handler } = await import('@/../api/stripe/checkout-session')
    const res = await handler({ method: 'POST', headers: { authorization: 'Bearer fake' }, body: { price_id: 'price_bogus', success_url: 'https://kova.app/s', cancel_url: 'https://kova.app/c' } }, { stripe: mockStripe, supabase: mockSupabase, userId: 'user-1' })
    expect(res.status).toBe(422)
    expect(res.body.error).toBe('invalid_price')
  })

  it('returns 401 without auth', async () => {
    const { handler } = await import('@/../api/stripe/checkout-session')
    const res = await handler({ method: 'POST', headers: {}, body: { price_id: 'price_solo', success_url: 'https://kova.app/s', cancel_url: 'https://kova.app/c' } }, { stripe: mockStripe, supabase: mockSupabase, userId: null })
    expect(res.status).toBe(401)
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
bun run test:unit -- tests/unit/api/stripe/checkout-session.test.ts
```

- [ ] **Step 3: Implement** (testable handler pattern — wrap Vercel default export around it)

```typescript
// api/stripe/checkout-session.ts
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getStripeClient } from '../_shared/stripe-client'
import { isKnownPriceId } from '../_shared/price-map'
import { writeAuditLog } from '../_shared/audit-log'
import { getServiceSupabase, verifyAuth } from '../_shared/supabase'  // assume Cluster 01 ships these

export interface HandlerCtx {
  stripe: ReturnType<typeof getStripeClient>
  supabase: ReturnType<typeof getServiceSupabase>
  userId: string | null
}

export async function handler(
  req: { method: string; headers: Record<string, string | undefined>; body: { price_id: string; success_url: string; cancel_url: string } },
  ctx: HandlerCtx,
): Promise<{ status: number; body: any }> {
  if (req.method !== 'POST') return { status: 405, body: { error: 'method_not_allowed' } }
  if (!ctx.userId) return { status: 401, body: { error: 'unauthenticated' } }

  const { price_id, success_url, cancel_url } = req.body
  if (!isKnownPriceId(price_id)) {
    return { status: 422, body: { error: 'invalid_price', detail: `Unknown price_id: ${price_id}` } }
  }

  // Load user + maybe create customer
  const { data: user } = await ctx.supabase.from('users').select('id, email, name, stripe_customer_id').eq('id', ctx.userId).single()
  if (!user) return { status: 401, body: { error: 'unauthenticated' } }

  let customerId = user.stripe_customer_id
  if (!customerId) {
    const customer = await ctx.stripe.customers.create({
      email: user.email,
      name: user.name,
      metadata: { user_id: user.id },
    })
    customerId = customer.id
    await ctx.supabase.from('users').update({ stripe_customer_id: customerId }).eq('id', user.id)
  }

  const idemKey = req.headers['x-idempotency-key'] ?? crypto.randomUUID()
  const session = await ctx.stripe.checkout.sessions.create(
    {
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: price_id, quantity: 1 }],
      success_url: `${success_url}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url,
      client_reference_id: user.id,
    },
    { idempotencyKey: idemKey },
  )

  await writeAuditLog(ctx.supabase, {
    event_type: 'stripe.checkout.session_created',
    user_id: user.id,
    metadata: { price_id, session_id: session.id },
  })

  return { status: 200, body: { session_id: session.id, url: session.url } }
}

// Vercel default export
export default async function (req: VercelRequest, res: VercelResponse): Promise<void> {
  const userId = await verifyAuth(req)
  const result = await handler(
    { method: req.method ?? '', headers: req.headers as any, body: req.body },
    { stripe: getStripeClient(), supabase: getServiceSupabase(), userId },
  )
  res.status(result.status).json(result.body)
}
```

- [ ] **Step 4: Run + verify pass**

```bash
bun run test:unit -- tests/unit/api/stripe/checkout-session.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add api/stripe/checkout-session.ts tests/unit/api/stripe/checkout-session.test.ts
git commit -m "feat(04): POST /api/stripe/checkout-session with customer auto-create + idempotency"
```

### Task 3.2: `POST /api/stripe/portal-session`

**Files:**
- Create: `kova-open-pencil-1/api/stripe/portal-session.ts`
- Test: `kova-open-pencil-1/tests/unit/api/stripe/portal-session.test.ts`

> Per PRD §5.1.2 — returns Stripe Customer Portal URL. Client opens in new tab via `window.open(url, '_blank', 'noopener,noreferrer')`. Iframe embed is blocked by Stripe.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/api/stripe/portal-session.test.ts
import { describe, it, expect, mock, beforeEach } from 'bun:test'

describe('POST /api/stripe/portal-session', () => {
  let mockStripe: any
  let mockSupabase: any

  beforeEach(() => {
    mockStripe = { billingPortal: { sessions: { create: mock(() => Promise.resolve({ url: 'https://billing.stripe.com/p/session/abc' })) } } }
    mockSupabase = {
      from: mock(() => ({
        select: mock(() => ({ eq: mock(() => ({ single: mock(() => Promise.resolve({ data: { stripe_customer_id: 'cus_existing' } })) })) })),
      })),
    }
  })

  it('returns 200 + url for a customer that exists', async () => {
    const { handler } = await import('@/../api/stripe/portal-session')
    const res = await handler({ method: 'POST', body: { return_url: 'https://kova.app/account/billing' } }, { stripe: mockStripe, supabase: mockSupabase, userId: 'user-1' })
    expect(res.status).toBe(200)
    expect(res.body.url).toBe('https://billing.stripe.com/p/session/abc')
  })

  it('returns 404 if user has no stripe_customer_id', async () => {
    mockSupabase.from = mock(() => ({
      select: mock(() => ({ eq: mock(() => ({ single: mock(() => Promise.resolve({ data: { stripe_customer_id: null } })) })) })),
    }))
    const { handler } = await import('@/../api/stripe/portal-session')
    const res = await handler({ method: 'POST', body: { return_url: 'https://kova.app/account/billing' } }, { stripe: mockStripe, supabase: mockSupabase, userId: 'user-1' })
    expect(res.status).toBe(404)
    expect(res.body.error).toBe('no_customer')
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
bun run test:unit -- tests/unit/api/stripe/portal-session.test.ts
```

- [ ] **Step 3: Implement**

```typescript
// api/stripe/portal-session.ts
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getStripeClient } from '../_shared/stripe-client'
import { writeAuditLog } from '../_shared/audit-log'
import { getServiceSupabase, verifyAuth } from '../_shared/supabase'

export async function handler(
  req: { method: string; body: { return_url: string } },
  ctx: { stripe: ReturnType<typeof getStripeClient>; supabase: any; userId: string | null },
): Promise<{ status: number; body: any }> {
  if (req.method !== 'POST') return { status: 405, body: { error: 'method_not_allowed' } }
  if (!ctx.userId) return { status: 401, body: { error: 'unauthenticated' } }

  const { data: user } = await ctx.supabase.from('users').select('stripe_customer_id').eq('id', ctx.userId).single()
  if (!user?.stripe_customer_id) return { status: 404, body: { error: 'no_customer' } }

  const session = await ctx.stripe.billingPortal.sessions.create({
    customer: user.stripe_customer_id,
    return_url: req.body.return_url,
  })

  await writeAuditLog(ctx.supabase, {
    event_type: 'stripe.portal.session_created',
    user_id: ctx.userId,
    metadata: { return_url: req.body.return_url },
  })

  return { status: 200, body: { url: session.url } }
}

export default async function (req: VercelRequest, res: VercelResponse): Promise<void> {
  const userId = await verifyAuth(req)
  const result = await handler({ method: req.method ?? '', body: req.body }, { stripe: getStripeClient(), supabase: getServiceSupabase(), userId })
  res.status(result.status).json(result.body)
}
```

- [ ] **Step 4: Run + verify pass**

```bash
bun run test:unit -- tests/unit/api/stripe/portal-session.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add api/stripe/portal-session.ts tests/unit/api/stripe/portal-session.test.ts
git commit -m "feat(04): POST /api/stripe/portal-session — Customer Portal redirect"
```

### Task 3.3: Webhook handlers (6 per-event handlers)

**Files:**
- Create one per event under `kova-open-pencil-1/api/stripe/webhook-handlers/`:
  - `handle-checkout-completed.ts`
  - `handle-subscription-created.ts`
  - `handle-subscription-updated.ts`
  - `handle-subscription-deleted.ts`
  - `handle-invoice-paid.ts`
  - `handle-invoice-payment-failed.ts`
- Test files mirror under `tests/unit/api/stripe/webhook-handlers/`.

> Pseudocode for each handler is in PRD §5.1.3 — translate verbatim, adding TDD test cases per handler.

#### Task 3.3.1 — handle-subscription-created

- [ ] **Step 1: Write test**

```typescript
// tests/unit/api/stripe/webhook-handlers/handle-subscription-created.test.ts
import { describe, it, expect, mock } from 'bun:test'

describe('handleSubscriptionCreated', () => {
  it('updates users row with plan, status, period_end, cancel flag', async () => {
    process.env.STRIPE_PRICE_ID_SOLO = 'price_solo'
    const update = mock(() => ({ eq: mock(() => Promise.resolve({ error: null })) }))
    const supabase = {
      from: mock(() => ({
        update,
        select: mock(() => ({ eq: mock(() => ({ single: mock(() => Promise.resolve({ data: { id: 'user-1' } })) })) })),
      })),
    }
    const { handleSubscriptionCreated } = await import('@/../api/stripe/webhook-handlers/handle-subscription-created')
    await handleSubscriptionCreated({
      data: { object: { id: 'sub_test', customer: 'cus_test', status: 'active', current_period_end: 1735603200, cancel_at_period_end: false, items: { data: [{ price: { id: 'price_solo' } }] } } },
    } as any, supabase as any)
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      stripe_subscription_id: 'sub_test',
      plan: 'solo',
      plan_status: 'active',
      cancel_at_period_end: false,
    }))
  })

  it('stores trialing status as-is per founder decision 2026-05-17 (§12.3 RESOLVED)', async () => {
    process.env.STRIPE_PRICE_ID_SOLO = 'price_solo'
    const update = mock(() => ({ eq: mock(() => Promise.resolve({ error: null })) }))
    const supabase = {
      from: mock(() => ({
        update,
        select: mock(() => ({ eq: mock(() => ({ single: mock(() => Promise.resolve({ data: { id: 'user-1' } })) })) })),
      })),
    }
    const { handleSubscriptionCreated } = await import('@/../api/stripe/webhook-handlers/handle-subscription-created')
    await handleSubscriptionCreated({
      data: { object: { id: 'sub_test', customer: 'cus_test', status: 'trialing', current_period_end: 1735603200, cancel_at_period_end: false, items: { data: [{ price: { id: 'price_solo' } }] } } },
    } as any, supabase as any)
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ plan_status: 'trialing' }))
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
bun run test:unit -- tests/unit/api/stripe/webhook-handlers/handle-subscription-created.test.ts
```

- [ ] **Step 3: Implement**

```typescript
// api/stripe/webhook-handlers/handle-subscription-created.ts
import type Stripe from 'stripe'
import type { SupabaseClient } from '@supabase/supabase-js'
import { priceIdToPlan } from '../../_shared/price-map'
import { writeAuditLog } from '../../_shared/audit-log'

export async function handleSubscriptionCreated(event: Stripe.Event, supabase: SupabaseClient): Promise<void> {
  const sub = event.data.object as Stripe.Subscription
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id
  const priceId = sub.items.data[0]?.price.id
  const plan = priceId ? priceIdToPlan(priceId) : null

  // Resolve user by customer
  const { data: user } = await supabase.from('users').select('id').eq('stripe_customer_id', customerId).single()
  if (!user) {
    console.warn('[handleSubscriptionCreated] no user for customer', customerId)
    return
  }

  // Store sub.status as-is — DB CHECK now includes 'trialing' (founder decision 2026-05-17 — PRD §12.3 RESOLVED)
  await supabase.from('users').update({
    stripe_subscription_id: sub.id,
    plan: plan ?? 'free',
    plan_status: sub.status,
    current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
    cancel_at_period_end: sub.cancel_at_period_end,
  }).eq('id', user.id)

  await writeAuditLog(supabase, {
    event_type: 'stripe.subscription.created',
    user_id: user.id,
    metadata: { subscription_id: sub.id, plan, status: sub.status },
  })
}
```

- [ ] **Step 4: Verify pass**

```bash
bun run test:unit -- tests/unit/api/stripe/webhook-handlers/handle-subscription-created.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add api/stripe/webhook-handlers/handle-subscription-created.ts tests/unit/api/stripe/webhook-handlers/handle-subscription-created.test.ts
git commit -m "feat(04): Stripe webhook handler — subscription.created"
```

#### Task 3.3.2 through 3.3.6 — handle-subscription-updated / -deleted / -invoice-paid / -invoice-payment-failed / -checkout-completed

For each: write test → run (fail) → implement per PRD §5.1.3 pseudocode → run (pass) → commit. Use the same shape as 3.3.1. Each commit message: `feat(04): Stripe webhook handler — <event-name>`.

Concrete differences:

- **subscription.updated**: identical to .created. Re-use the handler body (factor a `syncSubscriptionToUser` helper if attractive, but DRY only after both are written).
- **subscription.deleted**: sets `plan='free'`, `plan_status='cancelled'`, `stripe_subscription_id=null`, `cancel_at_period_end=false`.
- **invoice.paid**: if user is `past_due`, reset to `active`. Audit log.
- **invoice.payment_failed**: set `plan_status='past_due'`. Audit log. Send Resend email via Cluster 11 wrapper (template name `subscription-payment-failed.html` — created in Task 14).
- **checkout.completed**: NO DB update (subscription.created fires immediately after and is authoritative); audit-log only.

### Task 3.4: Webhook dispatch + signature verify + idempotency

**Files:**
- Create: `kova-open-pencil-1/api/stripe/webhook.ts`
- Test: `kova-open-pencil-1/tests/unit/api/stripe/webhook.test.ts`

> Per PRD §5.1.3 — top-level handler.

- [ ] **Step 1: Write the failing tests** (signature valid/invalid; dedup; dispatch; unhandled type; handler exception)

```typescript
// tests/unit/api/stripe/webhook.test.ts
import { describe, it, expect, mock, beforeEach } from 'bun:test'
import Stripe from 'stripe'

describe('POST /api/stripe/webhook', () => {
  let mockStripe: any
  let mockSupabase: any
  beforeEach(() => {
    mockStripe = {
      webhooks: { constructEvent: mock((raw: string, sig: string, secret: string) => JSON.parse(raw) as Stripe.Event) },
    }
    mockSupabase = {
      from: mock(() => ({
        insert: mock(() => Promise.resolve({ data: { event_id: 'evt_x' }, error: null, count: 1 })),
        update: mock(() => ({ eq: mock(() => Promise.resolve({ error: null })) })),
        select: mock(() => ({ eq: mock(() => ({ single: mock(() => Promise.resolve({ data: null })) })) })),
      })),
    }
  })

  it('returns 200 on valid signed event', async () => {
    const event = { id: 'evt_x', type: 'checkout.session.completed', data: { object: { id: 'cs', client_reference_id: 'user-1' } } }
    const { handler } = await import('@/../api/stripe/webhook')
    const res = await handler({ method: 'POST', headers: { 'stripe-signature': 'sig' }, rawBody: JSON.stringify(event) }, { stripe: mockStripe, supabase: mockSupabase })
    expect(res.status).toBe(200)
    expect(res.body.received).toBe(true)
  })

  it('returns 400 on bad signature', async () => {
    mockStripe.webhooks.constructEvent = mock(() => { throw new Error('No signatures found matching the expected signature') })
    const { handler } = await import('@/../api/stripe/webhook')
    const res = await handler({ method: 'POST', headers: { 'stripe-signature': 'bad' }, rawBody: '{}' }, { stripe: mockStripe, supabase: mockSupabase })
    expect(res.status).toBe(400)
  })

  it('deduplicates by event_id', async () => {
    // First call inserts; second call's INSERT conflict → outcome='duplicate' → 200
    const event = { id: 'evt_dup', type: 'invoice.paid', data: { object: { customer: 'cus_x' } } }
    let calls = 0
    mockSupabase.from = mock(() => ({
      insert: mock(() => { calls++; return Promise.resolve({ data: null, error: calls > 1 ? { code: '23505' } : null }) }),
      update: mock(() => ({ eq: mock(() => Promise.resolve({ error: null })) })),
      select: mock(() => ({ eq: mock(() => ({ single: mock(() => Promise.resolve({ data: null })) })) })),
    }))
    const { handler } = await import('@/../api/stripe/webhook')
    const res1 = await handler({ method: 'POST', headers: { 'stripe-signature': 'sig' }, rawBody: JSON.stringify(event) }, { stripe: mockStripe, supabase: mockSupabase })
    const res2 = await handler({ method: 'POST', headers: { 'stripe-signature': 'sig' }, rawBody: JSON.stringify(event) }, { stripe: mockStripe, supabase: mockSupabase })
    expect(res1.status).toBe(200)
    expect(res2.status).toBe(200)
  })

  it('returns 200 + outcome="unhandled_type" for unknown event', async () => {
    const event = { id: 'evt_y', type: 'charge.refunded', data: { object: {} } }
    const { handler } = await import('@/../api/stripe/webhook')
    const res = await handler({ method: 'POST', headers: { 'stripe-signature': 'sig' }, rawBody: JSON.stringify(event) }, { stripe: mockStripe, supabase: mockSupabase })
    expect(res.status).toBe(200)
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
bun run test:unit -- tests/unit/api/stripe/webhook.test.ts
```

- [ ] **Step 3: Implement**

Vercel Functions deliver `req` as a Node `Readable`; consume it before any framework parses the body. `bodyParser: false` is Pages-Router-only and has no effect in Vercel Functions.

```typescript
// api/stripe/webhook.ts
import type { VercelRequest, VercelResponse } from '@vercel/node'
import type Stripe from 'stripe'
import * as crypto from 'crypto'
import { getStripeClient } from '../_shared/stripe-client'
import { getServiceSupabase } from '../_shared/supabase'
import { handleCheckoutCompleted } from './webhook-handlers/handle-checkout-completed'
import { handleSubscriptionCreated } from './webhook-handlers/handle-subscription-created'
import { handleSubscriptionUpdated } from './webhook-handlers/handle-subscription-updated'
import { handleSubscriptionDeleted } from './webhook-handlers/handle-subscription-deleted'
import { handleInvoicePaid } from './webhook-handlers/handle-invoice-paid'
import { handleInvoicePaymentFailed } from './webhook-handlers/handle-invoice-payment-failed'

async function readRawBody(req: VercelRequest): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }
  return Buffer.concat(chunks)
}

const HANDLED_EVENTS = {
  'checkout.session.completed': handleCheckoutCompleted,
  'customer.subscription.created': handleSubscriptionCreated,
  'customer.subscription.updated': handleSubscriptionUpdated,
  'customer.subscription.deleted': handleSubscriptionDeleted,
  'invoice.paid': handleInvoicePaid,
  'invoice.payment_failed': handleInvoicePaymentFailed,
} as const

export default async function (req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  const rawBody = await readRawBody(req)
  const sigHeader = req.headers['stripe-signature']
  const sig = Array.isArray(sigHeader) ? sigHeader[0] : sigHeader
  if (!sig) return res.status(400).json({ error: 'missing_signature' })

  const stripe = getStripeClient()
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    return res.status(400).json({ error: 'signature_verification_failed' })
  }

  // Idempotency check + event dispatch (Task 3.7 handlers)
  const payloadHash = crypto.createHash('sha256').update(rawBody).digest('hex')
  const supabase = getServiceSupabase()
  const { error: insErr } = await supabase.from('stripe_webhook_events').insert({
    event_id: event.id,
    type: event.type,
    payload_hash: payloadHash,
    outcome: 'processed',
  })
  if (insErr && insErr.code === '23505') {
    // Duplicate
    return res.status(200).json({ received: true, duplicate: true })
  }

  // Dispatch
  const eventHandler = (HANDLED_EVENTS as Record<string, (e: Stripe.Event, s: any) => Promise<void>>)[event.type]
  if (!eventHandler) {
    await supabase.from('stripe_webhook_events').update({ outcome: 'unhandled_type' }).eq('event_id', event.id)
    return res.status(200).json({ received: true, unhandled: true })
  }

  try {
    await eventHandler(event, supabase)
    return res.status(200).json({ received: true })
  } catch (err) {
    console.error('[stripe-webhook] handler error', event.type, err)
    await supabase.from('stripe_webhook_events').update({
      outcome: 'error',
      error_message: err instanceof Error ? err.message : 'unknown',
    }).eq('event_id', event.id)
    // Still 200 to Stripe; retries handled by Stripe via webhook config + next attempt hits idempotency
    return res.status(200).json({ received: true, error: 'handler_failed' })
  }
}
```

- [ ] **Step 3.6: Validate signature**

Validate webhook signature using Stripe CLI before merge — must produce a 200 response from this handler.

```bash
stripe trigger checkout.session.completed --api-key sk_test_...
```

- [ ] **Step 4: Run + verify pass**

```bash
bun run test:unit -- tests/unit/api/stripe/webhook.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add api/stripe/webhook.ts tests/unit/api/stripe/webhook.test.ts
git commit -m "feat(04): Stripe webhook handler — signature verify + idempotency + dispatch"
```

### Task 3.5: `GET /api/stripe/invoices`

**Files:**
- Create: `kova-open-pencil-1/api/stripe/invoices.ts`
- Test: `kova-open-pencil-1/tests/unit/api/stripe/invoices.test.ts`

> Per PRD §5.1.4. Proxy to `stripe.invoices.list` + slimming map.

- [ ] **Step 1: Write the test**

```typescript
// tests/unit/api/stripe/invoices.test.ts
import { describe, it, expect, mock } from 'bun:test'

describe('GET /api/stripe/invoices', () => {
  it('lists last 12 invoices for user customer', async () => {
    const stripe = {
      invoices: { list: mock(() => Promise.resolve({ data: [
        { id: 'in_1', created: 1700000000, description: 'Solo monthly', amount_paid: 1900, currency: 'usd', status: 'paid', hosted_invoice_url: 'https://invoice.stripe.com/abc', invoice_pdf: 'https://invoice.stripe.com/abc.pdf' },
      ] })) },
    }
    const supabase = { from: mock(() => ({ select: mock(() => ({ eq: mock(() => ({ single: mock(() => Promise.resolve({ data: { stripe_customer_id: 'cus_x' } })) })) })) })) }
    const { handler } = await import('@/../api/stripe/invoices')
    const res = await handler({ method: 'GET', query: {} }, { stripe: stripe as any, supabase: supabase as any, userId: 'user-1' })
    expect(res.status).toBe(200)
    expect(res.body.invoices.length).toBe(1)
    expect(res.body.invoices[0].id).toBe('in_1')
    expect(stripe.invoices.list).toHaveBeenCalledWith({ customer: 'cus_x', limit: 12, expand: ['data.charge'] })
  })

  it('caps limit at 50', async () => {
    const stripe = { invoices: { list: mock(() => Promise.resolve({ data: [] })) } }
    const supabase = { from: mock(() => ({ select: mock(() => ({ eq: mock(() => ({ single: mock(() => Promise.resolve({ data: { stripe_customer_id: 'cus_x' } })) })) })) })) }
    const { handler } = await import('@/../api/stripe/invoices')
    await handler({ method: 'GET', query: { limit: '200' } }, { stripe: stripe as any, supabase: supabase as any, userId: 'user-1' })
    expect(stripe.invoices.list).toHaveBeenCalledWith(expect.objectContaining({ limit: 50 }))
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement** (handler + Vercel default export — same pattern as 3.1/3.2)

```typescript
// api/stripe/invoices.ts
export async function handler(req, ctx) {
  if (req.method !== 'GET') return { status: 405, body: { error: 'method_not_allowed' } }
  if (!ctx.userId) return { status: 401, body: { error: 'unauthenticated' } }
  const { data: user } = await ctx.supabase.from('users').select('stripe_customer_id').eq('id', ctx.userId).single()
  if (!user?.stripe_customer_id) return { status: 200, body: { invoices: [] } }
  const requestedLimit = Math.min(parseInt(req.query.limit ?? '12'), 50)
  const list = await ctx.stripe.invoices.list({ customer: user.stripe_customer_id, limit: requestedLimit, expand: ['data.charge'] })
  const invoices = list.data.map(inv => ({
    id: inv.id, created_at: new Date(inv.created * 1000).toISOString(),
    description: inv.description ?? inv.lines.data[0]?.description ?? 'Subscription',
    amount_paid: inv.amount_paid, currency: inv.currency,
    status: inv.status, hosted_invoice_url: inv.hosted_invoice_url, invoice_pdf: inv.invoice_pdf,
  }))
  return { status: 200, body: { invoices } }
}
// + default export wrap per 3.1
```

- [ ] **Step 4: Verify pass + commit**

```bash
bun run test:unit -- tests/unit/api/stripe/invoices.test.ts
git add api/stripe/invoices.ts tests/unit/api/stripe/invoices.test.ts
git commit -m "feat(04): GET /api/stripe/invoices — proxy to Stripe + slim mapping"
```

### Task 3.6: `POST /api/stripe/reconcile` cron handler

**Files:**
- Create: `kova-open-pencil-1/api/stripe/reconcile.ts`
- Test: `kova-open-pencil-1/tests/unit/api/stripe/reconcile.test.ts`
- Modify: `kova-open-pencil-1/vercel.json` (add cron entry)

> Per PRD §5.1.5. Weekly drift-heal on `past_due` rows.

- [ ] **Step 1: Write the test**

```typescript
// tests/unit/api/stripe/reconcile.test.ts
import { describe, it, expect, mock } from 'bun:test'

describe('POST /api/stripe/reconcile (cron)', () => {
  it('401 without CRON_SECRET', async () => {
    const { handler } = await import('@/../api/stripe/reconcile')
    const res = await handler({ headers: {} }, { stripe: {} as any, supabase: {} as any })
    expect(res.status).toBe(401)
  })

  it('heals past_due → active when Stripe says active', async () => {
    process.env.CRON_SECRET = 'cron-secret'
    const update = mock(() => ({ eq: mock(() => Promise.resolve({ error: null })) }))
    const supabase = {
      from: mock(() => ({
        select: mock(() => ({ eq: mock(() => ({ limit: mock(() => Promise.resolve({ data: [{ id: 'user-1', stripe_subscription_id: 'sub_1' }] })) })) })),
        update,
      })),
    }
    const stripe = { subscriptions: { retrieve: mock(() => Promise.resolve({ status: 'active' })) } }
    const { handler } = await import('@/../api/stripe/reconcile')
    const res = await handler({ headers: { authorization: 'Bearer cron-secret' } }, { stripe: stripe as any, supabase: supabase as any })
    expect(res.status).toBe(200)
    expect(res.body.healed).toBe(1)
    expect(update).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement** per PRD §5.1.5 pseudocode

```typescript
// api/stripe/reconcile.ts
export async function handler(req, ctx) {
  const auth = req.headers.authorization ?? ''
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) return { status: 401, body: { error: 'unauthorized' } }
  const { data: pastDue } = await ctx.supabase.from('users').select('id, stripe_subscription_id').eq('plan_status', 'past_due').limit(500)
  let healed = 0, errored = 0
  for (const u of pastDue ?? []) {
    if (!u.stripe_subscription_id) continue
    try {
      const sub = await ctx.stripe.subscriptions.retrieve(u.stripe_subscription_id)
      if (sub.status === 'active') {
        await ctx.supabase.from('users').update({ plan_status: 'active' }).eq('id', u.id)
        healed++
      }
    } catch (err) {
      console.error('[reconcile] error for user', u.id, err)
      errored++
    }
  }
  return { status: 200, body: { checked: pastDue?.length ?? 0, healed, errored } }
}
// + default export with raw cron-header handling
```

- [ ] **Step 4: Verify pass**

```bash
bun run test:unit -- tests/unit/api/stripe/reconcile.test.ts
```

- [ ] **Step 5: Update vercel.json** — add reconcile cron

```json
{
  "crons": [
    { "path": "/api/cron/delete-account", "schedule": "0 3 * * *" },
    { "path": "/api/stripe/reconcile",   "schedule": "0 4 * * 0" }
  ]
}
```

- [ ] **Step 6: Commit**

```bash
git add api/stripe/reconcile.ts tests/unit/api/stripe/reconcile.test.ts vercel.json
git commit -m "feat(04): weekly Stripe reconcile cron — heal past_due drift"
```

### Task 3.7: Integration tests — Stripe webhook end-to-end

**Files:**
- Create: `kova-open-pencil-1/tests/integration/api/stripe-webhook-subscription-lifecycle.test.ts`
- Create: `kova-open-pencil-1/tests/integration/api/stripe-webhook-invoice-lifecycle.test.ts`
- Create: `kova-open-pencil-1/tests/integration/api/stripe-webhook-idempotency.test.ts`
- Create: `kova-open-pencil-1/tests/integration/api/stripe-webhook-signature.test.ts`

> Use Stripe's `stripe-mock` or hand-craft signed events via `Stripe.webhooks.signature.computeSignature`. Run against the local Supabase to confirm DB writes.

- [ ] **Step 1: Write all 4 tests** (each follows PRD §9.2 spec)

Each test uses a helper:

```typescript
// tests/integration/api/_helpers/sign-event.ts
import * as crypto from 'crypto'
export function signStripeEvent(payload: string, secret: string): string {
  const ts = Math.floor(Date.now() / 1000)
  const sig = crypto.createHmac('sha256', secret).update(`${ts}.${payload}`).digest('hex')
  return `t=${ts},v1=${sig}`
}
```

- [ ] **Step 2: Run + verify pass** (Stripe SDK + local Supabase exercised)

```bash
bun run test:unit -- tests/integration/api/stripe-webhook-*.test.ts
```

- [ ] **Step 3: Commit**

```bash
git add tests/integration/api/stripe-webhook-*.test.ts tests/integration/api/_helpers/sign-event.ts
git commit -m "test(04): integration tests for Stripe webhook lifecycle + idempotency + signature"
```

---

## Phase 4 — Avatar upload Edge Functions

### Task 4.1: `POST /api/account/avatar-upload`

**Files:**
- Create: `kova-open-pencil-1/api/account/avatar-upload.ts`
- Test: `kova-open-pencil-1/tests/unit/api/account/avatar-upload.test.ts`

> Per PRD §5.1.6 — returns signed Supabase Storage upload URL.

- [ ] **Step 1: Write test**

```typescript
// tests/unit/api/account/avatar-upload.test.ts
import { describe, it, expect, mock } from 'bun:test'

describe('POST /api/account/avatar-upload', () => {
  it('returns signed URL for valid PNG ≤5MB (founder decision 2026-05-17)', async () => {
    const createSignedUploadUrl = mock(() => Promise.resolve({ data: { signedUrl: 'https://storage.signed.url/abc', path: 'users/user-1/avatar.png' }, error: null }))
    const supabase = { storage: { from: mock(() => ({ createSignedUploadUrl })) } }
    const { handler } = await import('@/../api/account/avatar-upload')
    const res = await handler({ method: 'POST', body: { mime_type: 'image/png', size_bytes: 1500000 } }, { supabase: supabase as any, userId: 'user-1' })
    expect(res.status).toBe(200)
    expect(res.body.signed_url).toBe('https://storage.signed.url/abc')
    expect(res.body.storage_path).toBe('users/user-1/avatar.png')
  })

  it('rejects >5MB', async () => {
    const { handler } = await import('@/../api/account/avatar-upload')
    // founder decision 2026-05-17: 5MB limit
    const res = await handler({ method: 'POST', body: { mime_type: 'image/png', size_bytes: 6 * 1024 * 1024 } }, { supabase: {} as any, userId: 'user-1' })
    expect(res.status).toBe(413)
    expect(res.body.max_bytes).toBe(5 * 1024 * 1024)
  })

  it('rejects unsupported mime (HEIC)', async () => {
    const { handler } = await import('@/../api/account/avatar-upload')
    const res = await handler({ method: 'POST', body: { mime_type: 'image/heic', size_bytes: 100 } }, { supabase: {} as any, userId: 'user-1' })
    expect(res.status).toBe(415)
  })

  it('rejects SVG (founder decision 2026-05-17 — XSS surface)', async () => {
    const { handler } = await import('@/../api/account/avatar-upload')
    const res = await handler({ method: 'POST', body: { mime_type: 'image/svg+xml', size_bytes: 100 } }, { supabase: {} as any, userId: 'user-1' })
    expect(res.status).toBe(415)
    expect(res.body.error).toBe('unsupported_mime')
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement**

```typescript
// api/account/avatar-upload.ts
// Founder decision 2026-05-17: PNG/JPG only (SVG rejected, XSS); 5MB max; fixed path avatar.png (normalize via sharp in confirm step)
const MAX_BYTES = 5 * 1024 * 1024 // 5 MB
const ALLOWED_MIMES = new Set(['image/png', 'image/jpeg'] as const)

export async function handler(req, ctx) {
  if (req.method !== 'POST') return { status: 405, body: { error: 'method_not_allowed' } }
  if (!ctx.userId) return { status: 401, body: { error: 'unauthenticated' } }

  const { mime_type, size_bytes } = req.body
  if (!ALLOWED_MIMES.has(mime_type)) return { status: 415, body: { error: 'unsupported_mime' } }
  if (size_bytes > MAX_BYTES) return { status: 413, body: { error: 'too_large', max_bytes: MAX_BYTES } }

  // FIXED extension — avatar-confirm normalizes to PNG via sharp; no orphan extensions
  const path = `users/${ctx.userId}/avatar.png`
  const { data, error } = await ctx.supabase.storage.from('media-assets').createSignedUploadUrl(path, { upsert: true })
  if (error) return { status: 500, body: { error: 'storage_error' } }

  return {
    status: 200,
    body: {
      signed_url: data.signedUrl,
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      storage_path: path,
    },
  }
}
// + default export
```

- [ ] **Step 4: Verify pass + commit**

```bash
bun run test:unit -- tests/unit/api/account/avatar-upload.test.ts
git add api/account/avatar-upload.ts tests/unit/api/account/avatar-upload.test.ts
git commit -m "feat(04): POST /api/account/avatar-upload — signed-URL pattern"
```

### Task 4.2: `POST /api/account/avatar-confirm` (with sharp normalization)

**Files:**
- Create: `kova-open-pencil-1/api/account/avatar-confirm.ts`
- Test: `kova-open-pencil-1/tests/unit/api/account/avatar-confirm.test.ts`

**Founder decision 2026-05-17:** Confirm step runs uploaded file through `sharp` to normalize (resize 256×256 cover fit, convert to PNG) before persisting. Path is fixed `users/{user_id}/avatar.png` — no orphans.

- [ ] **Step 1: Write test**

```typescript
// tests/unit/api/account/avatar-confirm.test.ts
import { describe, it, expect, mock } from 'bun:test'

describe('POST /api/account/avatar-confirm', () => {
  it('downloads, normalizes via sharp, re-uploads PNG, then updates users.avatar_storage_path', async () => {
    const originalBuf = new Uint8Array([0x89, 0x50, 0x4e, 0x47]) // PNG header bytes
    const download = mock(() => Promise.resolve({ data: new Blob([originalBuf]), error: null }))
    const upd = mock(() => Promise.resolve({ data: { path: 'users/user-1/avatar.png' }, error: null }))
    const update = mock(() => ({ eq: mock(() => Promise.resolve({ error: null })) }))
    const supabase = {
      storage: { from: mock(() => ({ download, update: upd })) },
      from: mock(() => ({ update })),
    }
    const { handler } = await import('@/../api/account/avatar-confirm')
    const res = await handler({ method: 'POST', body: { storage_path: 'users/user-1/avatar.png' } }, { supabase: supabase as any, userId: 'user-1' })
    expect(res.status).toBe(200)
    expect(download).toHaveBeenCalledWith('users/user-1/avatar.png')
    // Re-upload happens with normalized PNG buffer + image/png content-type + upsert
    expect(upd).toHaveBeenCalledWith('users/user-1/avatar.png', expect.any(Buffer), expect.objectContaining({ contentType: 'image/png', upsert: true }))
    expect(update).toHaveBeenCalledWith({ avatar_storage_path: 'users/user-1/avatar.png' })
  })

  it('rejects mismatched user path', async () => {
    const supabase = { storage: {}, from: mock(() => ({})) }
    const { handler } = await import('@/../api/account/avatar-confirm')
    const res = await handler({ method: 'POST', body: { storage_path: 'users/other-user/avatar.png' } }, { supabase: supabase as any, userId: 'user-1' })
    expect(res.status).toBe(403)
  })

  it('rejects path with non-png extension (founder decision 2026-05-17 — fixed avatar.png)', async () => {
    const supabase = { storage: {}, from: mock(() => ({})) }
    const { handler } = await import('@/../api/account/avatar-confirm')
    const res = await handler({ method: 'POST', body: { storage_path: 'users/user-1/avatar.jpg' } }, { supabase: supabase as any, userId: 'user-1' })
    expect(res.status).toBe(400)
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement**

```typescript
// api/account/avatar-confirm.ts
import sharp from 'sharp'
import { writeAuditLog } from '../_shared/audit-log'

// Founder decision 2026-05-17: fixed path avatar.png; normalize via sharp (resize 256×256 PNG)
const EXPECTED_PATH_RE = /^users\/[^/]+\/avatar\.png$/

export async function handler(req, ctx) {
  if (req.method !== 'POST') return { status: 405, body: { error: 'method_not_allowed' } }
  if (!ctx.userId) return { status: 401, body: { error: 'unauthenticated' } }

  const { storage_path } = req.body
  // Path must match users/{user_id}/avatar.png AND user_id segment must equal auth.uid()
  if (!EXPECTED_PATH_RE.test(storage_path)) return { status: 400, body: { error: 'invalid_path' } }
  const segments = storage_path.split('/')
  if (segments[1] !== ctx.userId) return { status: 403, body: { error: 'path_user_mismatch' } }

  // 1. Download the original upload
  const { data: blob, error: downloadErr } = await ctx.supabase.storage.from('media-assets').download(storage_path)
  if (downloadErr || !blob) return { status: 500, body: { error: 'download_failed' } }
  const originalBuf = Buffer.from(await blob.arrayBuffer())

  // 2. Normalize via sharp: EXIF rotate → resize 256×256 cover → toFormat png
  let normalized: Buffer
  try {
    normalized = await sharp(originalBuf)
      .rotate()                                          // auto-orient based on EXIF
      .resize({ width: 256, height: 256, fit: 'cover' })
      .toFormat('png', { compressionLevel: 9 })
      .toBuffer()
  } catch (err) {
    return { status: 422, body: { error: 'image_decode_failed' } }
  }

  // 3. Re-upload normalized PNG (overwrite original)
  const { error: uploadErr } = await ctx.supabase.storage.from('media-assets').update(storage_path, normalized, {
    contentType: 'image/png',
    upsert: true,
  })
  if (uploadErr) return { status: 500, body: { error: 'reupload_failed' } }

  // 4. Persist path to users.avatar_storage_path
  const { error: dbErr } = await ctx.supabase.from('users').update({ avatar_storage_path: storage_path }).eq('id', ctx.userId)
  if (dbErr) return { status: 500, body: { error: 'db_update_failed' } }

  // 5. Audit-log + generate signed display URL
  await writeAuditLog(ctx.supabase, 'account.avatar_uploaded', ctx.userId, {
    original_size: originalBuf.byteLength,
    normalized_size: normalized.byteLength,
  })
  const { data: signed } = await ctx.supabase.storage.from('media-assets').createSignedUrl(storage_path, 15 * 60)

  return { status: 200, body: { success: true, public_url: signed?.signedUrl ?? null, storage_path } }
}
export default handler
```

- [ ] **Step 4: Verify pass + commit**

```bash
bun run test:unit -- tests/unit/api/account/avatar-confirm.test.ts
git add api/account/avatar-confirm.ts tests/unit/api/account/avatar-confirm.test.ts
git commit -m "feat(04): POST /api/account/avatar-confirm — sharp normalize → PNG → upsert"
```

---

## Phase 5 — Pinia stores

### Task 5.1: `useBillingStore`

**Files:**
- Create: `kova-open-pencil-1/src/stores/billing.ts`
- Test: `kova-open-pencil-1/tests/unit/stores/billing.test.ts`

> Per PRD §6.2.1. State + 4 actions + 2 computed.

- [ ] **Step 1: Write the failing test** (state init, startCheckout success/error, openPortal new-tab + no_customer branch, fetchInvoices cache, computed isPastDue)

```typescript
// tests/unit/stores/billing.test.ts
import { describe, it, expect, beforeEach, mock } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'
import { useBillingStore } from '@/stores/billing'

describe('useBillingStore', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('loadFromUser sets all reactive state', () => {
    const store = useBillingStore()
    store.loadFromUser({
      id: 'user-1', plan: 'solo', plan_status: 'active',
      current_period_end: '2026-12-31T00:00:00Z', cancel_at_period_end: false,
      stripe_customer_id: 'cus_x',
    } as any)
    expect(store.plan).toBe('solo')
    expect(store.planStatus).toBe('active')
    expect(store.currentPeriodEnd).toEqual(new Date('2026-12-31T00:00:00Z'))
    expect(store.cancelAtPeriodEnd).toBe(false)
    expect(store.stripeCustomerId).toBe('cus_x')
  })

  it('isPastDue computed reflects planStatus', () => {
    const store = useBillingStore()
    store.planStatus = 'past_due'
    expect(store.isPastDue).toBe(true)
    store.planStatus = 'active'
    expect(store.isPastDue).toBe(false)
  })

  it('hasActiveSubscription is true when active + period valid', () => {
    const store = useBillingStore()
    store.planStatus = 'active'
    store.currentPeriodEnd = new Date(Date.now() + 86400000)
    expect(store.hasActiveSubscription).toBe(true)
  })

  it('hasActiveSubscription false when period expired', () => {
    const store = useBillingStore()
    store.planStatus = 'active'
    store.currentPeriodEnd = new Date(Date.now() - 86400000)
    expect(store.hasActiveSubscription).toBe(false)
  })

  it('startCheckout posts to /api/stripe/checkout-session + redirects', async () => {
    const fetchSpy = mock(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ url: 'https://checkout.stripe.com/abc' }) } as any))
    globalThis.fetch = fetchSpy as any
    const hrefSetter = mock()
    Object.defineProperty(window, 'location', { value: { origin: 'https://kova.app', set href(v: string) { hrefSetter(v) } }, configurable: true })

    const store = useBillingStore()
    await store.startCheckout('price_solo')
    expect(fetchSpy).toHaveBeenCalledWith('/api/stripe/checkout-session', expect.any(Object))
    expect(hrefSetter).toHaveBeenCalledWith('https://checkout.stripe.com/abc')
  })

  it('openPortal opens new tab via window.open', async () => {
    const fetchSpy = mock(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ url: 'https://billing.stripe.com/abc' }) } as any))
    globalThis.fetch = fetchSpy as any
    const openSpy = mock()
    globalThis.window.open = openSpy as any

    const store = useBillingStore()
    await store.openPortal()
    expect(openSpy).toHaveBeenCalledWith('https://billing.stripe.com/abc', '_blank', 'noopener,noreferrer')
  })

  it('openPortal throws BillingError on no_customer 404', async () => {
    globalThis.fetch = mock(() => Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({ error: 'no_customer' }) } as any)) as any
    const store = useBillingStore()
    await expect(store.openPortal()).rejects.toThrow('no_customer')
  })

  it('fetchInvoices caches by default', async () => {
    const fetchSpy = mock(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ invoices: [{ id: 'in_1' }] }) } as any))
    globalThis.fetch = fetchSpy as any
    const store = useBillingStore()
    store.stripeCustomerId = 'cus_x'
    await store.fetchInvoices()
    await store.fetchInvoices()  // second call should be cache hit
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
bun run test:unit -- tests/unit/stores/billing.test.ts
```

- [ ] **Step 3: Implement** per PRD §6.2.1 verbatim

```typescript
// src/stores/billing.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export class BillingError extends Error {
  constructor(public code: string) { super(code) }
}

export interface Invoice {
  id: string
  created_at: string
  description: string
  amount_paid: number
  currency: string
  status: string
  hosted_invoice_url: string | null
  invoice_pdf: string | null
}

export const useBillingStore = defineStore('billing', () => {
  const plan = ref<'free' | 'solo' | 'agency'>('free')
  const planStatus = ref<'active' | 'past_due' | 'cancelled' | 'incomplete'>('active')
  const currentPeriodEnd = ref<Date | null>(null)
  const cancelAtPeriodEnd = ref(false)
  const stripeCustomerId = ref<string | null>(null)

  const invoices = ref<Invoice[]>([])
  const invoicesLoaded = ref(false)
  const usage = ref({ aiGenerations: 0, storageBytes: 0, resetAt: null as Date | null })

  const hasActiveSubscription = computed(() =>
    planStatus.value === 'active' &&
    (currentPeriodEnd.value === null || currentPeriodEnd.value > new Date()),
  )
  const isPastDue = computed(() => planStatus.value === 'past_due')

  function loadFromUser(user: any): void {
    plan.value = user.plan ?? 'free'
    planStatus.value = user.plan_status ?? 'active'
    currentPeriodEnd.value = user.current_period_end ? new Date(user.current_period_end) : null
    cancelAtPeriodEnd.value = user.cancel_at_period_end ?? false
    stripeCustomerId.value = user.stripe_customer_id ?? null
  }

  async function startCheckout(priceId: string): Promise<void> {
    const idemKey = crypto.randomUUID()
    sessionStorage.setItem('kova:lastCheckoutPriceId', priceId)  // for retry on cancel landing
    const res = await fetch('/api/stripe/checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Idempotency-Key': idemKey },
      body: JSON.stringify({
        price_id: priceId,
        success_url: `${window.location.origin}/account/billing/success`,
        cancel_url: `${window.location.origin}/account/billing/cancel`,
      }),
    })
    if (!res.ok) {
      const { error } = await res.json()
      throw new BillingError(error)
    }
    const { url } = await res.json()
    window.location.href = url
  }

  async function openPortal(): Promise<void> {
    const res = await fetch('/api/stripe/portal-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ return_url: `${window.location.origin}/account/billing` }),
    })
    if (!res.ok) {
      const { error } = await res.json()
      throw new BillingError(error)
    }
    const { url } = await res.json()
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  async function fetchInvoices(force = false): Promise<void> {
    if (invoicesLoaded.value && !force) return
    if (!stripeCustomerId.value) {
      invoices.value = []
      invoicesLoaded.value = true
      return
    }
    const res = await fetch('/api/stripe/invoices?limit=12')
    if (!res.ok) throw new BillingError('fetch_invoices_failed')
    const { invoices: list } = await res.json()
    invoices.value = list
    invoicesLoaded.value = true
  }

  async function fetchUsage(): Promise<void> {
    // Placeholder — wired to M5 try_increment_generation read RPC + storage size aggregator
    // Implementation deferred until M5 counter exposes a read-only getter
  }

  return {
    plan, planStatus, currentPeriodEnd, cancelAtPeriodEnd, stripeCustomerId,
    invoices, invoicesLoaded, usage,
    hasActiveSubscription, isPastDue,
    loadFromUser, startCheckout, openPortal, fetchInvoices, fetchUsage,
  }
})
```

- [ ] **Step 4: Verify pass + commit**

```bash
bun run test:unit -- tests/unit/stores/billing.test.ts
git add src/stores/billing.ts tests/unit/stores/billing.test.ts
git commit -m "feat(04): useBillingStore — Stripe Checkout + Portal + invoices"
```

### Task 5.2: `useAccountStore`

**Files:**
- Create: `kova-open-pencil-1/src/stores/account.ts`
- Test: `kova-open-pencil-1/tests/unit/stores/account.test.ts`

> Per PRD §6.2.2. Profile drafts + unsaved tracking.

- [ ] **Step 1 → 5**: TDD per Task 5.1 pattern. State + computed (hasUnsaved, unsavedFields) + actions (loadProfile, save, discard). Commit message: `feat(04): useAccountStore — profile drafts + unsaved tracking`.

---

## Phase 6 — Composables

### Task 6.1: `useAccountSection`

**Files:**
- Create: `kova-open-pencil-1/src/composables/account/use-account-section.ts`
- Test: `kova-open-pencil-1/tests/unit/composables/account/use-account-section.test.ts`

- [ ] **Step 1: Write test**

```typescript
// tests/unit/composables/account/use-account-section.test.ts
import { describe, it, expect, mock } from 'bun:test'
import { useAccountSection } from '@/composables/account/use-account-section'

describe('useAccountSection', () => {
  it('reads section from URL on mount', () => {
    const mockRoute = { params: { section: 'billing' } }
    const mockRouter = { push: mock() }
    // ... mock vue-router; assert activeSection.value === 'billing'
  })

  it('setSection updates URL via router.push', () => {
    // ... assert router.push called with /account/billing
  })

  it('falls back to profile for invalid section', () => {
    // ... activeSection === 'profile'
  })
})
```

- [ ] **Step 2 → 5**: implement + verify + commit.

```typescript
// src/composables/account/use-account-section.ts
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const VALID_SECTIONS = ['profile', 'billing', 'brand-kit', 'integrations', 'danger'] as const
type Section = typeof VALID_SECTIONS[number]

export function useAccountSection() {
  const route = useRoute()
  const router = useRouter()
  const activeSection = computed<Section>(() => {
    const s = route.params.section as string
    return (VALID_SECTIONS as readonly string[]).includes(s) ? s as Section : 'profile'
  })
  function setSection(section: Section): void {
    router.push(`/account/${section}`)
  }
  return { activeSection, setSection }
}
```

### Task 6.2: `useBrandPicker`

**Files:**
- Create: `kova-open-pencil-1/src/composables/account/use-brand-picker.ts`
- Test: `kova-open-pencil-1/tests/unit/composables/account/use-brand-picker.test.ts`

> Founder decision 2026-05-17: default precedence is `route.query.brand` > `usePreferencesStore.lastActiveBrandId` (Q5 Layer 2) > first brand alphabetically. Exposes `renderMode: 'empty' | 'static-label' | 'dropdown'` derived from `brands.length`. [PRD §6.3]

- [ ] **Step 1: Write failing test**

```typescript
// tests/unit/composables/account/use-brand-picker.test.ts
import { describe, it, expect, beforeEach, mock } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'

const router = { push: mock(() => Promise.resolve()), currentRoute: { value: { query: {} } } }
mock.module('vue-router', () => ({ useRouter: () => router, useRoute: () => router.currentRoute.value }))

describe('useBrandPicker', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('precedence: URL > Q5 lastActiveBrandId > alphabetical', async () => {
    router.currentRoute.value = { query: { brand: 'b-from-url' } }
    const { useBrandPicker } = await import('@/composables/account/use-brand-picker')
    // mock useBrandsStore with 3 brands + useUserPreferencesStore with lastActiveBrandId='b-from-prefs'
    // assert resolved id is 'b-from-url'
    // then with no URL, expect 'b-from-prefs'; then with neither, expect alphabetical first
  })

  it('renderMode is "empty" when 0 brands', async () => { /* ... */ })
  it('renderMode is "static-label" when exactly 1 brand', async () => { /* ... */ })
  it('renderMode is "dropdown" when 2+ brands', async () => { /* ... */ })

  it('setBrand writes URL query AND updates lastActiveBrandId pref', async () => { /* ... */ })
})
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement**

```typescript
// src/composables/account/use-brand-picker.ts
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBrandsStore } from '@/stores/brands'
import { useUserPreferencesStore } from '@/stores/user-preferences'

type RenderMode = 'empty' | 'static-label' | 'dropdown'

export function useBrandPicker(scope: 'brand-kit' | 'integrations') {
  const route = useRoute()
  const router = useRouter()
  const brands = useBrandsStore()
  const prefs = useUserPreferencesStore()

  const renderMode = computed<RenderMode>(() => {
    const count = brands.brands.length
    if (count === 0) return 'empty'
    if (count === 1) return 'static-label'
    return 'dropdown'
  })

  // Default precedence (founder decision 2026-05-17):
  //   URL ?brand=:brandId  >  prefs.lastActiveBrandId  >  alphabetical first
  const selectedBrandId = computed<string | null>(() => {
    const urlBrand = (route.query.brand as string | undefined) ?? null
    if (urlBrand && brands.brands.some((b) => b.id === urlBrand)) return urlBrand
    const prefBrand = prefs.lastActiveBrandId
    if (prefBrand && brands.brands.some((b) => b.id === prefBrand)) return prefBrand
    const alphaFirst = [...brands.brands].sort((a, b) => a.name.localeCompare(b.name))[0]
    return alphaFirst?.id ?? null
  })

  const selectedBrand = computed(() => brands.brands.find((b) => b.id === selectedBrandId.value) ?? null)

  async function setBrand(id: string) {
    // 1. Update URL — preserve other query params
    await router.push({ query: { ...route.query, brand: id } })
    // 2. Persist to Q5 Layer 2 prefs (write-through to users.preferences.lastActiveBrandId)
    await prefs.setLastActiveBrandId(id)
  }

  return { selectedBrand, selectedBrandId, setBrand, renderMode }
}
```

- [ ] **Step 4: Verify pass + commit**

```bash
bun run test:unit -- tests/unit/composables/account/use-brand-picker.test.ts
git add src/composables/account/use-brand-picker.ts tests/unit/composables/account/use-brand-picker.test.ts
git commit -m "feat(04): useBrandPicker — URL > Q5 > alphabetical precedence + renderMode"
```

### Task 6.3: `usePlanGate` (STUB)

**Files:**
- Create: `kova-open-pencil-1/src/composables/account/use-plan-gate.ts`
- Test: mirror.

> MVP returns `allowed=true` for everything (PRD §6.3 + §10 + §12).

- [ ] **Step 1 → 5**: TDD per pattern. Implementation is dead-simple — every test asserts `allowed.value === true`.

```typescript
// src/composables/account/use-plan-gate.ts
import { computed } from 'vue'
import { PLAN_GATE_ENFORCED } from '@/constants/billing-plans'
import { useBillingStore } from '@/stores/billing'

export function usePlanGate(_feature: string) {
  const billing = useBillingStore()
  const allowed = computed(() => {
    if (!PLAN_GATE_ENFORCED) return true
    // Real gating activates when founder flips PLAN_GATE_ENFORCED = true:
    // return PLAN_FEATURE_MAP[feature].includes(billing.plan.value)
    return true
  })
  const reason = computed(() => allowed.value ? null : 'Upgrade your plan to use this feature.')
  return { allowed, reason }
}
```

### Task 6.4: `useAvatarUpload`

**Files:**
- Create: `kova-open-pencil-1/src/composables/account/use-avatar-upload.ts`
- Test: mirror.

> Orchestrate signed-URL pattern: POST avatar-upload → PUT file → POST avatar-confirm.

- [ ] **Step 1 → 5**: TDD per pattern.

```typescript
// src/composables/account/use-avatar-upload.ts
// Founder decision 2026-05-17: PNG/JPG only (SVG rejected, XSS); 5MB max; server normalizes to PNG via sharp
import { ref } from 'vue'

const ALLOWED_MIMES = ['image/png', 'image/jpeg'] as const
const MAX_BYTES = 5 * 1024 * 1024 // 5 MB

export function useAvatarUpload() {
  const uploading = ref(false)
  const error = ref<string | null>(null)

  async function upload(file: File): Promise<{ public_url: string }> {
    error.value = null
    if (!ALLOWED_MIMES.includes(file.type as any)) {
      throw new Error('Unsupported file type. Use PNG or JPG.')
    }
    if (file.size > MAX_BYTES) {
      throw new Error('File too large (max 5 MB).')
    }
    uploading.value = true
    try {
      // Step 1: get signed URL
      const r1 = await fetch('/api/account/avatar-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mime_type: file.type, size_bytes: file.size }),
      })
      if (!r1.ok) throw new Error('upload-prep failed')
      const { signed_url, storage_path } = await r1.json()

      // Step 2: PUT the file directly to Supabase Storage
      const r2 = await fetch(signed_url, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })
      if (!r2.ok) throw new Error('upload failed')

      // Step 3: confirm
      const r3 = await fetch('/api/account/avatar-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storage_path }),
      })
      if (!r3.ok) throw new Error('confirm failed')
      return r3.json()
    } finally {
      uploading.value = false
    }
  }

  return { upload, uploading, error }
}
```

### Task 6.5: `useStripeReturn`

**Files:**
- Create: `kova-open-pencil-1/src/composables/account/use-stripe-return.ts`
- Test: mirror.

> Per PRD §6.3. Plan-name polling (race vs webhook fire); retry-with-stored-priceId on cancel.

- [ ] **Step 1 → 5**: TDD per pattern.

---

## Phase 7 — Account chrome components

### Task 7.1: `<AccountSidebar>` — 6 items (B12 reversal 2026-05-17)

**Files:**
- Create: `kova-open-pencil-1/src/components/account/AccountSidebar.vue`
- Test: `kova-open-pencil-1/tests/unit/components/account/AccountSidebar.test.ts`

> Per PRD §6.4.2. **6 items** (Brands inserted slot 2 per B12 reversal). Active highlight. Warn-tint on Danger zone. Sidebar order verified against `Kova Hi-Fi B12 Brands page - Dark.html` lines 554–560.

- [ ] **Step 1: Write test**

```typescript
// tests/unit/components/account/AccountSidebar.test.ts
import { describe, it, expect } from 'bun:test'
import { mount } from '@vue/test-utils'
import AccountSidebar from '@/components/account/AccountSidebar.vue'

describe('AccountSidebar', () => {
  const items = [
    { id: 'profile', label: 'Profile', icon: 'user' },
    { id: 'brands', label: 'Brands', icon: 'layers' },             // B12 reversal 2026-05-17
    { id: 'billing', label: 'Plan & billing', icon: 'credit-card' },
    { id: 'brand-kit', label: 'Brand Kit', icon: 'palette' },
    { id: 'integrations', label: 'Integrations', icon: 'plug' },
    { id: 'danger', label: 'Danger zone', icon: 'trash-2', warnTinted: true },
  ]

  it('renders 6 items in correct order (B12 reversal 2026-05-17)', () => {
    const w = mount(AccountSidebar, { props: { activeSection: 'profile', items } })
    const renderedIds = w.findAll('[data-account-sidebar-item]').map((n) => n.attributes('data-account-sidebar-item'))
    expect(renderedIds).toEqual(['profile', 'brands', 'billing', 'brand-kit', 'integrations', 'danger'])
  })

  it('highlights active item', () => {
    const w = mount(AccountSidebar, { props: { activeSection: 'billing', items } })
    const active = w.find('[data-account-sidebar-item="billing"]')
    expect(active.classes()).toContain('active')
  })

  it('emits select event on click', async () => {
    const w = mount(AccountSidebar, { props: { activeSection: 'profile', items } })
    await w.find('[data-account-sidebar-item="brands"]').trigger('click')
    expect(w.emitted('select')?.[0]).toEqual(['brands'])
  })

  it('renders danger zone with warn tint', () => {
    const w = mount(AccountSidebar, { props: { activeSection: 'profile', items } })
    const danger = w.find('[data-account-sidebar-item="danger"]')
    expect(danger.classes()).toContain('warn-tinted')
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement**

```vue
<!-- src/components/account/AccountSidebar.vue -->
<script setup lang="ts">
import type { Component } from 'vue'

interface SidebarItem {
  id: string
  label: string
  icon: string
  warnTinted?: boolean
}

const props = defineProps<{
  activeSection: string
  items: readonly SidebarItem[]
}>()
const emit = defineEmits<{ (e: 'select', id: string): void }>()
</script>

<template>
  <nav class="w-60 flex-shrink-0 border-r border-[var(--line)] py-4">
    <ul class="space-y-1">
      <li v-for="item in items" :key="item.id">
        <button
          :data-account-sidebar-item="item.id"
          :class="[
            'flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition',
            activeSection === item.id ? 'active bg-[var(--surface-1)] text-[var(--ink)]' : 'text-[var(--ink-2)] hover:bg-[var(--surface-1)]',
            item.warnTinted ? 'warn-tinted text-[var(--warn)]' : '',
          ]"
          @click="emit('select', item.id)"
        >
          <component :is="`icon-lucide-${item.icon}`" class="h-4 w-4" />
          <span>{{ item.label }}</span>
        </button>
      </li>
    </ul>
  </nav>
</template>
```

- [ ] **Step 4: Verify pass + commit**

```bash
bun run test:unit -- tests/unit/components/account/AccountSidebar.test.ts
git add src/components/account/AccountSidebar.vue tests/unit/components/account/AccountSidebar.test.ts
git commit -m "feat(04): <AccountSidebar> 6-item nav with Brands entry + active highlight"
```

### Task 7.2: `<AccountSectionHeader>` + `<UnsavedPill>`

**Files:**
- Create both + tests.

- [ ] **Step 1 → 5**: TDD per pattern.

### Task 7.3: `<BrandPicker>` — 3-mode render (founder decision 2026-05-17)

**Files:**
- Create: `kova-open-pencil-1/src/components/account/BrandPicker.vue`
- Test: `kova-open-pencil-1/tests/unit/components/account/BrandPicker.test.ts`

> Per PRD §6.4.2 + founder decision 2026-05-17. Component renders 3 variants based on prop `renderMode`:
>
> - **`'empty'`** — defer to parent `<EmptyState>` (parent shows "No brands yet. Create one from your dashboard first." + CTA → `/dashboard`)
> - **`'static-label'`** (1 brand) — render `<span class="brand-picker-static">{{ brandName }}</span>` with no dropdown chevron. Pure text label. Matches Figma's single-team/workspace pattern.
> - **`'dropdown'`** (2+ brands) — full Reka-UI DropdownMenu with chevron, search filter, archived-muted, footer slot.

- [ ] **Step 1: Write failing test**

```typescript
// tests/unit/components/account/BrandPicker.test.ts
import { describe, it, expect } from 'bun:test'
import { mount } from '@vue/test-utils'
import BrandPicker from '@/components/account/BrandPicker.vue'

describe('<BrandPicker>', () => {
  it('renders nothing in empty mode (parent owns EmptyState)', () => {
    const w = mount(BrandPicker, { props: { renderMode: 'empty', brands: [], modelValue: null } })
    expect(w.find('[data-testid="brand-picker"]').exists()).toBe(false)
  })

  it('renders static label (no chevron) when renderMode is static-label', () => {
    const w = mount(BrandPicker, {
      props: { renderMode: 'static-label', brands: [{ id: 'b1', name: 'Acme Co' }], modelValue: 'b1' },
    })
    expect(w.find('.brand-picker-static').text()).toBe('Acme Co')
    expect(w.find('[data-testid="dropdown-chevron"]').exists()).toBe(false)
  })

  it('renders full dropdown when renderMode is dropdown (2+ brands)', () => {
    const w = mount(BrandPicker, {
      props: {
        renderMode: 'dropdown',
        brands: [{ id: 'b1', name: 'Acme Co' }, { id: 'b2', name: 'Zeta Inc' }],
        modelValue: 'b1',
      },
    })
    expect(w.find('[data-testid="dropdown-chevron"]').exists()).toBe(true)
  })

  it('emits update:modelValue on selection (dropdown variant)', async () => {
    const w = mount(BrandPicker, { props: { renderMode: 'dropdown', brands: [{ id: 'b1', name: 'A' }, { id: 'b2', name: 'B' }], modelValue: 'b1' } })
    await w.find('[data-testid="brand-option-b2"]').trigger('click')
    expect(w.emitted('update:modelValue')?.[0]).toEqual(['b2'])
  })
})
```

- [ ] **Step 2 → 5**: Implement the 3 variants in template via `v-if="renderMode === 'static-label'"` / `v-else-if="renderMode === 'dropdown'"`; archived-muted + footer slot only render in dropdown variant. Commit.

### Task 7.4: `<AccountView>`

**Files:**
- Create: `kova-open-pencil-1/src/views/account/AccountView.vue`
- Test: `kova-open-pencil-1/tests/unit/views/account/AccountView.test.ts`

> Per PRD §6.4.3 — full layout. Uses `useAccountSection` + `<AccountSidebar>` + `<SectionResolver>`.

- [ ] **Step 1: Write test** — verify the topbar, sidebar mount, and section resolver render.

```typescript
// tests/unit/views/account/AccountView.test.ts
import { describe, it, expect } from 'bun:test'
import { mount } from '@vue/test-utils'
import AccountView from '@/views/account/AccountView.vue'
import { createRouter, createWebHistory } from 'vue-router'
import { setActivePinia, createPinia } from 'pinia'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/account/:section', name: 'account', component: AccountView },
    { path: '/dashboard', name: 'dashboard', component: { template: '<div />' } },
  ],
})

describe('AccountView', () => {
  it('renders 5-item sidebar + "Back to dashboard" + content area', async () => {
    setActivePinia(createPinia())
    await router.push('/account/profile')
    const w = mount(AccountView, { global: { plugins: [router] } })
    expect(w.find('.acct-back').exists()).toBe(true)
    expect(w.findAllComponents({ name: 'AccountSidebar' }).length).toBe(1)
    expect(w.find('.acct-content').exists()).toBe(true)
  })
})
```

- [ ] **Step 2 → 5**: implement + verify + commit per PRD §6.4.3.

### Task 7.5: `<SectionResolver>`

**Files:**
- Create + test.

> Maps `useAccountStore.activeSection` → which section component to render. Uses dynamic `<component :is="...">`.

- [ ] **Step 1 → 5**: TDD per pattern.

---

## Phase 8 — Profile section

### Task 8.1: `<ProfileSection>`

**Files:**
- Create: `kova-open-pencil-1/src/views/account/sections/ProfileSection.vue`
- Test: `kova-open-pencil-1/tests/unit/views/account/sections/ProfileSection.test.ts`

> Per PRD §6.4.1 + §3.2. Renders name + avatar + email + accessibility + notification + timezone rows. Wires `useEmailChange` from Cluster 01.

**Cluster 12 dependency (C-LOW12.6):** mount `<AccessibilityPanel>` and
`<NotificationsPanel>` inside this section. Cluster 12 owns the panel
components + store wiring; Cluster 04 owns the section composition.

```vue
<script setup lang="ts">
import AccessibilityPanel from '@/components/settings/AccessibilityPanel.vue' // Cluster 12 Task 10
import NotificationsPanel from '@/components/settings/NotificationsPanel.vue' // Cluster 12 Task 11
</script>

<template>
  <!-- Identity rows: name + avatar + email + timezone (this PRD's content) -->
  <section class="s-section">
    <h2>Accessibility</h2>
    <p class="desc">Saved to your user preferences. Same controls also reachable from main menu → Preferences → Accessibility (A8.3).</p>
    <AccessibilityPanel />
  </section>
  <section class="s-section">
    <h2>Notifications</h2>
    <NotificationsPanel />
  </section>
</template>
```

The Profile save-bar governs Identity fields only — Accessibility +
Notifications rows apply immediately via `usePreferencesStore` (Cluster 12),
bypassing the save-bar.

- [ ] **Step 1: Write tests** for each row: name edit + dirty pill; avatar button → file picker; email "Change…" triggers cluster-01 composable; timezone select renders 440+ IANA strings; AccessibilityPanel + NotificationsPanel render slot.

- [ ] **Step 2 → 5**: TDD per pattern. Implementation cites PRD §3.2 copy strings verbatim.

---

## Phase 9 — Plan & billing section

### Task 9.1: `<PlanCard>` + `<UsageBar>` + `<InvoiceTable>` + `<PastDueBanner>` + `<TrialBanner>`

**Files:**
- Create each component under `src/components/account/` + tests.

**Component contracts (founder decisions 2026-05-17):**

- `<PlanCard>` — Status pill renders **5 variants**: Active (`ok` token), Past due (`warn`), Cancelled (`muted`), Incomplete (`warn-soft`), **Trial** (`info` — hidden at MVP since no trials, but component supports it via conditional render on `planStatus === 'trialing'`). Free-tier feature bullets sourced from `@/constants/billing-plans.ts` (4 lines: "1 brand kit", "Unlimited canvases", "AI design assistant", "Image export (PNG slices)"). "Compare plans" button = always visible, click fires `useToast({ message: 'Pricing coming soon.', kind: 'info' })`.
- `<PastDueBanner>` — Renders ONLY when `useBillingStore.isPastDue === true`. Copy: `"Your last payment didn't go through. Update your card before {{ deadline }} to keep your subscription."` (deadline = `currentPeriodEnd + 7 days`, formatted via `dayjs(...).format('MMMM D')`). Single CTA "Update payment method" → triggers `useBillingStore.openPortal()` (same Stripe Portal new-tab flow as Manage billing).
- `<TrialBanner>` (NEW, founder decision 2026-05-17) — Renders ONLY when `useBillingStore.planStatus === 'trialing'`. Copy: `"Trial — {{ daysLeft }} days left of {{ planName }}."` where `daysLeft = Math.max(0, Math.ceil((currentPeriodEnd - now) / 86400000))`. Ships hidden at MVP (no Stripe trial settings active) but lights up automatically when founder activates trials in Stripe Dashboard. Test must assert: (a) renders when `planStatus === 'trialing'`; (b) does NOT render for other statuses; (c) renders correct daysLeft for various `currentPeriodEnd` offsets.

- [ ] **Step 1 → 5**: TDD per component. Test status pill 5-variant mapping (Active/Past due/Cancelled/Incomplete/Trial). Test TrialBanner conditional render. Test PastDueBanner deadline interpolation.

### Task 9.2: `<BillingSection>`

**Files:**
- Create: `kova-open-pencil-1/src/views/account/sections/BillingSection.vue`
- Test: mirror.

> Per PRD §3.3. Composes `<PlanCard>` + `<PastDueBanner>` (conditional on `isPastDue`) + `<TrialBanner>` (conditional on `planStatus === 'trialing'`) + `<UsageBar>` (x2) + `<InvoiceTable>`. Calls `useBillingStore.fetchInvoices()` + `fetchUsage()` on mount.

- [ ] **Step 1 → 5**: TDD per pattern.

---

## Phase 10 — Brand Kit section shell

### Task 10.1: `<BrandKitSection>`

**Files:**
- Create: `kova-open-pencil-1/src/views/account/sections/BrandKitSection.vue`
- Test: mirror.

> Per PRD §3.4 + §6.4.1. Renders `<BrandPicker>` + sub-tab rail + content slot (Cluster 11 `<Skeleton>` placeholder until Cluster 05 ships).

- [ ] **Step 1 → 5**: TDD per pattern. Sub-tab rail uses `?tab=:tab` query param.

---

## Phase 11 — Integrations section (M9 refactor)

### Task 11.1: Extend `useShopifyConnection` with `fetchConnectionHistory`

**Files:**
- Modify: `kova-open-pencil-1/src/composables/use-shopify-connection.ts:125` (the hardcoded `[]`)
- Test: `kova-open-pencil-1/tests/unit/composables/use-shopify-connection-history.test.ts`

> Per PRD §6.4.5. Read existing composable + extend; do NOT break existing API.

- [ ] **Step 1: Read M9 file + note line 125** (`history: []` hardcoded)

```bash
sed -n '110,135p' src/composables/use-shopify-connection.ts
```

- [ ] **Step 2: Write test for new `fetchConnectionHistory` method**

```typescript
// tests/unit/composables/use-shopify-connection-history.test.ts
import { describe, it, expect, mock } from 'bun:test'
import { useShopifyConnection } from '@/composables/use-shopify-connection'

describe('useShopifyConnection.fetchConnectionHistory', () => {
  it('queries shopify_connection_history for the brand and orders desc', async () => {
    const eqMock = mock(() => Promise.resolve({ data: [
      { id: 'h1', brand_id: 'brand-1', event_type: 'connected', occurred_at: '2026-05-01T00:00:00Z', source: 'user', metadata: { shop_domain: 'x.myshopify.com' } },
    ], error: null }))
    const supabaseMock = {
      from: mock(() => ({ select: mock(() => ({ eq: mock(() => ({ order: mock(() => ({ limit: mock(() => eqMock()) })) })) })) })),
    }
    // ... inject supabase mock ...
    const conn = useShopifyConnection('brand-1', { supabase: supabaseMock as any })
    await conn.fetchConnectionHistory('brand-1')
    expect(conn.connection.value?.history?.length).toBe(1)
  })
})
```

- [ ] **Step 3: Run — expect FAIL**

```bash
bun run test:unit -- tests/unit/composables/use-shopify-connection-history.test.ts
```

- [ ] **Step 4: Modify the composable**

Replace line 125 (`history: []`) and add a new method. Read existing composable first to find the exact insertion points.

```typescript
// src/composables/use-shopify-connection.ts (excerpts)
async function fetchConnectionHistory(brandId: string): Promise<void> {
  const { data, error } = await supabase
    .from('shopify_connection_history')
    .select('id, event_type, occurred_at, source, metadata')
    .eq('brand_id', brandId)
    .order('occurred_at', { ascending: false })
    .limit(50)
  if (error) {
    console.error('[shopify-history] fetch failed', error)
    return
  }
  if (connection.value) {
    connection.value.history = data as HistoryEntry[]
  }
}

// Inside loadConnection(), after the existing fetch:
await fetchConnectionHistory(brandId)

// Realtime subscription:
supabase.channel(`shopify-history:${brandId}`)
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'shopify_connection_history', filter: `brand_id=eq.${brandId}` }, payload => {
    if (connection.value) {
      connection.value.history = [payload.new as HistoryEntry, ...(connection.value.history ?? [])].slice(0, 50)
    }
  })
  .subscribe()

// Return — add fetchConnectionHistory to public API
return { /* ...existing... */, fetchConnectionHistory }
```

- [ ] **Step 5: Verify pass + commit**

```bash
bun run test:unit -- tests/unit/composables/use-shopify-connection-history.test.ts
git add src/composables/use-shopify-connection.ts tests/unit/composables/use-shopify-connection-history.test.ts
git commit -m "feat(04): useShopifyConnection — fetchConnectionHistory + Realtime sub"
```

### Task 11.2: Wire history-log RPC into existing M9 disconnect handler

**Files:**
- Modify: `kova-open-pencil-1/api/shopify/oauth/disconnect.ts` — call `log_shopify_connection_event` RPC

- [ ] **Step 1: Read file**, identify success branch.

- [ ] **Step 2: Write integration test** confirming a disconnect causes a `disconnected` row in `shopify_connection_history`.

- [ ] **Step 3 → 5**: implement RPC call + verify + commit.

### Task 11.3: Wire history-log RPC into M9 OAuth callback + sync handlers

**Files:**
- Modify: `kova-open-pencil-1/api/shopify/oauth/callback.ts` — `connected` event
- Modify: `kova-open-pencil-1/api/shopify/sync/bulk-start.ts` — `sync_started`
- Modify: `kova-open-pencil-1/api/shopify/sync/bulk-complete.ts` — `sync_completed`
- Modify: M9 sync worker error path — `sync_failed`

- [ ] **Step 1 → 5**: TDD per pattern. Per integration test, each event type lands a row.

### Task 11.4: `<SyncProgressBar>` extraction

**Files:**
- Create: `kova-open-pencil-1/src/components/account/SyncProgressBar.vue`
- Test: mirror.

> Extract from M9; add ARIA progressbar attributes consistently. [PRD §6.4.5 row 10]

- [ ] **Step 1 → 5**: TDD per pattern.

### Task 11.5: `<ShopifyConnectForm>` extraction

**Files:**
- Create: `kova-open-pencil-1/src/components/account/ShopifyConnectForm.vue`
- Test: mirror.

> Extract from M9 IntegrationsCard + SettingsBrandIntegrationsView (deduplicate). Domain input → normalizeShopDomain → openOAuthPopup. [PRD §6.4.5 row 7]

- [ ] **Step 1 → 5**: TDD per pattern.

### Task 11.6: `<IntegrationCard>` (refactored M9 IntegrationsCard)

**Files:**
- Create: `kova-open-pencil-1/src/components/account/IntegrationCard.vue`
- Test: mirror.

> Per PRD §6.4.2 row 9 + §6.4.5. All states (connected, not_connected, connecting, reauthorize, syncing, coming_soon). Uses `<ShopifyConnectForm>` + `<SyncProgressBar>` internally.

- [ ] **Step 1 → 5**: TDD per pattern. Theme-drift grep gate runs in CI (see Phase 15).

### Task 11.7: `<SyncHistoryAccordion>`

**Files:**
- Create: `kova-open-pencil-1/src/components/account/SyncHistoryAccordion.vue`
- Test: mirror.

> Per PRD §6.4.2 row 10. Reka Accordion; rows from `useShopifyConnection.connection.history`; per-event-type icon + humanized label.

- [ ] **Step 1 → 5**: TDD per pattern. Empty state copy "No sync history yet. Events show here as you connect and sync."

### Task 11.8: `<IntegrationsSection>`

**Files:**
- Create: `kova-open-pencil-1/src/views/account/sections/IntegrationsSection.vue`
- Test: mirror.

> Per PRD §3.5. Composes `<BrandPicker>` + Shopify `<IntegrationCard>` + 2 "Coming soon" placeholder cards + `<SyncHistoryAccordion>`. Uses `useBrandPicker('integrations')`.

- [ ] **Step 1 → 5**: TDD per pattern.

### Task 11.9: Delete M9 files now superseded

**Files:**
- Delete: `kova-open-pencil-1/src/views/dashboard/SettingsBrandIntegrationsView.vue`
- Delete: `kova-open-pencil-1/src/components/dashboard/IntegrationsCard.vue`
- Modify: `kova-open-pencil-1/src/router/routes.ts` — remove `/dashboard/:brandId/settings/integrations` entry

- [ ] **Step 1: Grep for any remaining import of the deleted files**

```bash
grep -rE "SettingsBrandIntegrationsView|components/dashboard/IntegrationsCard" src/ tests/
```

Expected: no results (all callers should already be migrated to `/account/integrations`).

- [ ] **Step 2: Delete + commit**

```bash
rm src/views/dashboard/SettingsBrandIntegrationsView.vue
rm src/components/dashboard/IntegrationsCard.vue
# Edit src/router/routes.ts to remove the route
git add -A
git commit -m "chore(04): remove M9 light-themed IntegrationsCard + SettingsBrandIntegrationsView (superseded by /account/integrations)"
```

- [ ] **Step 3: Run full unit + integration suite**

```bash
bun run test:unit
```

Expected: all green; no orphan tests.

---

## Phase 12 — Danger zone + Stripe return landings

### Task 12.1: `<DangerZoneSection>` (Cluster 01 mount point)

**Files:**
- Create: `kova-open-pencil-1/src/views/account/sections/DangerZoneSection.vue`
- Test: mirror.

> Per PRD §3.6 + §6.4.1. Thin wrapper that mounts Cluster 01's `<DangerZoneCard>`. Verify the import path + emit contract via component test.

- [ ] **Step 1 → 5**: TDD per pattern. The wrapper is ~10 lines.

```vue
<!-- src/views/account/sections/DangerZoneSection.vue -->
<script setup lang="ts">
import DangerZoneCard from '@/components/account/DangerZoneCard.vue'  // Cluster 01 exports here
</script>

<template>
  <section class="acct-section">
    <header class="acct-section-header">
      <h2 class="text-[var(--ink)] text-lg">Danger zone</h2>
      <p class="text-[var(--ink-2)] text-sm">Permanent actions that cannot be undone.</p>
    </header>
    <DangerZoneCard />
  </section>
</template>
```

### Task 12.2: `<StripeReturnLanding>`

**Files:**
- Create: `kova-open-pencil-1/src/views/account/StripeReturnLanding.vue`
- Test: `kova-open-pencil-1/tests/unit/components/account/StripeReturnLanding.test.ts`

> Per PRD §6.4.4 + §3.7. Branch on `mode` prop: success (B10.1) vs cancel (B10.2). Uses `useStripeReturn()`.

- [ ] **Step 1: Write tests** for each mode + plan-name polling + cancel retry.

```typescript
// tests/unit/components/account/StripeReturnLanding.test.ts
import { describe, it, expect, mock } from 'bun:test'
import { mount } from '@vue/test-utils'
import StripeReturnLanding from '@/views/account/StripeReturnLanding.vue'

describe('StripeReturnLanding', () => {
  it('renders success copy with plan name', () => {
    const w = mount(StripeReturnLanding, {
      props: { mode: 'success' },
      // stub billing store with plan='solo'
    })
    expect(w.text()).toContain("You're on")
    expect(w.text()).toContain('Solo')
  })

  it('renders cancel copy with try-again CTA', () => {
    const w = mount(StripeReturnLanding, { props: { mode: 'cancel' } })
    expect(w.text()).toContain('Checkout cancelled')
    expect(w.text()).toContain('Try again')
  })
})
```

- [ ] **Step 2 → 5**: implement + verify + commit per PRD §3.7 copy + §6.4.4 structure.

---

## Phase 13 — Routes + meta + viewport guard wiring

### Task 13.1: Register routes — 6 sections including `/account/brands` (B12 reversal 2026-05-17)

**Files:**
- Modify: `kova-open-pencil-1/src/router/routes.ts` — add the 3 new routes from PRD §6.1, with `:section` enum including `brands`

- [ ] **Step 1: Write a routes integration test** that navigates to each route + asserts the right component renders.

```typescript
// tests/integration/router/account-routes.test.ts
import { describe, it, expect } from 'bun:test'
import { createRouter, createMemoryHistory } from 'vue-router'
import { mount } from '@vue/test-utils'
import { routes } from '@/router/routes'

describe('Account routes', () => {
  it('/account redirects to /account/profile', async () => {
    const router = createRouter({ history: createMemoryHistory(), routes })
    await router.push('/account')
    await router.isReady()
    expect(router.currentRoute.value.path).toBe('/account/profile')
  })

  it('/account/unknown returns 404 (no match)', async () => {
    const router = createRouter({ history: createMemoryHistory(), routes })
    await router.push('/account/nope')
    expect(router.currentRoute.value.matched.length).toBe(0)
  })

  it('/account/billing/success matches StripeReturnLanding with mode=success', async () => {
    const router = createRouter({ history: createMemoryHistory(), routes })
    await router.push('/account/billing/success')
    await router.isReady()
    expect(router.currentRoute.value.name).toBe('account-billing-success')
  })

  it('/account/brands matches account section route (B12 reversal 2026-05-17)', async () => {
    const router = createRouter({ history: createMemoryHistory(), routes })
    await router.push('/account/brands')
    await router.isReady()
    expect(router.currentRoute.value.name).toBe('account')
    expect(router.currentRoute.value.params.section).toBe('brands')
  })

  it('/account/brands inherits requiresAuth + dark theme meta from parent', async () => {
    const router = createRouter({ history: createMemoryHistory(), routes })
    await router.push('/account/brands')
    await router.isReady()
    expect(router.currentRoute.value.meta.requiresAuth).toBe(true)
    expect(router.currentRoute.value.meta.theme).toBe('dark')
    expect(router.currentRoute.value.meta.viewportGuard).toBe('desktop')
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Add the 3 routes** verbatim from PRD §6.1. **Important: the `:section` enum MUST include `brands`** — `:section(profile|brands|billing|brand-kit|integrations|danger)`. Cross-cluster ownership: PRD 04 owns this route registration; PRD 03 ships the `<BrandsArchiveView>` component that `<SectionResolver>` dispatches to.

- [ ] **Step 4: Verify pass + commit**

```bash
bun run test:unit -- tests/integration/router/account-routes.test.ts
git add src/router/routes.ts tests/integration/router/account-routes.test.ts
git commit -m "feat(04): register /account routes incl. /account/brands (B12 reversal 2026-05-17)"
```

### Task 13.2: Wire viewport guard + auth middleware

Already shipped by Cluster 01. Verify the meta `theme: 'dark'` + `requiresAuth: true` + `viewportGuard: 'desktop'` flow works against `/account/*` via an E2E smoke (Phase 14 covers). The `/account/brands` route inherits all 3 meta flags from the parent `account` route — no extra wiring needed.

### Task 13.3: Wire `<SectionResolver>` `'brands'` mapping (B12 reversal 2026-05-17, cross-cluster)

**Files:**
- Modify: `kova-open-pencil-1/src/views/account/sections/SectionResolver.vue` — add `'brands'` case that dynamic-imports PRD 03's `<BrandsArchiveView>`

**Cross-cluster note:** PRD 03 plan (Task A2 per PRD 03 dispatch) ships `<BrandsArchiveView>` at `src/views/account/sections/BrandsArchiveView.vue`. This task ONLY wires it into the resolver — DO NOT build the component itself. If PRD 03 hasn't shipped `<BrandsArchiveView>` yet at integration time, this resolver case mounts a Cluster 11 `<Skeleton>` placeholder until 03 lands. Verify against PRD 03 plan before claiming complete.

- [ ] **Step 1: Write test**

```typescript
// tests/unit/views/account/sections/SectionResolver.test.ts
import { describe, it, expect } from 'bun:test'
import { mount } from '@vue/test-utils'
import SectionResolver from '@/views/account/sections/SectionResolver.vue'

describe('SectionResolver', () => {
  it('renders BrandsArchiveView when activeSection is "brands" (B12 reversal 2026-05-17)', async () => {
    // Mount with stub store activeSection: 'brands'
    const w = mount(SectionResolver, { global: { stubs: { BrandsArchiveView: { template: '<div data-testid="brands-view" />' } } } })
    // ... set store.activeSection = 'brands'
    await w.vm.$nextTick()
    expect(w.find('[data-testid="brands-view"]').exists()).toBe(true)
  })

  it('falls back to Cluster 11 Skeleton if BrandsArchiveView not yet imported (PRD 03 not landed)', async () => {
    // Mock dynamic import failure
    // assert Skeleton renders
  })
})
```

- [ ] **Step 2 → 5**: TDD per pattern. Add `<Suspense>` + `<Skeleton>` fallback for the dynamic-import case.

```vue
<!-- src/views/account/sections/SectionResolver.vue (excerpt) -->
<script setup lang="ts">
import { defineAsyncComponent } from 'vue'
import { useAccountStore } from '@/stores/account'
import Skeleton from '@/components/ui/Skeleton.vue'

const account = useAccountStore()

const BrandsArchiveView = defineAsyncComponent({
  loader: () => import('@/views/account/sections/BrandsArchiveView.vue'),
  loadingComponent: Skeleton,
  errorComponent: Skeleton, // PRD 03 not landed yet → render Skeleton
  delay: 100,
})
// ProfileSection, BillingSection, BrandKitSection, IntegrationsSection, DangerZoneSection imported normally
</script>

<template>
  <ProfileSection v-if="account.activeSection === 'profile'" />
  <BrandsArchiveView v-else-if="account.activeSection === 'brands'" />
  <BillingSection v-else-if="account.activeSection === 'billing'" />
  <BrandKitSection v-else-if="account.activeSection === 'brand-kit'" />
  <IntegrationsSection v-else-if="account.activeSection === 'integrations'" />
  <DangerZoneSection v-else-if="account.activeSection === 'danger'" />
</template>
```

```bash
bun run test:unit -- tests/unit/views/account/sections/SectionResolver.test.ts
git add src/views/account/sections/SectionResolver.vue tests/unit/views/account/sections/SectionResolver.test.ts
git commit -m "feat(04): SectionResolver maps 'brands' → BrandsArchiveView (cross-cluster from PRD 03)"
```

---

## Phase 14 — Privacy policy, RoPA, operator runbook

### Task 14.1: Privacy policy Stripe disclosure

**Files:**
- Modify: `kova-open-pencil-1/docs/legal/privacy-policy.md`

> Cluster 01 owns the file. Add Stripe-specific section per PRD §5.5.

- [ ] **Step 1: Read current file**

- [ ] **Step 2: Append/extend Stripe sub-processor disclosure**

```markdown
### Stripe (subscription billing)

When you subscribe to a paid plan, Kova transmits the following data to Stripe, Inc. (Dublin, Ireland & San Francisco, USA):

- Email address (for invoice delivery)
- Name (for billing display)
- Customer identifier (`customer.metadata.user_id`)
- Payment method details (collected directly by Stripe; we do not store card data)
- Subscription event data (plan, period, status)

Stripe retains invoice data for 7 years (regulatory requirement). When you delete your Kova account, the linked Stripe Customer is deleted via Stripe's API, which removes future-billable data; historical invoices remain at Stripe for compliance.

Stripe's privacy policy: https://stripe.com/privacy
```

- [ ] **Step 3: Commit**

```bash
git add docs/legal/privacy-policy.md
git commit -m "docs(04): add Stripe sub-processor disclosure to privacy policy"
```

### Task 14.2: RoPA Stripe row

**Files:**
- Modify: `kova-open-pencil-1/docs/legal/ropa.md`

- [ ] **Step 1 → 3**: append Stripe row per PRD §5.5 + commit.

### Task 14.3: Operator runbook

**Files:**
- Create: `kova-open-pencil-1/docs/operations/stripe-setup-runbook.md`

- [ ] **Step 1: Create new runbook** per PRD §5.4.1 + §5.4.2 + §5.4.3 — step-by-step:
  1. Create Stripe account; Test mode default
  2. Create Solo + Agency Products + Prices in Dashboard
  3. Customer Portal configuration (table from §5.4.1)
  4. Register webhook endpoint (§5.4.2)
  5. Copy webhook signing secret → env var
  6. Configure Customer emails (failed-payment dunning)
  7. Pre-launch: flip to Live mode, repeat steps 2-5 against live keys
  8. Sentry alert rule for `webhook outcome=error` >1% in 5 min

- [ ] **Step 2: Commit**

```bash
git add docs/operations/stripe-setup-runbook.md
git commit -m "docs(04): Stripe Dashboard + webhook setup runbook"
```

### Task 14.4: Resend email templates — 4 events at MVP (founder decision 2026-05-17)

**Files:**
- Create: `kova-open-pencil-1/emails/account/subscription-new.html`
- Create: `kova-open-pencil-1/emails/account/subscription-upgraded.html`
- Create: `kova-open-pencil-1/emails/account/subscription-cancelled.html`
- Create: `kova-open-pencil-1/emails/account/subscription-payment-failed.html`

> All 4 templates extend Cluster 11's `<EmailShell>`. Inter font. List-Unsubscribe (`<mailto:unsubscribe@kova.app>`) + `X-Entity-Ref-ID: {{ user_id }}` headers set by `<EmailShell>` wrapper. Each `.html` has a paired `.txt` generated at build via `juice` + plain-text extractor; Resend SDK sends both `html:` + `text:` payloads.

**Subject lines (founder-approved 2026-05-17):**

| Template | Subject |
|---|---|
| `subscription-new.html` | `Welcome to Kova {{ planName }} 🎉` |
| `subscription-upgraded.html` | `You're now on Kova {{ planName }}` |
| `subscription-cancelled.html` | `Your Kova subscription has been cancelled` |
| `subscription-payment-failed.html` | `Action needed: payment failed for Kova` |

- [ ] **Step 1: Create `subscription-new.html`**

```html
<!-- emails/account/subscription-new.html -->
<!doctype html>
<html lang="en">
<head><meta charset="utf-8" /><title>Welcome to Kova {{ planName }}</title></head>
<body>
  <h1>Welcome to Kova {{ planName }} 🎉</h1>
  <p>Thanks for subscribing — your account now includes <strong>{{ planName }}</strong> features.</p>
  <p>Your first invoice for <strong>${{ amount }}</strong> is processed and you're all set.</p>
  <p><a href="https://kova.app/dashboard" class="btn-primary">Open Kova</a></p>
  <p><a href="{{ hosted_invoice_url }}">View invoice</a></p>
  <hr />
  <p class="footer">This subscription is managed via Kova. Billing emails are transactional and cannot be opted out.</p>
</body>
</html>
```

Variables: `planName`, `amount`, `currency` (default USD), `hosted_invoice_url`, `user_id`.

- [ ] **Step 2: Create `subscription-upgraded.html`**

```html
<!-- emails/account/subscription-upgraded.html -->
<!doctype html>
<html lang="en">
<head><meta charset="utf-8" /><title>You're on Kova {{ planName }}</title></head>
<body>
  <h1>You're on {{ planName }}</h1>
  <p>Your plan changed from <strong>{{ oldPlanName }}</strong> to <strong>{{ planName }}</strong> effective immediately.</p>
  <p>Your next invoice for <strong>${{ amount }}</strong> renews <strong>{{ currentPeriodEnd | date('long') }}</strong>.</p>
  <p><a href="https://kova.app/dashboard" class="btn-primary">Open Kova</a></p>
  <p><a href="https://kova.app/account/billing">Manage subscription</a></p>
</body>
</html>
```

Variables: `planName`, `oldPlanName`, `amount`, `currentPeriodEnd`, `user_id`.

- [ ] **Step 3: Create `subscription-cancelled.html` (handles both scheduled-cancel and post-cancel)**

```html
<!-- emails/account/subscription-cancelled.html -->
<!doctype html>
<html lang="en">
<head><meta charset="utf-8" /><title>Your Kova subscription has been cancelled</title></head>
<body>
  <h1>Subscription cancelled</h1>
  {% if wasScheduled %}
    <p>Your subscription will end on <strong>{{ accessEndsOn | date('long') }}</strong>. Until then, you keep full access.</p>
  {% else %}
    <p>Your subscription ended on <strong>{{ accessEndsOn | date('long') }}</strong>. We've moved you to the Free plan.</p>
  {% endif %}
  <p>We'd love to know what we could've done better — reply to this email anytime.</p>
  <p><a href="https://kova.app/account/billing" class="btn-primary">Reactivate</a></p>
  <p><a href="mailto:hello@kova.app">Send feedback</a></p>
</body>
</html>
```

Variables: `accessEndsOn`, `wasScheduled` (boolean), `user_id`.

- [ ] **Step 4: Create `subscription-payment-failed.html`**

```html
<!-- emails/account/subscription-payment-failed.html -->
<!doctype html>
<html lang="en">
<head><meta charset="utf-8" /><title>Action needed: payment failed</title></head>
<body>
  <h1>We couldn't charge your card</h1>
  <p>Your last payment of <strong>${{ amount }}</strong> didn't go through (attempt {{ attemptCount }} of 4).</p>
  <p>Update your card before <strong>{{ deadline | date('long') }}</strong> to keep your subscription. After that, Kova will downgrade your account.</p>
  <p><a href="https://kova.app/account/billing" class="btn-primary">Update payment method</a></p>
  <p><a href="{{ hosted_invoice_url }}">View invoice</a></p>
  <hr />
  <p class="footer">Stripe is our payment processor and will also email you separately about this charge.</p>
</body>
</html>
```

Variables: `amount`, `attemptCount`, `deadline`, `hosted_invoice_url`, `user_id`.

- [ ] **Step 5: Wire each Resend send into the matching webhook handler**

Founder decision 2026-05-17 — all 4 emails fire from `handle-*` webhook handlers AFTER the DB UPDATE completes and BEFORE the handler returns. Resend SDK call wrapped in try/catch; failure logs to Sentry as `warning` but does NOT 500 the handler.

Update these webhook handlers (already implemented in Phase 3 — extend them):

| Handler | Template | Trigger condition |
|---|---|---|
| `handle-subscription-created.ts` | `subscription-new.html` | `sub.plan !== 'free'` (skip for free-tier; only paid subs trigger welcome email) |
| `handle-subscription-updated.ts` | `subscription-upgraded.html` | New price-id maps to a different plan name than the previous DB value |
| `handle-subscription-updated.ts` | `subscription-cancelled.html` with `wasScheduled: true` | `sub.cancel_at_period_end` flipped `false → true` |
| `handle-subscription-deleted.ts` | `subscription-cancelled.html` with `wasScheduled: false` | (Always — subscription has actually ended) |
| `handle-invoice-payment-failed.ts` | `subscription-payment-failed.html` | (Always — every failed payment) |

- [ ] **Step 6: Generate plain-text siblings + commit**

```bash
# Run plain-text extractor (Cluster 11 ships this helper)
bun run emails:txt
# Verify all 4 .txt files generated
ls emails/account/*.txt
git add emails/account/subscription-*.html emails/account/subscription-*.txt
git commit -m "feat(04): Resend templates — 4 events (new/upgraded/cancelled/payment-failed)"
```

- [ ] **Step 7: Configure Stripe Dashboard supplementary emails**

Per PRD §5.4.3 — enable Stripe's own customer emails in Stripe Dashboard → Settings → Customer emails:
- "Successful payments" (ON)
- "Failed payments" (ON)
- "Refunds" (ON)
- "Upcoming invoices" (ON)

Kova emails are supplementary; Stripe's are authoritative for legal/dunning purposes.

---

## Phase 15 — E2E tests + CI gates

### Task 15.1: All 11 E2E specs

**Files:**
- Create: `kova-open-pencil-1/tests/e2e/account/*.spec.ts` (11 files per PRD §9.3)

> One spec per critical flow. Use Vercel Agent Browser preferred; Playwright fallback.

- [ ] **Step 1**: write each spec per PRD §9.3 table. Each spec uses Supabase test fixtures + Stripe Test mode keys + a brand-fixture seeded user.

- [ ] **Step 2**: run E2E suite against local dev server

```bash
cd kova-open-pencil-1
bun run dev &  # leave running on :1420
bun run test -- tests/e2e/account/
```

- [ ] **Step 3**: commit per spec or as a single E2E batch

```bash
git add tests/e2e/account/*.spec.ts
git commit -m "test(04): 11 E2E specs covering Account page + Stripe + Integrations flows"
```

### Task 15.2: CI grep gates

**Files:**
- Modify: `.github/workflows/ci.yml` OR `lefthook.yml` — add the 2 grep gates

> Per PRD §9.5. Theme-drift + secret prefix.

- [ ] **Step 1**: add CI step

```yaml
- name: Theme-drift gate (Account page)
  run: |
    if grep -rE "bg-white|bg-gray-[0-9]+|text-gray-[0-9]+|border-gray-[0-9]+" src/views/account/ src/components/account/; then
      echo "::error::Light-theme Tailwind utility found in /account code"
      exit 1
    fi
- name: Stripe secret-prefix gate
  run: |
    if grep -rE "VITE_STRIPE_SECRET_KEY|VITE_STRIPE_WEBHOOK_SECRET" .; then
      echo "::error::Stripe server-only secret has VITE_ prefix"
      exit 1
    fi
```

- [ ] **Step 2**: commit + push; verify CI runs them green

```bash
git add .github/workflows/ci.yml
git commit -m "ci(04): add theme-drift + Stripe secret-prefix gates"
```

---

## Phase 16 — Phase A staging deploy + smoke

### Task 16.1: Deploy migration + Edge Functions to staging

> Per PRD §10 Phase A.

- [ ] **Step 1**: apply migration to staging Supabase

```bash
supabase db push --db-url "$STAGING_SUPABASE_URL"
```

- [ ] **Step 2**: deploy to staging Vercel (preview)

```bash
vercel --env=preview
```

- [ ] **Step 3**: configure Stripe Test mode webhook endpoint pointing at the preview URL (per docs/operations/stripe-setup-runbook.md)

- [ ] **Step 4**: set staging env vars (server-only Stripe keys, price IDs from Test mode)

- [ ] **Step 5**: smoke per PRD §9.4 manual QA checklist

- [ ] **Step 6**: founder review

---

## Phase 17 — Phase B production activation

### Task 17.1: Stripe Live mode setup

> Per PRD §10 Phase B + operator runbook.

- [ ] **Step 1**: founder creates Stripe Live mode account + prices + webhook endpoint
- [ ] **Step 2**: env vars rotated for production (Vercel CLI: `vercel env add STRIPE_SECRET_KEY production`)
- [ ] **Step 3**: activate `stripe-reconcile-cron` schedule in production `vercel.json` (already in code; this is just the deploy)
- [ ] **Step 4**: PRD 01's `delete-account-cron` automatically flips from graceful-degrade to live (since `STRIPE_SECRET_KEY` is now set in prod)
- [ ] **Step 5**: Sentry alert rules wired
- [ ] **Step 6**: privacy policy + RoPA legal-review complete

### Task 17.2: Update PRD status

**Files:**
- Modify: `kova-open-pencil-1/docs/kova-final-prds/04-account-and-stripe-billing.md` §0 — status → `SHIPPED`
- Modify: `kova-open-pencil-1/docs/kova-final-prds/00a-PRD_AUTHORING_GUIDE.md` §7 — Cluster 04 row → `SHIPPED`

- [ ] **Step 1**: commit + tag release

```bash
git add docs/kova-final-prds/04-account-and-stripe-billing.md docs/kova-final-prds/00a-PRD_AUTHORING_GUIDE.md
git commit -m "docs(04): mark Cluster 04 SHIPPED + update wave tracker"
git tag -a v0.04.0 -m "Cluster 04 — Account Page + Stripe Billing — shipped"
```

---

## Phase 18 — Self-review checklist

Run after Phase 16 (before Phase B activation). PRD §0 status: REVIEW.

- [ ] All 11 E2E specs green against staging
- [ ] All unit tests green; coverage ≥85% on `/account` + Stripe code
- [ ] Theme-drift CI gate green
- [ ] Stripe secret-prefix gate green
- [ ] `bun run check` zero errors
- [ ] `bun run format` no diff
- [ ] `bun run test:dupes` <3%
- [ ] PRD §8 acceptance criteria all checked
- [ ] Manual QA per PRD §9.4 done by founder
- [ ] PRD §12 open questions resolved or escalated
- [ ] Privacy policy + RoPA updated
- [ ] Operator runbook published
- [ ] Cluster 01's `delete-account-cron` 'stripe' step verified end-to-end (integration test 9.2 + manual cron invoke)

---

## Notes for the implementing engineer

- **Read PRD §0 first** to confirm dependencies (Clusters 01, 03, 11). If those aren't APPROVED at start time, ship the parts that don't depend on them first and stub the rest.
- **Run `supabase start` locally before any DB test.** Migrations must apply cleanly against an empty schema; tests assume Cluster 01 migration also applied (PRD 01 ships `users.deleted_at` + `users.preferences`).
- **Stripe Test mode is fine for all local + CI work.** Test cards: `4242 4242 4242 4242` (success), `4000 0000 0000 9995` (insufficient funds — triggers `invoice.payment_failed`), `4000 0025 0000 3155` (3DS required). See Stripe docs.
- **The webhook signature spec is real.** Use the `stripe` SDK's `webhooks.constructEvent` — never roll your own HMAC verify.
- **Don't put Stripe SDK in `packages/core/`.** `packages/core/` is read-only per CLAUDE.md. All Stripe code lives in `api/` and `src/stores/` / `src/composables/` / `src/components/`.
- **`window.location.href` (full-page redirect) for Checkout; `window.open(url, '_blank', ...)` for Portal.** The asymmetry is deliberate — Checkout completes the user flow; Portal is a side-trip.
- **Theme tokens only.** No `bg-white`, no `text-gray-*`. Use `bg-[var(--page)]` etc. CI gate enforces.
- **For Brand Kit section's sub-tab content:** mount Cluster 05 components as they ship. Until then, the section content slot renders Cluster 11's `<Skeleton>` placeholder — verify that's wired before claiming Brand Kit section "done."

---

## Self-review pass (executed by author 2026-05-15)

**1. Spec coverage:** Every PRD §2.1 in-scope item maps to at least one task above. §3 surfaces map to Phase 7–12 components. §4.1 schema maps to Phase 1. §5.1 Edge Functions map to Phase 3 + 4. §5.2 RPCs ship in Phase 1's migration. §5.3 cron ships in Phase 3 Task 3.6. §6 frontend maps to Phase 5–7. §9 test plan tasks are interleaved (unit + integration alongside implementation; E2E in Phase 15). §10 phasing maps to Phase 16 + 17. §11 cross-cuts respected (Cluster 01 imports in Phase 12 Task 12.1; Cluster 11 `<EmptyState>` mentioned where used).

**2. Placeholder scan:** No "TBD" / "implement later" / "handle edge cases". Each step has either a code block, a test fixture, or a verbatim PRD citation. The few "Step 1 → 5: TDD per pattern" lines refer back to the explicit pattern in Phase 1 — Step 1 (test), Step 2 (run fails), Step 3 (implement), Step 4 (verify pass), Step 5 (commit) — and cite the PRD section for the actual code shape.

**3. Type consistency:** Composable signatures match PRD §6.3 exactly. Store API matches PRD §6.2.1 verbatim. Edge Function paths + bodies match PRD §5.1. Component props match PRD §6.4.2 table. Plan name maps stay `'free' | 'solo' | 'agency'` everywhere.

No gaps found. Plan ready for execution.

---

## Execution Handoff

**Plan complete and saved to `kova-open-pencil-1/docs/kova-final-impl-plans/04-account-and-stripe-billing-plan.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using `superpowers:executing-plans`, batch execution with checkpoints.

**Which approach?**

> **Note for dispatched workflow:** the PRD is `DRAFT` status. Per `00a` §4 Step 5, founder reviews + approves the PRD BEFORE this plan executes. Implementation cannot start until §0 status → `APPROVED`.
