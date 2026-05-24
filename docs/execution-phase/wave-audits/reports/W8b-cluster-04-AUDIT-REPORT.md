# W8b — Cluster 04 (Stripe Billing + Account + GDPR Cascade) AUDIT REPORT

**Auditor:** Independent AUDIT agent (W8b)
**Audited branch:** `app/cluster-04-stripe` @ HEAD `144d7f67` (worktree `/Users/jihoyang/kova-build-c04`)
**Base for diff:** `feat/m9-shopify`
**Date:** 2026-05-22
**Audit duration:** ~40 min (single-session, parallel gates)
**Auditor scope:** READ-ONLY. No code modifications. No pushes.

---

## Verdict

**APPROVE WITH HIGH ISSUES.** Implementation is largely sound — the security-critical primitives (Stripe webhook signature verification, raw-body reader, idempotency log, avatar magic-byte validation, price-ID whitelist) are correct and match B-CRIT12 / B-CRIT15 / CT-008 locks. However, **four HIGH findings must be resolved before Phase B production activation** — most notably an enum-mapping bug that grants paid access to paused/unpaid Stripe subscriptions and an RPC bug that denies access to trialing users.

**Recommended action:** Founder reviews the 4 HIGH findings; agent fixes; re-audit deltas only; then merge into `feat/m9-shopify`.

| Dimension | Result |
|---|---|
| Branch + diff baseline (A) | ✅ 17 commits (DONE claims 16; +1 docs commit), conventional format, no files outside scope, no `packages/core/` mods |
| Secrets handling (B) | ✅ Zero leaks — no `sk_live`/`sk_test`/`whsec_` in diff; no `STRIPE_SECRET_KEY`/`SUPABASE_SERVICE_ROLE_KEY` in `src/`; no `VITE_*_SECRET` misuse |
| Stripe webhook signature (C) | ✅ Raw body via `req.text()` BEFORE `constructEvent` (B-CRIT12 satisfied), 3-arg verify, 400 on bad sig BEFORE DB write, PK idempotency via `23505`, no try/catch swallowing |
| plan_status CHECK (D) | ⚠️ `'trialing'` in CHECK ✅ (B-CRIT15 satisfied). But CHECK only allows 5 statuses; Stripe emits 8. See H-1. |
| GDPR delete-account cron (E) | N/A — D-2 amended 2026-05-17: cron belongs to **Cluster 01**. Cluster 04 ships column + client + runbook only. Contract documented in `docs/operations/stripe-setup-runbook.md` ✅ |
| Account page UI 6 sub-routes (F) | ✅ `/account/:section` (profile, brands, billing, brand-kit, integrations, danger-zone) + `/account/billing/{success,cancel}`. Avatar PNG/JPG via sharp magic-bytes ✅. 5MB cap ✅. BrandPicker 3-mode ✅. KovaIcon/KovaMenu reused. |
| Resend templates (G) | ✅ 4 templates all compose `renderEmailShell`. Server-only. Escape helpers per file (duplicated — see L-5). |
| Cross-cluster contracts (H) | ✅ Cluster 11 primitives reused; `_shared/{audit,email,auth,env}` imported; packages/core untouched; D-2 contract documented for Cluster 01 |
| Hard-constraint sweep (I) | ✅ Zero `Math.random` / `: any` / `<style>` / `<svg>` / hex / zod-in-ai in c04 diff. One `!.` non-null assertion in `_shared/stripe-client.ts:19` (M-2) |
| Quality gates (J) | ✅ `vite build` 1.7s; `bun run test:unit` 1704p/0f/99 skip; `test:dupes` 1.21%. ⚠️ `bun run check` 89 errors — **all pre-existing in non-c04 code** (packages/core, m9 surfaces, ui/, dev/). Zero in c04-owned files. DONE claim verified. |
| Code-review sweep (K) | 4 HIGH + 6 MEDIUM + 7 LOW (full detail below) |
| DONE-report accuracy (L) | 5/5 spot-checks verified. Minor commit-count drift (16→17). One uncommitted worktree change. |

---

## Security findings

### Stripe webhook handling (B-CRIT12)

