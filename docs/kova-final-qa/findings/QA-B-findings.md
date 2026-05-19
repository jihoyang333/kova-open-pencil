# QA-B — Implementation Plan Code + TDD Findings

**Auditor:** Claude Opus 4.7, 2026-05-18
**Corpus reviewed:** 12 implementation plans (`docs/kova-final-impl-plans/01-*` through `12-*`), ~38k lines total
**Working directory:** `/Users/jihoyang/kova-main/kova-open-pencil-1`

## Summary

| Severity | Count |
|---|---|
| CRITICAL | 15 |
| HIGH     | 20 |
| MEDIUM   | 18 |
| LOW      | 7  |
| NOTE (locked) | 3 |
| **Total** | **63** |

The corpus is *broadly TDD-disciplined* (RED→GREEN→COMMIT shape preserved in every plan). The bugs concentrate in three buckets:

1. **Cross-plan contract drift** — routing, profile shape, icon-component syntax, test framework all diverge between plans authored independently.
2. **Founder-lock violations widespread** — `!` non-null, `as any`, `e.key` vs `e.code`, `<Icon name="lucide:...">` (Nuxt component), `vi.mock` / `jest.mock` (wrong test API), `v-html` with no sanitizer. CLAUDE.md says "no `any`, no `!`" but Plan 03 alone has 49 `as any` plus 8 `process.env.X!`.
3. **Concrete code-block bugs** — Shopify revoke URL doesn't exist, in-memory rate-limit Map in serverless cold-starts, broken Promise inside template literal, missing `ref` import, hardcoded `'<from-jwt>'` literal, Vercel Function `config.api.bodyParser = false` (Next.js Pages-Router-only).

---

## Findings

### CRITICAL-1: Cross-plan routing inconsistency — `/brand/:brandId` vs `/dashboard?brandId=`
**Lens:** 16 — Cross-plan naming consistency
**Files:**
- `docs/kova-final-impl-plans/02-onboarding-and-dashboard-plan.md:1335,1343,1371` — defines `/brand/:brandId` + `/brand/:brandId/calendar` etc.
- `docs/kova-final-impl-plans/03-brand-management-plan.md:3060,3454` — pushes `router.push('/dashboard?brandId=${brandId}')`
- `docs/kova-final-impl-plans/06-canvas-editor-core-chrome-plan.md:101` — E2E spec asserts `/dashboard?brandId=...`

**Issue:** Plan 02 establishes the brand-scoped route as `/brand/:brandId` (path param). Plan 03's `BrandPickerView.onSelect` and `StepDone.enter` push `/dashboard?brandId=${brandId}` (query string). Plan 06's E2E spec expects `/dashboard?brandId=...`. These are mutually exclusive — Plan 02's route definition would 404 on Plan 03's push.

**Evidence:**
```ts
// Plan 02 L1335
test('/brand/:brandId exists with dark theme + requiresAuth + requiresOnboarding', () => {
  const route = router.resolve('/brand/abc-123')
// Plan 03 L3060
function onSelect(brandId: string): void {
  store.selectBrand(brandId)
  router.push(`/dashboard?brandId=${brandId}`)
}
// Plan 03 L3454
router.push(`/dashboard?brandId=${brand.value.id}`)
```

**Why CRITICAL:** Brand-selection navigation goes to a non-existent route. Every "open brand" + "wizard splash → enter workspace" flow lands on 404 unless one plan is changed. Founder-locked routing decision unclear in either plan.