**PASS.** `api/stripe/webhook.ts` implements the exact pattern required by the founder lock:

1. ✅ Reads `stripe-signature` header (`Headers.get()` is case-insensitive per Fetch spec)
2. ✅ Reads raw body via `req.text()` BEFORE any JSON parsing or `constructEvent` call (line 75)
3. ✅ Calls `stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)` with all 3 args (line 79)
4. ✅ Returns 400 on signature failure BEFORE any DB write (line 80–82)
5. ✅ Idempotency via PRIMARY KEY INSERT on `stripe_webhook_events.event_id`; PG error `23505` (unique violation) treated as duplicate (line 98–104). This is **stronger than the Cluster 11 idempotency helper** for this use case — atomic at DB level.
6. ✅ No try/catch swallows signature errors — caught only to return 400.
7. ✅ Handler errors return 500 so Stripe retries with backoff (founder D-14).

Edge-runtime is correct for Edge Functions — `Buffer.from(req.body)` does not apply; `req.text()` is the right primitive. Audit prompt's literal "Buffer.from" expectation was outdated; the implementation is correct.

### Secret isolation

**PASS.** Server-only env vars (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) read only in `api/`. Browser bundle (`src/`) reads only `VITE_*` prefix vars. No hardcoded keys, no `sk_live`/`sk_test`/`whsec_` literals. `getStripeClient()` throws on missing secret per founder lock #10.

### Avatar upload — input validation

**PASS.** `api/account/avatar-upload.ts` validates in correct order:
1. Auth required (line 34)
2. Multipart content-type required (line 39)
3. 5MB cap checked BEFORE sharp loads bytes (line 52)
4. Magic-byte format detection via `sharp.metadata()` — spoof-resistant; rejects gif/webp/etc. (line 60–64)
5. EXIF orientation normalized via `.rotate()` (privacy + display correctness)
6. Resize 256×256 cover + PNG re-encode BEFORE bucket upload (a malicious payload never lands in storage)
7. Service-role upload to `{userId}/avatar.png` matches M4 RLS first-folder = auth.uid() convention
8. Audit-log write via `writeAudit` (Cluster 11)

⚠️ **M-4 follow-up:** The comment claims M4 RLS owns this path — confirm the public bucket policy in staging (the endpoint returns `getPublicUrl` which assumes the bucket is public).

### Price-ID forging defense

**PASS.** `api/_shared/price-map.ts` resolves price IDs from `STRIPE_PRICE_ID_<plan>` env vars only — zero hardcoded IDs. `isKnownPriceId()` checks env-resolved whitelist; checkout-session rejects unknown prices with 422 (C-LOW04.7 satisfied).

### plan_status CHECK constraint (B-CRIT15)

**PASS for letter, FAIL for spirit** — see H-1, H-2.

---

## Findings

### CRITICAL

None.

### HIGH

**H-1. `normalizeStatus` silently maps unknown Stripe statuses → `'active'` — grants paid access to paused/unpaid/incomplete_expired subs.**

- **Files:** `api/stripe/webhook-handlers/handle-subscription-updated.ts:19-21`, `handle-subscription-created.ts:15-17`
- **Issue:** Stripe enumerates 8 subscription statuses: `incomplete`, `incomplete_expired`, `trialing`, `active`, `past_due`, `canceled`, `unpaid`, `paused`. The CHECK constraint allows 5; the `normalizeStatus` fallback defaults unknown → `'active'`. A `paused` or `unpaid` subscription is therefore written as `'active'` and `user_has_active_plan(uuid)` returns true. When `PLAN_GATE_ENFORCED` flips on, paused/unpaid users retain access silently.
- **Fix:** Map `paused`/`unpaid`/`incomplete_expired` → `'cancelled'` (or extend the CHECK + `PLAN_STATUS_VALUES` to cover all 8), and emit an audit row when the fallback fires so silent drift is observable. Confirm founder intent before extending — the 5-value lock may be intentional, but the fallback target is not safe.

**H-2. `user_has_active_plan` RPC excludes `'trialing'`, contradicting CT-008 / D-18 founder locks.**

- **File:** `supabase/migrations/20260605_04_account_stripe_billing.sql:152`
- **Issue:** `SELECT plan_status = 'active' AND ...` — trialing users are denied access by the server-side gate even though every other surface (`useBillingStore.isTrialing`, `TrialBanner`, `daysUntilTrialEnds`, the 5-value `PLAN_STATUS_VALUES` constant) treats trialing as a first-class state. When founder activates trials, all trialing users will silently lose access.
- **Fix:** Change RPC body to `SELECT plan_status IN ('active', 'trialing') AND ...`. Add an integration test.

**H-3. `current_period_end` extraction via `as unknown as { current_period_end?: number }` — silently nullified if SDK shape drifts.**

- **Files:** `handle-subscription-updated.ts:41-43`, `handle-subscription-created.ts:35-37`
- **Issue:** Double cast bypasses TS. Stripe API 2024-04-10 already moved `current_period_end` from `Subscription` root to `items.data[0].current_period_end`. If/when the SDK pins forward, this writes `null` and breaks the `pastDueDeadline`, `daysUntilTrialEnds`, and `idx_users_past_due` index — letting past_due users escape dunning.
- **Fix:** Read from `sub.items.data[0].current_period_end` (current SDK location), narrow via a proper type guard, and audit-log when missing.

**H-4. Webhook final-update path swallows errors; row can stay at upfront-inserted `'processed'` despite real failure.**

- **File:** `api/stripe/webhook.ts:121-125`
- **Issue:** The row is INSERTed upfront with `outcome:'processed'`. If the final outcome-update on lines 121-125 (the post-handler success-path update) itself errors, the error is silently dropped — no try/catch, no log — and the row keeps the optimistic `'processed'` even when handler returned `outcome:'error'` semantics intended.
- **Fix:** Wrap the final update in try/catch and log to Sentry. Consider tagging the upfront row with `'in_flight'` and transitioning explicitly to terminal states.

### MEDIUM

**M-1. `useBrandPicker.selectBrand` does read-modify-write on `users.preferences` with no concurrency guard.**
- **File:** `src/composables/account/use-brand-picker.ts:73-88`
- Two concurrent updates can clobber. Fix: server-side `jsonb_set` RPC.

**M-2. `g[STRIPE_CLIENT_GLOBAL_KEY]!` non-null assertion violates CLAUDE.md hard constraint "No `!` non-null assertions".**
- **File:** `api/_shared/stripe-client.ts:19`
- Fix: `const cached = g[STRIPE_CLIENT_GLOBAL_KEY]; if (cached !== undefined) return cached`.

**M-3. Pinia stores swallow Supabase errors into a string — no toast, no Sentry, no UI surface.**
- **Files:** `src/stores/billing.ts:88-90, 110-112, 132-134`; `src/stores/account.ts` patch path
- `error.value = 'invoices_fetch_failed'` is set but never read. Fix: KovaToast on error.

**M-4. Avatar bucket RLS dependency unverified in diff.**
- **File:** `api/account/avatar-upload.ts:84`
- `getPublicUrl` requires bucket to be public; verify staging policy + add integration test.

**M-5. `account.ts` uses `JSON.parse(JSON.stringify(...))` instead of `structuredClone` — violates CLAUDE.md "Deep copies: structuredClone, never shallow spread".**
- **File:** `src/stores/account.ts:34, 43, 109`

**M-6. Worktree contains uncommitted change to `src/composables/account/use-account-section.ts` — defensive type-narrowing for `route.params.section` (string | string[]).**
- Either commit before merge or revert; do not merge dirty worktree.

### LOW

- **L-1.** `accountUrl()` defaults `VITE_APP_URL` → `https://kova.app`; fail loud if unset in prod (`_helpers.ts:48, 53`).
- **L-2.** `_helpers.ts:27` `findUserByStripeCustomerId` returns `null` on any error; original DB error is lost — log before returning.
- **L-3.** `reconcile.ts` BATCH_LIMIT=100 with no continuation cursor — >100 past_due users leaves tail unhealed for a week.
- **L-4.** `invoices.ts:66` coerces `inv.id ?? ''` — empty-string key collisions in Vue `:key`. Filter instead.
- **L-5.** `escapeHtml`/`escapeAttr` duplicated across 4 email templates — extract to `api/_shared/email-escape.ts`.
- **L-6.** `BrandPicker.vue` and `IntegrationsSection.vue` use top-level `await` in `<script setup>` — relies on parent `<Suspense>`. Verify all BrandPicker call-sites are inside Suspense boundary.
- **L-7.** DONE-report `commits: 16` actual is 17 (the docs/runbook commit `144d7f67`). Minor drift; fix in report.