**Recommended fix:** Decide one canonical pattern (Plan 02's `/brand/:brandId` is more RESTful) and rewrite Plan 03 callers:
```diff
- router.push(`/dashboard?brandId=${brandId}`)
+ router.push(`/brand/${brandId}`)
```

---

### CRITICAL-2: Plan 03 SECURITY DEFINER RPCs all missing `SET search_path`
**Lens:** 10 — Auth / RLS / security correctness
**File:** `docs/kova-final-impl-plans/03-brand-management-plan.md`
**Lines:** 448-488, 560-585, 674-693, 697-714, 809-848

**Issue:** Founder lock #15 (per QA-B dispatch prompt + CLAUDE.md): "SECURITY DEFINER functions have `SET search_path = 'public'`." Plan 03 defines 8 SECURITY DEFINER RPCs (`create_brand`, `rename_brand`, `archive_brand`, `restore_brand`, `delete_brand`, `list_active_brands`, `list_archived_brands`, plus one in another task) — **zero** of them include the `SET search_path` clause. Plan 01 (3/3 RPCs) and Plan 12 (1/1) do it correctly. Plan 03 and Plan 09 do not. Grep proof: `grep -c "SET search_path" 03-*.md` returns `0`.

**Evidence:**
```sql
-- L448-453
CREATE OR REPLACE FUNCTION public.create_brand(
  p_name        text,
  p_url         text DEFAULT NULL,
  p_description text DEFAULT NULL
) RETURNS public.brands
LANGUAGE plpgsql SECURITY DEFINER AS $$  -- ← no SET search_path
```

**Why CRITICAL:** `SECURITY DEFINER` without `SET search_path` is a known Postgres privilege-escalation vector — a malicious schema-prefix lookup can hijack the function. Supabase docs flag it as the #1 RPC mistake. This trips both compliance audits and any future supabase-lint pass.

**Recommended fix:** Add to every SECURITY DEFINER RPC in plans 03 + 09 (and verify plans 04 + 05 PRD-referenced SQL too):
```diff
 CREATE OR REPLACE FUNCTION public.create_brand(...)
 RETURNS public.brands
-LANGUAGE plpgsql SECURITY DEFINER AS $$
+LANGUAGE plpgsql SECURITY DEFINER
+SET search_path = public, pg_temp
+AS $$
```

(Matches Plan 01's working pattern at L278.)

---

### CRITICAL-3: Plan 03 uses `<Icon name="lucide:...">` everywhere — Nuxt component, not unplugin-icons
**Lens:** 1 + 16 — TS/Vue correctness + cross-plan consistency
**File:** `docs/kova-final-impl-plans/03-brand-management-plan.md`
**Lines:** 22 occurrences — L2283, L2306, L2313, L2879, L2899, L2944, L2961, L3104, L3128, L3132, L3135, L3231, L3245, L3247, L3306, L3325, L3328, L3376–3378, L3385, L3421, L3428, L3461, L3469

**Issue:** CLAUDE.md hard constraint: "unplugin-icons with Lucide (`<icon-lucide-*>`). No raw SVG or Unicode." Plan 03 uses `<Icon name="lucide:archive" />` syntax — that is Nuxt Icon (`nuxt-icon` or `@nuxt/icon`) syntax, not unplugin-icons. The `<Icon>` component is not registered in the project (Vue SPA, not Nuxt).

**Evidence:**
```vue
// L2306
<Icon :name="`lucide:${icon}`" class="h-3.5 w-3.5" />
// L2879
<Icon name="lucide:more-horizontal" class="h-3.5 w-3.5" />
```

**Why CRITICAL:** Every Plan 03 component fails to render — `<Icon>` is undefined, falls through to a `<icon>` HTML element (no-op). Every modal, picker, wizard, card across Plan 03 is broken.

**Recommended fix:** Mass-replace per CLAUDE.md tag-syntax convention:
```diff
- <Icon name="lucide:archive" class="h-3.5 w-3.5" />
+ <icon-lucide-archive class="h-3.5 w-3.5" />
- <Icon :name="`lucide:${icon}`" class="h-3 w-3" />
+ <component :is="`icon-lucide-${icon}`" class="h-3 w-3" />  // (see CRITICAL-4 — dynamic also broken)
```

For dynamic icons, prefer a static `v-if` switch OR static map import (see CRITICAL-4).

---

### CRITICAL-4: Dynamic `<component :is="`icon-lucide-${...}`">` — won't resolve via unplugin-icons
**Lens:** 1 + 16
**Files:**
- `docs/kova-final-impl-plans/02-onboarding-and-dashboard-plan.md:2153, 2508, 3617`
- `docs/kova-final-impl-plans/04-account-and-stripe-billing-plan.md:2332`

**Issue:** unplugin-icons resolves `<icon-lucide-foo>` at compile time via `unplugin-vue-components`. Dynamic strings via `<component :is>` are *not* resolved — the component registry has no entry until a static `<icon-lucide-foo>` tag is seen in some `.vue` file. The dynamic pattern silently renders nothing.

**Evidence:**
```vue
// Plan 02 L2153 (SideNav.vue)
<component :is="`icon-lucide-${item.icon}`" class="ic" />
// Plan 04 L2332 (AccountSidebar.vue)
<component :is="`icon-lucide-${item.icon}`" class="h-4 w-4" />
// Plan 02 L2508 (ComposerChips.vue)
<component :is="`icon-lucide-${p.icon}`" class="ic" />
// Plan 02 L3617 (ComingSoonView.vue)
<component :is="`icon-lucide-${spec.icon}`" class="w-5 h-5" />
```

**Why CRITICAL:** Every sidebar nav item, every composer chip, every coming-soon eyebrow icon renders blank. Visual regression baselines (Plan 02 §9.4 + Plan 04 §9.4) would catch this immediately.

**Recommended fix:** Pre-import the icon set as a static map and look up by key:
```ts
// constants/nav-icons.ts
import IconClock4 from '~icons/lucide/clock-4'
import IconCalendarDays from '~icons/lucide/calendar-days'
// ...
export const NAV_ICONS = { 'clock-4': IconClock4, 'calendar-days': IconCalendarDays, /* ... */ } as const
```

```diff
- <component :is="`icon-lucide-${item.icon}`" class="ic" />
+ <component :is="NAV_ICONS[item.icon]" class="ic" />
```

---

### CRITICAL-5: Plan 02 uses `jest.mock` in `bun:test` file
**Lens:** 4 — TDD discipline
**File:** `docs/kova-final-impl-plans/02-onboarding-and-dashboard-plan.md:3009`

**Issue:** Test file imports from `bun:test` (`import { describe, test, expect } from 'bun:test'`) but uses `jest.mock(...)` API. Jest is not installed in the project. `jest` is undefined → ReferenceError at runtime, test never runs.

**Evidence:**
```ts
// L3009 (OfflineIndicator.test.ts)
import { describe, test, expect } from 'bun:test'
import { ref } from 'vue'
import OfflineIndicator from '@/components/dashboard/OfflineIndicator.vue'

// Mock Cluster 11 useOfflineState
jest.mock('@/composables/use-offline-state', () => ({  // ← jest is undefined
  useOfflineState: () => ({ isOnline: ref(false) }),
}))
```

**Why CRITICAL:** Test is dead-on-arrival. RED phase passes (it errors) but for the wrong reason; GREEN never validates the component.

**Recommended fix:** Use bun:test `mock.module`:
```diff
-import { describe, test, expect } from 'bun:test'
+import { describe, test, expect, mock } from 'bun:test'
 
-jest.mock('@/composables/use-offline-state', () => ({
+mock.module('@/composables/use-offline-state', () => ({
   useOfflineState: () => ({ isOnline: ref(false) }),
 }))
```

---

### CRITICAL-6: Plan 03 uses `vi.mock` + `vi.fn` (Vitest) in `bun:test` file
**Lens:** 4
**File:** `docs/kova-final-impl-plans/03-brand-management-plan.md:1871-1872`

**Issue:** Same class of bug as CRITICAL-5 but Vitest flavor. `vi` is undefined in `bun:test`.

**Evidence:**
```ts
// L1871-1872 (brands.test.ts)
test('fetchArchivedBrands merges archived rows without duplicating active', async () => {
  const store = useBrandsStore()
  store.brands = [{ id: 'active1', name: 'A', archived_at: null } as Brand]
  vi.mock('@/lib/supabase', () => ({
    supabase: { rpc: vi.fn(async () => ({ data: [...], error: null })) }
  }))
```

**Recommended fix:**
```diff
-  vi.mock('@/lib/supabase', () => ({
-    supabase: { rpc: vi.fn(async () => ({ data: [{ id: 'arch1', name: 'X', archived_at: new Date().toISOString() }], error: null })) }
-  }))
+  mock.module('@/lib/supabase', () => ({
+    supabase: { rpc: mock(async () => ({ data: [{ id: 'arch1', name: 'X', archived_at: new Date().toISOString() }], error: null })) }
+  }))
```

---

### CRITICAL-7: Plan 01 — Shopify access-token revoke URL is not a real endpoint
**Lens:** 11 — GDPR cascade integrity
**File:** `docs/kova-final-impl-plans/01-auth-and-identity-plan.md:1280`

**Issue:** Plan 01's `api/cron/steps/shopify.ts` revokes tokens via `POST https://${shop}/admin/api/2024-01/access_tokens/${id}/revoke`. **No such endpoint exists** in the Shopify Admin API. The canonical revoke endpoint is `DELETE /admin/api_permissions/current.json` with `X-Shopify-Access-Token` header (revokes the *calling* token only). There is no way to revoke an arbitrary token by ID via REST.

**Evidence:**
```ts
// L1280
const url = `https://${brand.shopify_shop_domain}/admin/api/2024-01/access_tokens/${brand.shopify_access_token_id}/revoke`
try {
  const res = await fetch(url, { method: 'POST', ... })
```

**Why CRITICAL:** Every deletion-cascade Shopify step returns 404 (treated as "already revoked" by the plan's 401/404-as-success logic), so tokens are never actually revoked. GDPR + the privacy policy (Plan 01 Task 22 RoPA) claim Shopify tokens are revoked on account deletion — false claim.

**Recommended fix:** Per-shop, must call the revoke endpoint with that shop's own token to revoke itself:
```ts
const url = `https://${brand.shopify_shop_domain}/admin/api_permissions/current.json`
const res = await fetch(url, {
  method: 'DELETE',
  headers: {
    'X-Shopify-Access-Token': resolveTokenForBrand(brand.id),  // requires keeping token reachable until step runs
    'Content-Type': 'application/json',
  },
})
// 200 OK = revoked; 401 = already revoked = OK.
```

This implies the token must remain stored (or accessible from Supabase Vault) until the cron step runs, which conflicts with Plan 03's `shopify_access_token_id = null` on archive — verify ordering: revoke must happen *before* token-row is nulled.

---

### CRITICAL-8: Plan 01 — in-memory rate-limit Map in serverless Edge Function
**Lens:** 1 — Race conditions / state hygiene
**File:** `docs/kova-final-impl-plans/01-auth-and-identity-plan.md:715-727`

**Issue:** `api/account/deletion-request.ts` defines `rateLimitMap = new Map<string, ...>()` at module scope. Vercel Functions are serverless — every cold-start invocation gets a fresh module, every warm-start may or may not reuse it depending on the platform's container reuse. The rate-limit only works *per-instance* — under any real load, an attacker hitting different cold instances bypasses the cap entirely.

**Evidence:**
```ts
// L715-727
const rateLimitMap = new Map<string, { count: number; windowStart: number }>()

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(userId)
  // ...
}
```

**Why CRITICAL:** Plan's own test at L684-697 fires 6 sequential requests in the same process expecting 429 on the 6th. In production those requests hit 6 different containers and all succeed. PRD claims "5 req/min/user" but Edge Function delivers no real limit.

**Recommended fix:** Use durable storage. Supabase Postgres pattern:
```ts
// Use atomic INSERT on a small rate_limits table or Upstash Redis;
// e.g. INSERT INTO rate_limits (user_id, endpoint, window_start, count)
// VALUES ($1, $2, date_trunc('minute', now()), 1)
// ON CONFLICT (user_id, endpoint, window_start) DO UPDATE
//   SET count = rate_limits.count + 1
// RETURNING count;
// then if count > 5 → 429.
```

Or use Vercel KV / Upstash Redis with `INCR` + `EXPIRE`. Note founder defer pattern: this needs to ship for security regardless; cannot stub.

---

### CRITICAL-9: Plan 03 hard-coded `'<from-jwt>'` placeholder string in production code
**Lens:** 1 + 7 — Magic strings + correctness
**File:** `docs/kova-final-impl-plans/03-brand-management-plan.md:1516`

**Issue:** `api/brands/delete.ts` passes literal `'<from-jwt>'` to `purgeBrandStorageObjects` as `userId`. This is clearly a placeholder the plan author forgot to wire to actual `auth.userId`.

**Evidence:**
```ts
// L1502-1516
const { data, error } = await supabase.rpc('delete_brand', { ... })
if (error) { ... }

// Sweep is best-effort — log failures, don't fail the request (brand already gone via FK cascade).
const sweep = await purgeBrandStorageObjects(supabase, brandId, '<from-jwt>')  // ← literal placeholder
```

**Why CRITICAL:** Storage sweep's audit-log path reports user as the literal `"<from-jwt>"`. Worse, if downstream code uses this as an RLS key, it'll match nothing (or with permissive RLS, match everything).

**Recommended fix:**
```diff
+const { data: { user } } = await supabase.auth.getUser(auth.replace('Bearer ', ''))
+if (!user) { res.status(401).json({ error: 'invalid_token' }); return }
 ...
-const sweep = await purgeBrandStorageObjects(supabase, brandId, '<from-jwt>')
+const sweep = await purgeBrandStorageObjects(supabase, brandId, user.id)
```

---

### CRITICAL-10: Plan 02 broken Promise inside template literal
**Lens:** 1 — TS/Vue correctness
**File:** `docs/kova-final-impl-plans/02-onboarding-and-dashboard-plan.md:3605`

**Issue:** ComingSoonView's notify-me fetch sets the `Authorization` header to a template literal that contains an unawaited Promise expression `(await import).then(...)`. The `.then(...)` returns a Promise, but it is concatenated as a string and stringifies to `[object Promise]`.

**Evidence:**
```ts
// L3603-3607
await fetch('/api/marketing/notify-me', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json',
    Authorization: `Bearer ${(await import('@/lib/supabase')).supabase.auth.getSession().then(r => r.data.session?.access_token)}` },
  body: JSON.stringify({ email: auth.profile.email, surface: props.kind }),
})
```

**Why CRITICAL:** Header value becomes `"Bearer [object Promise]"` — server-side `verifyAuth` rejects every notify-me request as 401. Plan's own self-review at L3860 flags this — but flagging is not fixing.

**Recommended fix:**
```diff
-const r3 = await fetch('/api/marketing/notify-me', {
-  method: 'POST',
-  headers: { 'Content-Type': 'application/json',
-    Authorization: `Bearer ${(await import('@/lib/supabase')).supabase.auth.getSession().then(r => r.data.session?.access_token)}` },
-  body: JSON.stringify({ email: auth.profile.email, surface: props.kind }),
-})
+const { supabase } = await import('@/lib/supabase')
+const { data } = await supabase.auth.getSession()
+await fetch('/api/marketing/notify-me', {
+  method: 'POST',
+  headers: {
+    'Content-Type': 'application/json',
+    Authorization: `Bearer ${data.session?.access_token ?? ''}`,
+  },
+  body: JSON.stringify({ email: auth.user?.email, surface: props.kind }),
+})
```

(Also: `auth.profile.email` doesn't exist — see HIGH-4 below.)

---

### CRITICAL-11: Plan 02 RecentsView reads `sortMode` from wrong store
**Lens:** 16 — Cross-plan / cross-file naming consistency
**File:** `docs/kova-final-impl-plans/02-onboarding-and-dashboard-plan.md:3283`

**Issue:** RecentsView pulls `sortMode` from `useCanvasesStore` but Plan 02 Task T06 puts `sortMode` on `useDashboardStore`.

**Evidence:**
```ts
// L3283
<SortDropdown :model-value="(canvasesStore as any).sortMode ?? 'recent'" @update:model-value="grid.setSort" />
// Plan 02 T06 (L727) — sortMode lives on dashboard store
const store = useDashboardStore()
store.sortMode = 'name'
```

**Why CRITICAL:** SortDropdown stays at default 'recent' regardless of dashboard store state; `setSort` writes to the right store but reads from the wrong one. Sort silently no-ops. The `as any` cast hides the type error.

**Recommended fix:**
```diff
-<SortDropdown :model-value="(canvasesStore as any).sortMode ?? 'recent'" @update:model-value="grid.setSort" />
+<SortDropdown :model-value="useDashboardStore().sortMode" @update:model-value="grid.setSort" />
```

---

### CRITICAL-12: Plan 04 Stripe webhook — Next.js Pages-Router `config` in standalone Vercel Function
**Lens:** 17 — Bun / framework gotchas
**File:** `docs/kova-final-impl-plans/04-account-and-stripe-billing-plan.md:1251,1313-1317`

**Issue:** `api/stripe/webhook.ts` exports `export const config = { api: { bodyParser: false } }` — this is Next.js Pages Router API-route syntax. Kova is a Vite SPA with **standalone Vercel Functions** (per `kova-open-pencil-1/api/*`). The `config` export is ignored by Vercel's standalone-function runtime. Vercel auto-parses JSON bodies before your handler sees them, so `req.on('data')` fires nothing.

**Evidence:**
```ts
// L1251
export const config = { api: { bodyParser: false } }  // Vercel: read raw body — WRONG for standalone Vercel Functions
// L1313-1317 (default export)
const rawBody = await new Promise<string>(resolve => {
  let data = ''
  req.on('data', chunk => data += chunk)  // stream already drained by Vercel parser
  req.on('end', () => resolve(data))
})
```

**Why CRITICAL:** `stripe.webhooks.constructEvent(rawBody, sig, secret)` requires the *raw* request body (HMAC over the bytes). With JSON-parsed body, the signature never validates → every legitimate Stripe webhook is rejected as `invalid_signature`. Plan's own test at L1192 hard-codes `rawBody` directly so the test passes, but production traffic fails 100% of webhooks.

**Recommended fix:** For standalone Vercel Functions, opt out of body parsing via the request handler and read directly:
```ts
import { Buffer } from 'node:buffer'

export default async function (req: VercelRequest, res: VercelResponse): Promise<void> {
  // Vercel does NOT auto-parse if Content-Type is not application/json AND no req.body access happens.
  // Safer: use the `micro` raw-body reader or convert to Buffer manually.
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  const rawBody = Buffer.concat(chunks).toString('utf8')
  // ... rest of handler ...
}
```

Or use the `micro` package's `buffer(req)` helper. Validate against an actual Stripe test webhook before claiming green.

---

### CRITICAL-13: Plan 09 broken `signInAs` test helper
**Lens:** 4 — TDD discipline (tests rely on broken seed)
**File:** `docs/kova-final-impl-plans/09-version-history-and-trash-plan.md:355-364`

**Issue:** Helper claims to sign in as a user but uses `data.properties?.action_link` (a magic-link URL) as a Bearer token. Magic-link URLs are not JWTs. Supabase REST treats the header as an invalid token → all SECURITY DEFINER RPC calls in Plan 09 tests run as anon, fail `auth.uid() IS NOT NULL` checks.

**Evidence:**
```ts
// L355-364
export async function signInAs(userId: string) {
  const { data } = await admin.auth.admin.generateLink({ type: 'magiclink', email: `mock-${userId}@local` })
  // ...
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${data.properties?.action_link}` } }  // ← not a JWT
  })
}
```

**Why CRITICAL:** Plan 09 ships ~14 integration tests against this helper; all are dead-on-arrival. Plan author even notes "Intent: returned client has auth.uid() = userId" — intent ≠ implementation. RED phase passes but for wrong reason; GREEN never validates.

**Recommended fix:** Generate a real JWT via supabase service role + mint a session, or `signInWithPassword` with a known password. Easiest:
```ts
export async function signInAs(userId: string) {
  const { data: u } = await admin.auth.admin.getUserById(userId)
  if (!u.user?.email) throw new Error('no email for test user')
  // Reset password to known value then sign in
  await admin.auth.admin.updateUserById(userId, { password: 'test-pw-123' })
  const client = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!)
  const { error } = await client.auth.signInWithPassword({ email: u.user.email, password: 'test-pw-123' })
  if (error) throw error
  return client
}
```

---

### CRITICAL-14: Plan 03 `v-html` without sanitization in `<InfoCard>` bullets
**Lens:** 1 — XSS hazard
**File:** `docs/kova-final-impl-plans/03-brand-management-plan.md:2313`

**Issue:** `InfoCard.vue` renders bullet HTML via `v-html` and the bullet content is fed from caller-passed prop arrays. Plan 03 L2560 calls it with prop:
```vue
<InfoCard ... :bullets="[
  'Hidden from the sidebar brand-switcher and brand picker',
  'All canvases, snapshots, brand-kit data &amp; integrations are kept',
  'Shopify connection stays connected — no re-auth on restore',
  'Restore any time from <span class=&quot;opacity-50&quot;>Settings → Archive</span> (Phase 2)',
]" />
```

While today's strings are constant, the `v-html` pattern invites callers to inject user-controlled or AI-generated strings later (brand names, voice descriptions, KB labels), which is XSS-capable.

**Evidence:**
```vue
// L2310-2314
<div v-for="b in bullets" :key="b" class="flex items-start gap-1.5 text-[12px] leading-relaxed text-[var(--ink-2)]">
  <span class="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--ink-3)]"></span>
  <span v-html="b"></span>  <!-- ← XSS hazard if `b` ever sources user input -->
</div>
```

**Why CRITICAL:** OWASP top-10 XSS. CLAUDE.md security guidelines flag XSS as mandatory pre-commit check.

**Recommended fix:** Two options. (a) Switch to `{{ b }}` text interpolation + render the `<span class="opacity-50">` markers via per-bullet props/slots; (b) sanitize with `DOMPurify` if HTML is genuinely needed:
```vue
<script setup>
import DOMPurify from 'isomorphic-dompurify'
const sanitize = (s: string) => DOMPurify.sanitize(s, { ALLOWED_TAGS: ['span'], ALLOWED_ATTR: ['class'] })
</script>
<template>
  <span v-html="sanitize(b)"></span>
</template>
```

Same issue lives in Plan 11 L2315 `<h5 v-html="renderHeadline()" />` — verify `renderHeadline` only sources constant copy, otherwise sanitize.

---

### CRITICAL-15: Plan 04 store `planStatus` union missing `'trialing'` despite founder lock
**Lens:** 1 + 15 — Type correctness + naming consistency within plan
**File:** `docs/kova-final-impl-plans/04-account-and-stripe-billing-plan.md:1882-1883`

**Issue:** Plan 04 explicitly notes founder decision 2026-05-17: `plan_status` CHECK constraint adds `'trialing'`. Migration test at L203-212 asserts all 5 values accepted by DB. Webhook handler at L1083 writes `plan_status: sub.status` raw (Stripe's `trialing` flows through). But the store at L1882-1883 types `planStatus` as `'active'|'past_due'|'cancelled'|'incomplete'` — **no `'trialing'`**. When webhook writes 'trialing' and store loads from user row, the runtime value is `'trialing'` but TypeScript thinks it's not. `<PlanCard>`'s status-pill mapping for 5 variants (L2487) fails compile or runtime.

**Evidence:**
```ts
// L1882-1883 (useBillingStore)
const plan = ref<'free' | 'solo' | 'agency'>('free')
const planStatus = ref<'active' | 'past_due' | 'cancelled' | 'incomplete'>('active')
// L2489 (TrialBanner contract)
<TrialBanner> ... Renders ONLY when `useBillingStore.planStatus === 'trialing'`
```

**Why CRITICAL:** Type mismatch + the documented `<TrialBanner>` (Plan 04 Task 9.1) can never satisfy its `planStatus === 'trialing'` predicate against the typed store.

**Recommended fix:**
```diff
-const planStatus = ref<'active' | 'past_due' | 'cancelled' | 'incomplete'>('active')
+const planStatus = ref<'active' | 'past_due' | 'cancelled' | 'incomplete' | 'trialing'>('active')
```

(And update the `PlanInfo` / status-pill type union accordingly.)

---

### HIGH-1: `process.env.X!` non-null assertions widespread (founder lock #10 violation)
**Lens:** 1 — TS strictness
**Files:** Plans 02, 03, 04, 09 — 24 occurrences

**Issue:** CLAUDE.md / founder lock: "No `any` types. No `!` non-null assertions." Plan code uses `process.env.SUPABASE_URL!` etc. throughout Edge Functions and integration tests.

**Evidence (sample):**
```ts
// Plan 02 L146-147
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
// Plan 03 L1190-1191, L1294-1295, L1389-1390, L1497-1498 (4× in Edge Functions)
// Plan 04 L168-169, L243-244, L1273 (STRIPE_WEBHOOK_SECRET!)
// Plan 09 L88-89, L233-234, L263, L331, L361, L2346, L2347, L2470, L2471, L2472
```

**Why HIGH:** Hides config errors. A missing env var crashes deep in Postgres-JS instead of at startup with a clear message.

**Recommended fix:** Centralize via a `requireEnv` helper in `api/_shared/env.ts`:
```ts
export function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing required env var: ${name}`)
  return v
}
```
Replace every `process.env.X!` with `requireEnv('X')`.

---

### HIGH-2: `as any` casts pervasive (founder lock #10 violation)
**Lens:** 1
**Files:** Plan 03 (49), Plan 06 (41), Plan 02 (29), Plan 04 (29), Plan 01 (22), Plan 07b (17), Plan 09 (13), Plan 05 (13), Plan 10 (1)

**Issue:** CLAUDE.md / founder lock: "No `any`". `as any` is the same bypass. Plan 03 tops the chart with 49 casts — many in production code, not just tests.

**Evidence (representative):**
```ts
// Plan 03 L1407 (production)
.eq('user_id', (data as any).user_id)
// Plan 03 L2210 + dozens more — test mocks
// Plan 06 L1079, L1356 etc.
```

**Why HIGH:** Founder-locked policy. Each `as any` is a missed type bug.

**Recommended fix:** Per-plan refactor pass. For tests, prefer typed mock builders. For Edge Function `req.body`, valibot-parse first:
```ts
import * as v from 'valibot'
const Body = v.object({ brand_id: v.string(), name: v.string() })
const parsed = v.safeParse(Body, req.body)
if (!parsed.success) { res.status(422).json({ error: 'invalid_body' }); return }
const { brand_id, name } = parsed.output  // strongly typed
```

---

### HIGH-3: Plan 03 RenameBrandModal uses `e.key` instead of `e.code` (founder lock #9)
**Lens:** 1 + founder lock
**File:** `docs/kova-final-impl-plans/03-brand-management-plan.md:2417-2418`

**Issue:** Founder lock: "`e.code` not `e.key` for keyboard shortcuts (Option key transforms characters on Mac)." RenameBrandModal `onKeyDown` reads `e.key === 'Enter'` and `e.key === 'Escape'`.

**Evidence:**
```ts
// L2417-2418
function onKeyDown(e: KeyboardEvent): void {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') onSave()
  if (e.key === 'Escape') emit('update:open', false)
}
```

**Why HIGH:** Direct founder-lock violation. While Enter/Escape have the same key/code, the rule is "always use code" — Plan 08 §2.6.6 even enforces a grep audit for `e.key`. This will fail that audit.

**Recommended fix:**
```diff
-  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') onSave()
-  if (e.key === 'Escape') emit('update:open', false)
+  if ((e.metaKey || e.ctrlKey) && e.code === 'Enter') onSave()
+  if (e.code === 'Escape') emit('update:open', false)
```

---

### HIGH-4: Cross-plan profile shape — `auth.profile.email` doesn't exist
**Lens:** 16 — Cross-plan naming consistency
**Files:**
- `docs/kova-final-impl-plans/01-auth-and-identity-plan.md:1923-1928` — defines `UserProfile` interface as `{ name, onboarded, plan, deleted_at }` (no email)
- `docs/kova-final-impl-plans/02-onboarding-and-dashboard-plan.md:1007,2194,2202,2210,2244,3601,3606` — reads `auth.profile?.email`
- `docs/kova-final-impl-plans/04-account-and-stripe-billing-plan.md:1899` — assumes `user.email` shape too

**Issue:** Plan 01's `UserProfile` interface (loaded from `public.users` table) does NOT include `email` — Supabase keeps email on `auth.users`, exposed via `user.email`, not `profile.email`. Plans 02 + 04 read `auth.profile.email` repeatedly. Returns undefined.

**Evidence:**
```ts
// Plan 01 L1923-1928
interface UserProfile {
  name: string | null
  onboarded: boolean
  plan: string
  deleted_at: string | null
}
// Plan 02 L1007 (useGreeting fallback)
return `${phase}, ${firstName}` // firstName derived from auth.profile?.email?.split('@')[0]
// Plan 02 L2244 (SideFooter)
<b>{{ auth.profile?.name ?? auth.profile?.email }}</b>
// Plan 02 L3601 + L3606 (ComingSoonView notify-me)
if (!auth.profile?.email) return
body: JSON.stringify({ email: auth.profile.email, surface: props.kind })
```

**Why HIGH:** SideFooter shows "undefined" for users with no name. Greeting falls back to `'there'` (string after `??`). Notify-me sends `{email: undefined}` JSON.

**Recommended fix:** Either (a) extend Plan 01 UserProfile + the SELECT in `fetchProfile` to include email, or (b) use `auth.user?.email` (Supabase User type carries email):
```diff
-<b>{{ auth.profile?.name ?? auth.profile?.email }}</b>
+<b>{{ auth.profile?.name ?? auth.user?.email }}</b>
```

---

### HIGH-5: Plan 01 — Stripe SDK `customers.del` idempotencyKey passed in wrong argument slot
**Lens:** 9 — Stripe + payments correctness
**File:** `docs/kova-final-impl-plans/01-auth-and-identity-plan.md:1163-1164`

**Issue:** Stripe Node SDK signature is `customers.del(id, params?, options?)` where `idempotencyKey` belongs in *options* (third arg). Plan 01 passes `{ idempotencyKey }` as the second arg with `as any` cast, which Stripe treats as `params` — silently ignored.

**Evidence:**
```ts
// L1163
if (user.stripe_customer_id) {
  await stripe.customers.del(user.stripe_customer_id, { idempotencyKey: `${idempotencyKey}:cus-del` } as any)
}
```

**Why HIGH:** Customer deletion is not idempotent. Re-runs of the cron retry-attempt may double-attempt or fail in weird ways. Plus the `as any` masks the signature mismatch.

**Recommended fix:**
```diff
-await stripe.customers.del(user.stripe_customer_id, { idempotencyKey: `${idempotencyKey}:cus-del` } as any)
+await stripe.customers.del(user.stripe_customer_id, undefined, { idempotencyKey: `${idempotencyKey}:cus-del` })
```

(Same pattern as `subscriptions.cancel` at L1159, which Plan 01 gets right.)

---

### HIGH-6: Plan 02 BrandSwitcher.vue missing `ref` import
**Lens:** 1 — TS/Vue correctness
**File:** `docs/kova-final-impl-plans/02-onboarding-and-dashboard-plan.md:1934-1943`

**Issue:** Component template uses `const searchQuery = ref('')` but `<script setup>` does not import `ref` from `vue`. TS strict compile would fail.

**Evidence:**
```vue
// L1934-1944
<script setup lang="ts">
import { useRouter } from 'vue-router'
import BrandSwitcher from './BrandSwitcher.vue'
import SideNav from './SideNav.vue'
import SideFooter from './SideFooter.vue'
import type { Brand } from '@/types/kova/database'

const router = useRouter()
defineProps<{ currentBrand: Brand }>()
const searchQuery = ref('')   // ← `ref` not imported
</script>
```

**Why HIGH:** `bun run check` fails with `Cannot find name 'ref'`.

**Recommended fix:**
```diff
-import { useRouter } from 'vue-router'
+import { ref } from 'vue'
+import { useRouter } from 'vue-router'
```

---

### HIGH-7: Plan 05 + 06 use UnoCSS/iconify class-strings `i-lucide-foo`
**Lens:** 16 — Cross-plan icon convention
**Files:**
- `docs/kova-final-impl-plans/05-brand-kit-and-drag-drop-plan.md:2230-2236, 2253`
- `docs/kova-final-impl-plans/06-canvas-editor-core-chrome-plan.md:500-502`

**Issue:** Plans 05 + 06 pass icon names as strings like `'i-lucide-palette'` and bind via `<component :is="item.icon" />` or class. unplugin-icons supports two patterns: (a) the *component* form `<icon-lucide-palette />` (CLAUDE.md prescribed), or (b) the iconify-on-the-fly class form `class="i-lucide-palette"` (requires UnoCSS preset + Tailwind plugin coordination). Plan does not establish a UnoCSS preset anywhere. Tailwind 4 (the project's choice) does not bundle iconify.

**Evidence:**
```vue
// Plan 05 L2230 (BrandKitSubNav.vue)
{ key: 'visuals', label: 'Visuals', icon: 'i-lucide-palette', count: null },
// L2253
<component :is="item.icon" class="ic w-[13px] h-[13px] opacity-80" />
// Plan 06 L500
const move: ToolDef = { id: 'move', slot: 'move', icon: 'i-lucide-mouse-pointer-2', ... }
```

**Why HIGH:** `<component :is="'i-lucide-palette'">` resolves to a component named that string, which doesn't exist. Render fails. Same root issue as CRITICAL-4 but via a different syntax error.

**Recommended fix:** Standardize on the tag form per CLAUDE.md + use the static-map lookup from CRITICAL-4. Or, if class-form is intentional, document the UnoCSS dependency + preset wiring in Plan 11 first.

---

### HIGH-8: Plan 02 Test mock pattern relies on `vi`-style API surface (`mockClear`, `mockImplementationOnce`)
**Lens:** 4 — TDD discipline
**File:** `docs/kova-final-impl-plans/02-onboarding-and-dashboard-plan.md` (multiple), and similar in plans 01, 03, 04

**Issue:** `bun:test` `mock()` returns a callable spy but does NOT support `mockClear()` / `mockImplementationOnce()` the same way Vitest does. Some patterns work (e.g. `.mock.calls`), but `mockImplementationOnce` does not exist on bun mocks. Plans 01-04 use it freely.

**Evidence (sample):**
```ts
// Plan 01 L668-670
mockSupabase.rpc.mockImplementationOnce(() => ...)
// Plan 04 L2374
confirmDraftMock.mockClear()
// Plan 04 L1198
mockStripe.webhooks.constructEvent = mock(() => { throw new Error('...') })
```

`bun:test`'s mock spec supports `mockImplementation` (replace permanently) but `mockImplementationOnce` is a Jest-ism. Verify against bun:test docs and either substitute or wrap.

**Why HIGH:** Multiple tests fail at runtime with `TypeError: ... is not a function`.

**Recommended fix:** Replace with bun:test's `.mockImplementation(...)` and reset between tests via `mock.restore()`:
```diff
-mockSupabase.rpc.mockImplementationOnce(() => Promise.resolve({ data: null, error: { message: 'Already pending', code: 'P0001' } }))
+const errOnce = mock(() => Promise.resolve({ data: null, error: { message: 'Already pending', code: 'P0001' } }))
+mockSupabase.rpc = errOnce  // override for one test
+// reset in beforeEach
```

(Or pin Vitest as the test runner explicitly — but Plan 01 §Tech Stack declares bun:test, so the runners must match.)

---

### HIGH-9: Plan 04 webhook handler reads `req.headers.get(...)` on Vercel `req`
**Lens:** 1 + 17
**File:** `docs/kova-final-impl-plans/04-account-and-stripe-billing-plan.md:1268,1318`

**Issue:** VercelRequest is a Node IncomingMessage, not Fetch Request. `req.headers` is a plain object (`Record<string, string|string[]>`), NOT a `Headers` instance — it has no `.get()` method. The webhook handler test mocks the Fetch `Request` shape (`req.headers.get('stripe-signature')`), but the default export coerces `req.headers as any` — production code reads `headers['stripe-signature']` if it's a plain object.

**Evidence:**
```ts
// L1268 (handler param)
const sig = req.headers['stripe-signature']  // OK for VercelRequest
// L1318 (default export)
const result = await handler({ method: req.method ?? '', headers: req.headers as any, rawBody },
                              { stripe: getStripeClient(), supabase: getServiceSupabase() })
```

While the `as any` masks it, the handler then reads `req.headers['stripe-signature']` which is fine for the Node path. But the handler unit test passes a `Request`-shaped headers object via `{ 'stripe-signature': 'sig' }` and uses bracket access — that works. The inconsistency is minor but `as any` hides whether real Vercel headers (lowercased, possibly array-valued) round-trip correctly.

**Why HIGH:** Production headers may arrive as `string | string[]`. `constructEvent(rawBody, headerValue, secret)` expects a string. If Vercel ever sends multi-value (e.g. CDN-injected), the cast fails silently → `invalid_signature`.

**Recommended fix:**
```ts
const sigHeader = req.headers['stripe-signature']
const sig = Array.isArray(sigHeader) ? sigHeader[0] : sigHeader
if (!sig) return { status: 400, body: { error: 'missing_signature' } }
```

---

### HIGH-10: Plan 03 — `pg_indexes` via Supabase REST client won't work
**Lens:** 2 + 8 — SQL + env hygiene
**File:** `docs/kova-final-impl-plans/03-brand-management-plan.md:273-279`

**Issue:** Test queries `from('pg_indexes' as any).select('indexname')` — `pg_indexes` is in `pg_catalog` schema. Supabase's PostgREST exposes only the `public` schema by default. The query returns 404 or empty.

**Evidence:**
```ts
// L273-279
const { data } = await supabase
  .from('pg_indexes' as any)
  .select('indexname')
  .eq('tablename', 'brands')
const names = (data ?? []).map((r: any) => r.indexname)
expect(names).toContain('idx_brands_active_per_user')
```

**Why HIGH:** Test passes vacuously (empty `data`, expectation fails OR runs against `as any` and silently yields zero rows).

**Recommended fix:** Use the same `pg_indexes_by_name` helper RPC pattern Plan 02 used at L213:
```sql
CREATE OR REPLACE FUNCTION pg_indexes_by_name(idx_name text)
RETURNS TABLE (indexname text, indexdef text)
LANGUAGE sql STABLE AS $$
  SELECT indexname::text, indexdef::text FROM pg_indexes WHERE indexname = idx_name
$$;
```
Then call via `.rpc('pg_indexes_by_name', { idx_name: 'idx_brands_active_per_user' })`.

---

### HIGH-11: Plan 03 backfill — `WHERE color = 'coral'` randomization is fragile
**Lens:** 2 — Migration correctness
**File:** `docs/kova-final-impl-plans/03-brand-management-plan.md:352-356`

**Issue:** Backfill assumes any row with `color = 'coral'` is the *default* and needs randomization. But `'coral'` is also a valid user choice (and the new `create_brand` RPC sets it for users whose `count(*) % 5 == 0`). Re-running migration (e.g. partial recovery) would re-randomize all `'coral'` rows including intentional ones.

**Evidence:**
```sql
-- L352-356
UPDATE public.brands
SET color = (ARRAY['coral','violet','sage','sand','graphite'])[
              (abs(hashtext(id::text)) % 5) + 1
            ]
WHERE color = 'coral';
```

**Why HIGH:** Backfill is not idempotent. Founder lock requires backfill SQL to be re-runnable safely.

**Recommended fix:** Use a "set once" marker, e.g. only update rows where `color = 'coral'` AND `created_at < migration_timestamp`, or add a `color_assigned_at` column:
```sql
-- One option: drop the WHERE to backfill ALL, but only if `color_assigned_at IS NULL`:
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS color_assigned_at timestamptz;

UPDATE public.brands
SET color = (ARRAY['coral','violet','sage','sand','graphite'])[(abs(hashtext(id::text)) % 5) + 1],
    color_assigned_at = now()
WHERE color_assigned_at IS NULL;
```

---

### HIGH-12: Plan 04 default export wraps `req.headers as any`
**Lens:** 1 + 10 — Type-bypass on the auth boundary
**File:** `docs/kova-final-impl-plans/04-account-and-stripe-billing-plan.md:901, 1008`

**Issue:** `default export` passes `req.headers as any` to the handler. The handler's typed signature expects `Record<string, string|undefined>`, but Vercel emits `Record<string, string | string[] | undefined>`. Multi-value headers (e.g. duplicate `Cookie`) get a string[] which the handler treats as string.

**Recommended fix:** Type-narrow the auth header explicitly:
```ts
const authHeader = req.headers.authorization
const auth = Array.isArray(authHeader) ? authHeader[0] : authHeader
```

---

### HIGH-13: Plan 04 + Plan 12 — Resend env-guard pattern lacks Sentry breadcrumb for skipped sends
**Lens:** 8 + 14
**Files:**
- `docs/kova-final-impl-plans/11-shared-ui-infrastructure-plan.md:578,635-639`
- `docs/kova-final-impl-plans/12-settings-and-user-preferences-plan.md:2049,2106`

**Issue:** When `RESEND_API_KEY` is unset, helper returns `{ skipped: 'no_api_key' }`. No Sentry breadcrumb is added. In production, an accidentally-unset Resend secret would cause silent email-loss with no observable signal.

**Recommended fix:** Add a `captureMessage` (not exception, to avoid noise) at warning level:
```ts
if (!apiKey) {
  console.warn('[resend] RESEND_API_KEY missing — email send skipped (stub mode):', payload.to, payload.subject)
  if (process.env.SENTRY_DSN_SERVER) captureMessage('resend_skipped_no_api_key', 'warning')
  return { id: 'stub-id-no-api-key', skipped: 'no_api_key' }
}
```

(Stub-mode guards remain compatible; Sentry call is no-op until Phase B per founder lock #14.)

---

### HIGH-14: Plan 02 — useFileGrid `dash.searchQuery = q` is direct mutation, not optimistic immutable write
**Lens:** 1
**File:** `docs/kova-final-impl-plans/02-onboarding-and-dashboard-plan.md:1139`

**Issue:** Plan author's debounce path mutates the store state directly via assignment instead of going through a store action. While this works (Pinia reactivity catches the assignment), it bypasses any future side-effects an action might add.

**Recommended fix:** Add a `setSearchQuery` action to useDashboardStore and call it. Minor — flagged for consistency with the rest of the plan that uses actions.

---

### HIGH-15: Plan 01 audit log table — `if (logErr && !logErr.message.includes('does not exist'))` string-matching
**Lens:** 1 — Fragile error handling
**File:** `docs/kova-final-impl-plans/01-auth-and-identity-plan.md:1392`

**Issue:** Anthropic cron step soft-fails the audit-log insert by matching `error.message.includes('does not exist')`. PostgresREST messages are localized + version-dependent. Brittle.

**Evidence:**
```ts
// L1392
if (logErr && !logErr.message.includes('does not exist')) {
  return { ok: false, retriable: true, error: logErr.message }
}
```

**Why HIGH:** A library upgrade could change wording → cron starts failing with retriable errors that should be soft-skipped (or vice versa).

**Recommended fix:** Match on `code` (Postgres SQLSTATE) instead. The "relation does not exist" code is `42P01`:
```ts
if (logErr && (logErr as any).code !== '42P01') {
  return { ok: false, retriable: true, error: logErr.message }
}
```

(Or just always create the `anthropic_deletion_log` table in Task 1 migration — Plan 01 does this at L1407-1423, so the check should be defensive only.)

---

### HIGH-16: Plan 04 SQL — RPC bodies referenced "verbatim from PRD §4.1" never inlined into plan
**Lens:** 2 + 4
**File:** `docs/kova-final-impl-plans/04-account-and-stripe-billing-plan.md:109, 222`

**Issue:** Plan 04 Task 1.1 Step 1 says: "Copy the full SQL block from PRD §4.1 verbatim". No SQL appears in the plan — the engineer must keep the PRD file open. Plan's own founder-lock #15 (SET search_path) cannot be audited without reading the PRD. Plans 01, 02, 03, 05, 09 inline their SQL.

**Why HIGH:** Cross-doc engineering coordination required. Founder-lock #15 violation is not detectable from this plan alone. Risk that PRD drift later changes the SQL but plan never updates.

**Recommended fix:** Inline the SQL in the plan, or at minimum quote the key invariants (CHECK constraints, SET search_path, GRANT lines).

---

### HIGH-17: Plan 05 dynamic `<component :is="item.icon">` with `i-lucide-*` strings
**Lens:** 1 + 16
**File:** `docs/kova-final-impl-plans/05-brand-kit-and-drag-drop-plan.md:2253`

(Same root cause as HIGH-7. Flagged here because the dynamic + class-string compound is a separate failure mode: `<component :is="'i-lucide-palette'">` tries to render a component literally named that string, which is not registered.)

**Recommended fix:** Apply the static-map pattern from CRITICAL-4.

---

### HIGH-18: Plan 02 — `crypto.randomUUID()` slugged via `replace(/-/g, '')` for idempotency keys NOT done; uses raw `crypto.randomUUID()` (36 chars w/ dashes) — passes the regex test but plan's idempotency-key validator (Plan 11 L349) only accepts 16-64 chars `[a-zA-Z0-9_-]`. Note: dashes ARE in the regex, so this works. False alarm — actually OK.

**Status:** WITHDRAWN on re-read. Not a finding.

---

### HIGH-19: Plan 03 `pg_indexes` RLS visibility + `system_role` policy false-positives
**Lens:** 10 — RLS correctness
**File:** `docs/kova-final-impl-plans/03-brand-management-plan.md:266-279`

(Related to HIGH-10. Captured separately because the RLS test asserts `expect(error?.message).toMatch(/idx_brands_slug_per_user|unique/i)` — relies on Postgres error message matching, which is locale-/version-fragile. Use error `code === '23505'` instead.)

**Recommended fix:**
```diff
-expect(dupe.error?.message).toMatch(/idx_brands_slug_per_user|unique/i)
+expect(dupe.error?.code).toBe('23505')
```

---

### HIGH-20: Plan 09 inline JWT generation pattern relies on undocumented Supabase helper
**Lens:** 4
**File:** `docs/kova-final-impl-plans/09-version-history-and-trash-plan.md:355-364`

(Related to CRITICAL-13. Captured separately to surface that the plan author admits "Implementation detail varies; if seed.ts already exists, reuse its signInAs pattern" — but then defines a broken helper inline. Should not ship broken code as a fallback; should fail fast.)

---

### MEDIUM-1: Plan 01 `SECURITY DEFINER ... SET search_path = public, pg_temp` differs slightly from founder spec `SET search_path = 'public'`
**Lens:** 10
**File:** `docs/kova-final-impl-plans/01-auth-and-identity-plan.md:278, 314, 1774`

**Issue:** Founder lock prescribes `SET search_path = 'public'` (quoted, single schema). Plan 01 writes `SET search_path = public, pg_temp` (unquoted, dual schema). Both are functionally safe (pg_temp is the session temp schema, doesn't change privilege escalation behavior). Format mismatch is minor stylistic.

**Recommended fix:** Either align to spec exactly or amend CLAUDE.md to allow `, pg_temp`. Document the chosen convention.

---

### MEDIUM-2: Plan 01 `gdpr_queue_service_only` RLS policy is redundant (service_role bypasses RLS)
**Lens:** 10
**File:** `docs/kova-final-impl-plans/01-auth-and-identity-plan.md:266-270`

**Issue:** `CREATE POLICY ... FOR ALL TO service_role USING (true) WITH CHECK (true)` is a no-op because service_role bypasses RLS. The policy expresses *intent* but adds no enforcement.

**Recommended fix:** Either remove the policy and document the intent in a `COMMENT ON TABLE` or leave it as documentation-via-DDL. Either is fine; current shape is harmless.

---

### MEDIUM-3: Plan 04 — Stripe SDK init missing explicit API version in some test paths
**Lens:** 9
**File:** Plan 04 multiple — `process.env.STRIPE_SECRET_KEY = 'sk_test_dummy'` without paired `apiVersion`.

**Status:** Production code at L527 sets `apiVersion: '2024-10-28.acacia'`. Test mocks bypass real Stripe construction. OK in this audit.

---

### MEDIUM-4: Plan 02 ComposerInputWrap uses `e.code === 'Enter'` (correct), confirms Plan 03 outlier
**Lens:** 1 + 16
**File:** `docs/kova-final-impl-plans/02-onboarding-and-dashboard-plan.md:2400`

**Status:** Plan 02 + Plan 06 + Plan 08 use `e.code` correctly. Only Plan 03 violates (see HIGH-3). Cross-reference for tracking.

---

### MEDIUM-5: Plan 10 + Plan 04 + Plan 09 — multi-step async sequences don't use Promise.all where safe
**Lens:** 1
**Status:** Stylistic. Many handlers serialize independent reads. Worth a pass during code review but not blocking.

---

### MEDIUM-6: Plan 02 ComposerInputWrap reads `(e.target as HTMLElement).innerText` on `@input`
**Lens:** 1
**File:** `docs/kova-final-impl-plans/02-onboarding-and-dashboard-plan.md:2434`

**Issue:** `contenteditable` produces `<br>` and `<div>` line wrappers; `innerText` includes them as `\n`. Need a sanitization pass before emitting upstream so the prompt isn't full of stray newlines.

**Recommended fix:** Use `e.target.textContent ?? ''` or normalize whitespace before emit.

---

### MEDIUM-7: Plan 02 useFileGrid debounce timing in tests `await new Promise(r => setTimeout(r, 220))`
**Lens:** 4
**File:** `docs/kova-final-impl-plans/02-onboarding-and-dashboard-plan.md:1083,1097`

**Issue:** Tests wait wall-clock time. Flaky in CI under load. Prefer `vi.useFakeTimers` analogue or `await flushPromises()` after stubbing the timer.

---

### MEDIUM-8: Plan 04 webhook handler — catch-all `try` around `eventHandler(event, supabase)` swallows handler errors with 200 OK
**Lens:** 9
**File:** `docs/kova-final-impl-plans/04-account-and-stripe-billing-plan.md:1298-1309`

**Issue:** Plan comments "Still 200 to Stripe; retries handled by Stripe via webhook config + next attempt hits idempotency". But Stripe retries on non-2xx, NOT on 200. Once the row is committed to `stripe_webhook_events` with `outcome: 'error'`, the idempotency dedupe will return 200 forever — Stripe never retries. Failed handlers become permanent silent drops.

**Recommended fix:** Return 5xx for retriable errors:
```diff
-return { status: 200, body: { received: true, error: 'handler_failed' } }
+return { status: 500, body: { received: true, error: 'handler_failed' } }
```

And remove the `outcome: 'error'` write OR mark the idempotency row as retry-eligible (`outcome: 'pending'`). The 23505 conflict check in `verifyIdempotency` would need to allow re-INSERT in that case.

---

### MEDIUM-9: Plan 09 `kova-open-pencil-1/docs/prd/09-version-history-and-trash.md` PRD path uses OLD `docs/prd/` not `docs/kova-final-prds/`
**Lens:** 6
**File:** `docs/kova-final-impl-plans/09-version-history-and-trash-plan.md:5,12,13,15`

**Issue:** Per memory `project_kova_path_drift`, PRDs moved to `docs/kova-final-prds/`. Plan 09 references the old path `docs/prd/09-version-history-and-trash.md`. Will 404 when the engineer tries to read the PRD.

**Recommended fix:** Path replace `docs/prd/` → `docs/kova-final-prds/` in Plan 09.

---

### MEDIUM-10: Plan 01 cron orchestrator `claim_deletion_queue_row` returns TABLE but consumer treats as single row via `claim.attempts`
**Lens:** 2
**File:** `docs/kova-final-impl-plans/01-auth-and-identity-plan.md:1740`

**Issue:** RPC returns `RETURNS TABLE (id uuid, attempts int)` with `RETURN QUERY SELECT v_row.id, v_row.attempts + 1`. Supabase JS returns `{ data: Array<{id, attempts}> | null }`. Plan code reads `claim.attempts` — that's `undefined` on an array. Should be `claim[0]?.attempts`.

**Evidence:**
```ts
// L1729-1740
const { data: claim } = await supabase.rpc('claim_deletion_queue_row', { ... })
if (!claim) continue
// ...
const newStatus = result.retriable && claim.attempts < MAX_ATTEMPTS ? 'pending' : 'failed_terminal'
```

**Recommended fix:** Either change RPC to `RETURNS record` / `RETURNS jsonb` or read `claim[0]`:
```diff
-if (!claim) continue
-...
-const newStatus = result.retriable && claim.attempts < MAX_ATTEMPTS ? 'pending' : 'failed_terminal'
+const row = Array.isArray(claim) ? claim[0] : claim
+if (!row) continue
+...
+const newStatus = result.retriable && row.attempts < MAX_ATTEMPTS ? 'pending' : 'failed_terminal'
```

---

### MEDIUM-11: Plan 02 + Plan 04 — `useLocalStorage` writes localStorage on every reactive change; rapid input causes excessive writes
**Lens:** 1
**Status:** VueUse `useLocalStorage` is already debounced internally. Non-issue.

---

### MEDIUM-12: Plan 03 InfoCard `<span class=&quot;opacity-50&quot;>` HTML entity escapes inside JS prop array
**Lens:** 1
**File:** `docs/kova-final-impl-plans/03-brand-management-plan.md:2556-2561`

**Issue:** Bullets contain `&quot;` (HTML entity) embedded inside a JS string literal. JS doesn't decode HTML entities; the literal renders as `class=&quot;opacity-50&quot;` which is invalid HTML attribute syntax. Browsers will render the `&quot;` literal char.

**Recommended fix:**
```diff
-'Restore any time from <span class=&quot;opacity-50&quot;>Settings → Archive</span> (Phase 2)',
+'Restore any time from <span class="opacity-50">Settings → Archive</span> (Phase 2)',
```

(Although see CRITICAL-14 — the v-html itself should be replaced or sanitized.)

---

### MEDIUM-13: Plan 04 avatar-upload `users/{user_id}/avatar.png` — relies on user-namespace storage RLS policy that Plan 04 doesn't author
**Lens:** 10
**File:** `docs/kova-final-impl-plans/04-account-and-stripe-billing-plan.md:1610`

**Issue:** Path enforcement is by regex (`EXPECTED_PATH_RE`) but Plan 04 does not author the corresponding `storage.objects` RLS policy on `media-assets` bucket. If the bucket isn't already protected by user-prefix RLS (which Plan 04 assumes exists from Cluster 01/11), a malicious upload could target another user's avatar slot.

**Recommended fix:** Verify Plan 11 or earlier ships the bucket RLS; add a defensive check in `avatar-confirm` that `update` succeeded on a row scoped by user:
```ts
const ownPath = `users/${ctx.userId}/avatar.png`
if (storage_path !== ownPath) return { status: 403, body: { error: 'path_user_mismatch' } }
```

(Plan 04 has this at L1701-1703 but only checks segments[1]; tightening to exact `===` is safer.)

---

### MEDIUM-14: Plan 04 RECONCILE cron heals `past_due → active` but doesn't reset `current_period_end`
**Lens:** 9
**File:** `docs/kova-final-impl-plans/04-account-and-stripe-billing-plan.md:1464-1467`

**Issue:** When Stripe says subscription is active but Kova has it past_due, reconcile sets `plan_status = 'active'` but doesn't update `current_period_end`. If Kova's stored period is stale (paid invoice extended the period), the `hasActiveSubscription` computed reads stale data.

**Recommended fix:**
```ts
if (sub.status === 'active') {
  await ctx.supabase.from('users').update({
    plan_status: 'active',
    current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
    cancel_at_period_end: sub.cancel_at_period_end,
  }).eq('id', u.id)
  healed++
}
```

---

### MEDIUM-15: Plan 02 OnboardingView wires `v-model="state.brandName.value"` but only works because `state.brandName` is a Ref unwrap pattern
**Lens:** 1
**File:** `docs/kova-final-impl-plans/02-onboarding-and-dashboard-plan.md:1464, 1470, 1484`

**Issue:** Pattern `v-model="state.brandName.value"` is unusual. Inject returns `{ brandName: Ref<string>, ... }`. Vue's v-model compiles to `:value + @input` so `state.brandName.value = e.target.value` does work — but the pattern is confusing and most readers expect `v-model="state.brandName"` with auto-unwrap on reactive objects. inject doesn't auto-unwrap.

**Recommended fix:** Either provide a reactive proxy from `useOnboardingState` or use the explicit pattern consistently and add a code comment explaining why `.value` is needed.

---

### MEDIUM-16: Plan 02 useGreeting reads `auth.profile?.email?.split('@')[0] ?? 'there'` but email isn't on profile
**Lens:** 16
(Subsidiary of HIGH-4; merging for tracking.)

---

### MEDIUM-17: Plan 02 — store action `store.archiveBrand` etc. in tests assigned directly `store.archiveBrand = async () => { called = true }`
**Lens:** 4
**File:** `docs/kova-final-impl-plans/03-brand-management-plan.md:2364, 2500, 2621`

**Issue:** Pinia setup-store actions are readonly after defineStore. Reassignment may or may not work depending on Pinia version. Use `vi.spyOn` analogue or pinia's `actions` plugin.

**Recommended fix:** Mock at module level:
```ts
mock.module('@/stores/brands', () => ({
  useBrandsStore: () => ({ archiveBrand: mock(async () => {}) })
}))
```

---

### MEDIUM-18: Plan 11 `idempotency_keys` CHECK on `length(key) >= 16 AND length(key) <= 64`
**Lens:** 2
**File:** `docs/kova-final-impl-plans/11-shared-ui-infrastructure-plan.md:157`

**Issue:** Plan 11 tests assert minimum-16-char keys. Plan 02 + 03 + 04 generate via `crypto.randomUUID()` which is 36 chars (with dashes). OK. But Plan 09 + Plan 10 use shorter idempotency tokens in some tests. Verify all callers cross-check.

---

### LOW-1: Plan 01 Task 8 vercel.json `crons` array — Vercel Cron requires Pro plan
**Lens:** 8 — Env hygiene
**Status:** Project decision; not a code bug. Document in operator runbook.

---

### LOW-2: Plan 02 TODO comments left in production code
**File:** `02-onboarding-and-dashboard-plan.md:1950` — `() => { /* TODO: opens Cluster 03 modal */ }`. Acceptable as cross-cluster stitch point; ensure follow-up in Cluster 03 wave.

---

### LOW-3: Plan 03 TODO `/* TODO Cluster 02 inject user name */ 'Jiho Yang'` in `BrandPickerView.vue` at L3103
**Lens:** 14 — Comment / doc rot

**Issue:** Hard-coded "Jiho Yang" as a placeholder user name in a production-bound view. Easy oversight to ship.

**Recommended fix:** Replace with `auth.profile?.name ?? 'You'` (and see HIGH-4 for the cross-plan fix on `.profile.email`).

---

### LOW-4: Plan 05 TODO `count: null /* TODO Cluster 10 store */`
**Status:** Acceptable cross-cluster stitch.

---

### LOW-5: Plan 11 `TODO(pre-launch §11)` comments throughout Sentry / Resend stubs
**Status:** Acceptable — per founder lock #14 these are deferred to pre-launch. Document the activation checklist.

---

### LOW-6: Plan 03 self-review at L4086 claims "Zero matches outside intentional comment-context" but L3103 contradicts
**Lens:** 14
**Status:** Self-review accuracy gap. Note for plan-author hygiene.

---

### LOW-7: Plan 02 self-review at L3859-3860 acknowledges template-literal Promise bug + useUIStateStore-in-template anti-pattern but ships unchanged
**Lens:** 14
**Status:** Flagging is not fixing. See CRITICAL-10.

---

### NOTE (locked)-1: Plan 01 imports `zod` in `api/auth/email-change-request.ts`
**Lens:** 3 — valibot tool-layer conformance
**File:** `docs/kova-final-impl-plans/01-auth-and-identity-plan.md:978, 982`

**Status:** Founder lock #3: "valibot only in tool layer (src/ai/tools.ts + dependencies). NEVER Zod there." Email-change-request is an Edge Function, not the tool layer. Zod use is permitted. NOTE only; not a violation.

---

### NOTE (locked)-2: Plan 07a modifies `packages/core/`
**Lens:** 6 — File path correctness
**File:** Plan 07a — all tasks.

**Status:** Founder lock #16: "`packages/core/` is READ-ONLY except documented Slice (17th NodeType) + Measurement (page-level anchored, NOT a NodeType per PRD 07a Measurement lock) exceptions." Plan 07a is the documented exception. NOTE only.

---

### NOTE (locked)-3: Plan 11 stubs Sentry / Resend / Vercel Cron
**Lens:** 14
**File:** Plan 11 multiple.

**Status:** Founder lock #14: "Sentry / Resend / Vercel Cron deferred to pre-launch — stub-guard pattern OK." All stub helpers follow the `if (!apiKey) { console.warn(...); return; }` pattern. NOTE only.

---

## Cross-plan observations

### Pattern 1 — Icon-component syntax is the single biggest correctness gap across plans

Every plan that ships Vue components uses a different icon-binding strategy:

| Plan | Pattern | Status |
|---|---|---|
| 01 | `<icon-lucide-foo>` static tags | ✅ Correct |
| 02 | `<component :is="`icon-lucide-${name}`">` dynamic | ❌ Broken (CRITICAL-4) |
| 03 | `<Icon name="lucide:foo">` Nuxt-style | ❌ Broken (CRITICAL-3) |
| 04 | `<component :is="`icon-lucide-${name}`">` dynamic | ❌ Broken (CRITICAL-4) |
| 05 | `'i-lucide-foo'` class-string + `<component :is="item.icon">` | ❌ Broken (HIGH-7) |
| 06 | `'i-lucide-foo'` class-string in ToolDef + `<component :is>` | ❌ Broken (HIGH-7) |
| 07b | unplugin-icons via Lucide | ✅ Correct (per declaration) |
| 08 | (table-form plan — no code blocks) | N/A |
| 09 | unplugin-icons via Lucide | ✅ Correct (per declaration) |
| 10 | Lucide icons | ✅ Correct (per declaration) |
| 11 | `<icon-lucide-:name="icon" />` (stray colon) | ❌ Bug (L2314 — see CRITICAL-14 context) |
| 12 | (relies on Cluster 11 primitives) | OK |

**Recommendation:** Plan 11 should ship a `<KovaIcon name="palette" />` primitive that all other plans import. Make it the single tag convention. Update Plans 02/03/04/05/06/11 once.

### Pattern 2 — `as any` is the lock-bypass of choice

- Total `as any` casts across plans: ~214
- Worst offender: Plan 03 (49), Plan 06 (41)
- Most appear in test mocks but production paths also abuse it (Plan 03 L1407, Plan 02 L3283, Plan 01 L1164, Plan 04 L901)
- Founder lock #10: "No `any` types. No `!` non-null assertions."

**Recommendation:** Either amend the lock to allow `as any` in test mocks only (with a justification comment), or run a refactor pass before code ships.

### Pattern 3 — `process.env.X!` is the secondary bypass

- 24 occurrences across plans 02/03/04/09
- Mostly in tests + integration helpers
- Same founder-lock violation as Pattern 2

**Recommendation:** Centralize via `requireEnv` helper (HIGH-1) used everywhere.

### Pattern 4 — SECURITY DEFINER + SET search_path coverage inconsistent

| Plan | DEFINER RPCs | SET search_path | Status |
|---|---|---|---|
| 01 | 3 | 3 | ✅ |
| 03 | 8 | 0 | ❌ (CRITICAL-2) |
| 04 | 2 (PRD-referenced) | unknown | ⚠️ Audit PRD |
| 05 | 1 | 0 | ❌ |
| 09 | 3 | 0 | ❌ |
| 12 | 0 (uses SECURITY INVOKER) | 1 (in test helper) | ✅ |

**Recommendation:** Add a CI gate that greps every migration for `SECURITY DEFINER` and asserts `SET search_path` within the same `CREATE OR REPLACE FUNCTION` block.

### Pattern 5 — Test framework drift (bun:test vs vitest vs jest APIs)

- Plan 02 L3009 uses `jest.mock` — wrong API
- Plan 03 L1871-1872 uses `vi.mock` / `vi.fn` — wrong API
- Plans 01–04 use `mockImplementationOnce` / `mockClear` — Jest/Vitest-only methods
- Project declares `bun:test` throughout

**Recommendation:** Add a CI grep: `grep -rE "(jest|vi)\.(mock|fn|spyOn|hoisted)" tests/` → fail if any matches.

### Pattern 6 — Cross-plan profile + routing contracts are unstable

- Plan 01 defines UserProfile without `email`; Plans 02 + 04 read `auth.profile.email`
- Plan 02 routes `/brand/:brandId`; Plan 03 + Plan 06 push `/dashboard?brandId=...`

**Recommendation:** Add a shared `src/types/auth.ts` + `src/types/routes.ts` referenced by every cluster's TypeScript. Make these the single source of truth.

### Pattern 7 — Plan 11 v-html

Plan 11's `<EmptyState>` uses `v-html="renderHeadline()"`. If `renderHeadline()` only sources locked strings, OK. If it ever sources user input, XSS. Audit-recommend an annotation in the source: `// SAFE: only renders constants from copy.ts` or sanitize.