---

## GDPR cascade (re: audit-prompt §E)

**N/A FOR CLUSTER 04.** Per PRD 04 D-2 amended 2026-05-17, the GDPR cascade Edge Function belongs to **Cluster 01** (W8a). Cluster 04 ships only the supporting primitives:

- `users.stripe_customer_id` column (migration line 15)
- `getStripeClient()` singleton (`api/_shared/stripe-client.ts`)
- `docs/operations/stripe-setup-runbook.md §GDPR cascade verification` documenting the contract

**Cluster 01 must wire `stripe.customers.del(users.stripe_customer_id)` into its GDPR cron worker before Phase B production activation.** This is a documented cross-cluster gate, not a c04 omission. Re-audit when W8a's GDPR cron exists.

---

## Plan task completion matrix

Walked Plan 04 §6 task-by-task against the commit log + filesystem:

| Phase | Plan task | Status | Evidence |
|---|---|---|---|
| 1 | 1.1 migration | ✅ | `59dfcc6f`, migration file |
| 1 | 1.2-1.5 integration tests | ✅ | tests/integration/account/* (4 files, DB-gated) |
| 2 | 2.1 deps install | ✅ | `3a3ce296` (stripe@22 + sharp@0.34) |
| 2 | 2.2 stripe-client | ✅ | `1c4ff4b5` + 3 unit tests |
| 2 | 2.3 price-map + billing-plans | ✅ | `90f7e1d5` + 8 unit tests |
| 2 | 2.4 audit-log helper | ✅ SKIPPED | Cluster 11 already ships `writeAudit` — reused |
| 3 | 3.1 checkout-session | ✅ | `d4965167` + 6 tests |
| 3 | 3.2 portal-session | ✅ | `d391e836` + 5 tests |
| 3 | 3.3 webhook + 6 handlers | ✅ | `c97c7374` + 6 tests + helpers |
| 3 | 3.4 4 Resend templates | ✅ | shipped in c97c7374 batch |
| 3 | 3.5 invoices proxy | ✅ | `1546ce93` + 3 tests |
| 3 | 3.6 reconcile cron + vercel.json | ✅ | `1546ce93` + 3 tests + vercel.json |
| 3 | 3.7 webhook e2e integration tests | ⚠️ DEFERRED | Staging Stripe CLI manual; mocked tests cover dispatch/idempotency |
| 4 | 4.1 avatar-upload | ✅ | `12bb4a54` (combined w/ 4.2) + 7 tests |
| 4 | 4.2 avatar-confirm | ✅ REFACTORED | Combined into 4.1 single endpoint with sharp+RLS+upload (rationale documented in file header) |
| 5 | 5.1 useBillingStore | ✅ | `f6558598` + 6 tests |
| 5 | 5.2 useAccountStore | ✅ | `f6558598` + 5 tests |
| 6 | 6.1-6.5 composables | ✅ | `62ad2042` + brand-picker tests |
| 7-13 | Account chrome + sections + routes | ✅ | `a7f18b03` (large bundled commit) |
| 11 | M9 refactor | ⚠️ PARTIAL | Route + brand-picker scope shipped; extract IntegrationCard/SyncProgressBar/ShopifyConnectForm/SyncHistoryAccordion DEFERRED to follow-up PR. Migration table + RPC already shipped (Phase 1). Documented in DONE §Known follow-ups. |
| 14 | Docs + emails | ✅ | `144d7f67` (privacy/RoPA/runbook/tokens-used) |
| 15 | E2E + CI gates | ⚠️ DEFERRED | 11 Playwright flows + secret-grep CI gate documented in plan, executed in Phase 16 staging |
| 16-18 | Deploy + self-review + report | ⚠️ PARTIAL | Staging deploy + prod activation pending founder action (Stripe Dashboard config). This report = self-review summary. |

**Phase 1 audit gate (`tokens-used.md`):** ✅ Confirmed at `kova-build-c04/docs/execution-phase/cluster-reports/W8b-cluster-04-tokens-used.md`. Zero ⚠️ MISSING drift.

---

## DONE-report accuracy spot-check (5 claims)

| Claim | Verification | Result |
|---|---|---|
| "Avatar PNG/JPG via sharp.metadata magic-bytes" | Grep `avatar-upload.ts:60-64` | ✅ |
| "PLAN_STATUS_VALUES 5-value constant" | Grep `src/constants/billing-plans.ts:63` | ✅ |
| "6-item AccountSidebar NAV_ITEMS (B12 reversal)" | Grep `AccountSidebar.vue` — 6 sections | ✅ |
| "Price-map env-only, no hardcoded IDs" | Grep `price-map.ts` — 6 STRIPE_PRICE_ID_ refs | ✅ |
| "Webhook 6-event dispatch table" | Grep `webhook.ts` — 6 events | ✅ |

**Drift:** DONE claims "16 commits"; actual is 17 (the post-Phase-13 docs commit `144d7f67` is missing from the count). Cosmetic.

---

## Cross-cluster contracts

| Cluster | Direction | Contract | Status |
|---|---|---|---|
| 01 | C04 → C01 | C01 GDPR cron must call `stripe.customers.del(users.stripe_customer_id)` per D-2 amended | ⏳ Pending — C01 sibling responsibility |
| 03 | C04 → C03 | `/account/brands` route + sidebar entry registered; C03 fills `BrandsArchiveView` content per PRD 03 §13.2.2 | ✅ Stub at `src/views/dashboard/BrandsArchiveView.vue` |
| 10 | C04 ↔ C10 | Anthropic memory delete referenced in C01 cron contract (not C04 cron — see §E note) | N/A for C04 |
| 11 | C04 ↔ C11 | Reuses KovaIcon (+ registry extended), KovaMenu, KovaModal, writeAudit, requireEnv/loadEnvOrSkip, authenticateRequest, sendEmail+renderEmailShell | ✅ Zero modifications to C11 primitives |
| 12 | C04 ↔ C12 | ProfileSection writes accessibility+notifications to `users.preferences` JSONB; C12 may expose canonical store | ⚠️ Currently uses `useAccountStore.draft.preferences` raw — C12 follow-up |
| 05 | C04 → C05 | BrandKitSection ships 7-tab nav rail shell; C05 mounts pane content | ✅ Shell in place |

---

## Founder-locked decisions verified in code

| Decision | Verified |
|---|---|
| D-1 Avatar PNG/JPG only | ✅ `avatar-upload.ts:62` |
| D-2 Stripe Customer deleted on account-deletion via C01 cron | ✅ Runbook documents contract; column + client provided |
| D-4 Free-tier bullets | ✅ `billing-plans.ts` PLAN_INFO.free |
| D-5 Past-due deadline = period_end + 7d | ✅ `useBillingStore.pastDueDeadline` + `handle-invoice-payment-failed.ts:17,44-46` |
| D-8 Customer Portal cancellation at_period_end | ✅ Runbook §Phase A step 3 |
| D-10 Compare-plans toast | ✅ `BillingSection.vue` |
| D-11 Bad sig → 400 | ✅ `webhook.ts:80-82` |
| D-12 Brand-picker precedence URL > Q5 > alphabetical | ✅ `use-brand-picker.ts` |
| D-14 Handler error → 500 | ✅ `webhook.ts:118` |
| D-16 sharp normalize to PNG | ✅ `avatar-upload.ts:68` |
| D-17 3-mode brand picker | ✅ `BrandPicker.vue` |
| D-18 Trial scaffold hidden | ✅ `TrialBanner.vue` v-if guard |
| D-20 Avatar max 5MB | ✅ `MAX_BYTES` constant |
| CT-008 plan_status incl. trialing in CHECK | ✅ migration line 18 |
| B12 6-item sidebar incl. Brands | ✅ `AccountSidebar.vue` |
| B-CRIT12 raw-body before sig verify | ✅ `webhook.ts:75-79` |
| B-CRIT15 plan_status 'trialing' | ✅ migration line 18 |

**Note on CT-008 contradiction:** While `plan_status` accepts trialing, the `user_has_active_plan` RPC denies it — see **H-2** above.

---

## Pre-merge checklist (recommended)

Before merging `app/cluster-04-stripe` into `feat/m9-shopify`:

- [ ] Fix H-1 (`normalizeStatus` paused/unpaid fallback)
- [ ] Fix H-2 (`user_has_active_plan` include 'trialing')
- [ ] Fix H-3 (`current_period_end` source from items.data[0])
- [ ] Fix H-4 (webhook final-update error handling)
- [ ] Resolve M-6 (commit or revert uncommitted `use-account-section.ts`)
- [ ] Fix M-2 (`!` non-null assertion in stripe-client.ts)
- [ ] Re-audit deltas only
- [ ] Then merge

Post-merge / pre-prod:

- [ ] Cluster 01 wires `stripe.customers.del()` in GDPR cron (D-2)
- [ ] M-1/M-3/M-4/M-5 + LOW findings addressed in Phase B polish
- [ ] Phase 11 M9 refactor follow-up PR
- [ ] Phase 15 Playwright E2E suite (11 critical flows)
- [ ] Phase 16 staging deploy with Stripe CLI webhook tunnel verification

---

## Artifacts checked

**Files read (selected):**
- `api/stripe/webhook.ts`, `webhook-handlers/*.ts`, `_helpers.ts`
- `api/stripe/{checkout-session,portal-session,reconcile,invoices}.ts`
- `api/account/avatar-upload.ts`
- `api/_shared/{stripe-client,price-map}.ts`
- `supabase/migrations/20260605_04_account_stripe_billing.sql`
- `emails/account/{subscription-new,subscription-payment-failed,subscription-cancelled,subscription-upgraded}.ts`
- `src/router.ts`, `src/views/account/AccountView.vue`, `src/components/account/{BrandPicker,AccountSidebar}.vue`
- DONE report at `docs/execution-phase/cluster-reports/W8b-cluster-04-DONE.md`
- Plan at `docs/kova-final-impl-plans/04-account-and-stripe-billing-plan.md`
- Execution prompt at `docs/execution-phase/execution-prompts/W8b-cluster-04-stripe.md`

**Commands run:**
- `git log --oneline feat/m9-shopify..app/cluster-04-stripe` (17 commits)
- `git diff --stat feat/m9-shopify...app/cluster-04-stripe` (5259 insertions / 1 deletion / 75 files)
- Secret-leak grep across diff + `src/` (zero hits)
- Hard-constraint grep across diff (zero hits in c04 surfaces)
- `bun run check` (89 errors, all pre-existing in non-c04 code)
- `bun run test:unit` (1704p/0f/99 skip)
- `bunx vite build` (1.7s, PWA generated)
- `bun run test:dupes` (1.21%, under 3% cap)

**Subagents invoked:**
- `superpowers:code-reviewer` — full-diff review (4 HIGH + 6 MEDIUM + 7 LOW)

**NOT run (out of scope):**
- `database-reviewer` MCP subagent — RPC/RLS already verified inline against migration
- `security-auditor` MCP subagent — security review embedded in this audit
- `e2e-runner` — Stripe CLI listen + Playwright deferred to Phase 16 staging (per DONE report)
- `context7` MCP — Stripe SDK current best practice not re-verified; webhook pattern matches publicly documented Stripe Node SDK pattern (`stripe.webhooks.constructEvent(rawBody, sig, secret)`)

---

**W8b AUDIT COMPLETE. Verdict: APPROVE WITH HIGH ISSUES. 17 findings (0 CRITICAL / 4 HIGH / 6 MEDIUM / 7 LOW).**
**Report: docs/execution-phase/wave-audits/reports/W8b-cluster-04-AUDIT-REPORT.md**

---

## Post-audit fix dispatch (2026-06-06)

All 17 findings addressed across 5 commits on `app/cluster-04-stripe` (pushed). Plus 1 integration-prep commit for Cluster 12.

| Finding | Severity | Commit | Status |
|---|---|---|---|
| H-1 normalizeStatus → 'active' fallback | HIGH | `db640c08` | ✅ fixed — explicit STRIPE_STATUS_MAP, unknown→'cancelled' + audit row |
| H-2 user_has_active_plan excludes trialing | HIGH | `f8288dbb` | ✅ fixed — new migration CREATE OR REPLACE FUNCTION |
| H-3 current_period_end SDK drift | HIGH | `db640c08` | ✅ fixed — extractCurrentPeriodEnd reads items[0] then root |
| H-4 webhook final-update swallow | HIGH | `db640c08` | ✅ fixed — try/catch + console.error breadcrumbs |
| M-1 useBrandPicker concurrent prefs race | MED | `f8288dbb` | ✅ fixed — set_user_preference RPC migration + composable |
| M-2 `!` non-null assertion | MED | `db640c08` | ✅ fixed — local-binding narrowing |
| M-3 stores swallow errors | MED | `eb791611` | ✅ fixed — KovaToast + console.error |
| M-4 avatar bucket RLS unverified | MED | `75a7e7c9` | ✅ docs — runbook §Avatar uploads bucket policy |
| M-5 JSON.parse(JSON.stringify) | MED | `eb791611` | ✅ fixed — structuredClone(toRaw(...)) |
| M-6 uncommitted use-account-section | MED | `75a7e7c9` | ✅ committed |
| L-1 accountUrl default | LOW | `db640c08` | ✅ fixed — requireAppUrl throws |
| L-2 lost DB error | LOW | `db640c08` | ✅ fixed — console.warn before return null |
| L-3 reconcile no continuation | LOW | `db640c08` | ✅ fixed — keyset cursor + MAX_BATCHES + truncated:true |
| L-4 invoices empty-id collision | LOW | `db640c08` | ✅ fixed — flatMap filter |
| L-5 escape helpers duplicated | LOW | `db640c08` | ✅ fixed — api/_shared/email-escape.ts + 4 imports |
| L-6 BrandPicker top-level await | LOW | `75a7e7c9` | ✅ fixed — onMounted in BrandPicker + IntegrationsSection |
| L-7 DONE commit count drift | LOW | `6b03dcb2` | ✅ fixed — DONE updated to 21 commits + fix-dispatch table |

**Bonus c12 integration prep (`738ff22b`):**
- `useAccountStore.save()` no longer writes `preferences` (avoid race with Cluster 12's per-key writes).
- New `setPreferenceAtomic(key, value)` calls `set_user_preference` RPC + mirrors draft/original.
- `ProfileSection.setPref` delegates to atomic path.
- `privacy-policy.md` gains the User preferences (Cluster 12) disclosure.
- 3 new tests cover atomic-write path + RPC error surfacing + no-preferences-in-save() invariant.

### Re-audit scope

Only the deltas above need verification. Quality gates after fix:
- `bun run test:unit`: 1707 pass / 0 fail / 99 skip (+3 vs. pre-fix)
- `bunx vite build`: 1.4s (PWA generated)
- `bun run test:dupes`: 1.18% (down from 1.21%)
- `bun run check`: 89 errors (unchanged baseline — all pre-existing in non-c04 code)

### Cross-cluster integration check

- **Cluster 01 (W8a):** `users.preferences` JSONB column ✅ shipped in `20260522_01_users_account_lifecycle.sql`. `stripe.customers.del()` in `api/cron/steps/stripe.ts` ✅ — D-2 contract satisfied.
- **Cluster 12 (W8c):** unblocked on c04-side. Remaining c12-side concern is the stub `supabase/functions/_shared/resend-client.ts` (c12 declared this would come from c01, but c01 chose Vercel `api/_shared/email.ts` instead — c12 must either port to Vercel `api/` or ship its own Supabase-Edge resend-client).

**Branch HEAD after fix dispatch:** `738ff22b` (pushed to `origin/app/cluster-04-stripe`).