---

## Suggested cleanup passes (ordered by leverage)

1. **Fix CRITICAL-1 + CRITICAL-11 routing inconsistency** — single source of truth in `src/types/routes.ts`. Block before any cluster 02/03 implementation begins.
2. **Mass-fix CRITICAL-2 + HIGH-19 + Pattern 4** — sweep every plan migration for `SECURITY DEFINER` and add `SET search_path = 'public', pg_temp`. Add CI grep guard.
3. **Standardize icon component (CRITICAL-3 + CRITICAL-4 + HIGH-7 + HIGH-17 + Pattern 1)** — Plan 11 ships `<KovaIcon>`; replace all Plan 02/03/04/05/06 icon bindings with it.
4. **Fix CRITICAL-5 + CRITICAL-6 + HIGH-8 + Pattern 5** — global find-replace `jest.mock|vi.mock` → `mock.module`, `jest.fn|vi.fn` → `mock`, `mockImplementationOnce` → wrapper helper. Add CI grep guard.
5. **Fix CRITICAL-12** — replace Stripe webhook raw-body reader with `micro` or buffer-based pattern. Validate against Stripe test webhook before claiming Plan 04 green.
6. **Fix CRITICAL-7** — re-author Shopify token revocation in Plan 01 around `DELETE /admin/api_permissions/current.json` with stored token; ensure brands cron step runs before token-nulling step.
7. **Fix CRITICAL-8** — replace in-memory rate-limit Map with Postgres/KV-backed durable store.
8. **Sweep HIGH-2 + HIGH-1 + Pattern 2 + Pattern 3** — `as any` and `process.env.X!` refactor pass per plan. Plan 03 alone needs ~57 substitutions.
9. **Fix CRITICAL-10** — Plan 02 ComingSoonView fetch headers.
10. **Audit Plan 09 + Plan 04 cross-plan helpers** — broken `signInAs` in Plan 09 will block Plan 04's Stripe-integration tests too.

---

## What's working well (worth preserving)

- TDD RED→GREEN→COMMIT shape is enforced consistently per task — strong test-first discipline.
- Plan 01 SECURITY DEFINER pattern (search_path + REVOKE + GRANT specific role) is the gold standard to copy.
- Plan 07a + Plan 11 stub-mode pattern (env-guard + Sentry / Resend / Cron deferred to pre-launch) is clean and reversible.
- Plan 08's pre-flight + exit-gate table-driven structure makes review fast.
- Plan 12's SECURITY INVOKER + RLS reliance (rather than DEFINER) is the right call for user-self-writes.
- Plan 10 explicitly preserves `SYSTEM_PROMPT` immutability + `ToolLoopAgent` lock — no drift from founder hard constraints in the AI layer.
- valibot tool-layer conformance is consistent across Plans 05/06/10 (one Zod-in-Edge-Function counterexample at Plan 01 L978 which is permitted by founder lock #3).

---

## End of report

63 findings; 15 CRITICAL, 20 HIGH, 18 MEDIUM, 7 LOW, 3 NOTE-locked. Engineers should not begin Wave 2 implementation until at least the CRITICAL set is dispositioned. Highest leverage cleanup passes listed above.
