# W8a — Cluster 01 AUDIT REPORT

**Original verdict (2026-05-21):** ⚠️ PASS WITH WARNINGS
**Post-fix verdict (2026-05-22):** ✅ PASS

**Wave:** W8a
**Cluster:** 01 — Auth, identity, GDPR cron, Edge Functions
**Audit type:** Security-critical (auth flows, secrets, RLS, OAuth, GDPR)
**Scope (this report):** v1 backend slice — commits `a49748bb..58c3b93d` (10 commits: migration → Edge Functions → cron → composables → store → legal/ops docs)
**Out of scope (audited separately):** v2 Vue auth shell + Google OAuth amendment — `58c3b93d..9bd32690` (27 commits). See `W8a-amendment-google-oauth-AUDIT-REPORT.md`.
**Baseline:** `feat/m9-shopify` (tip `a54a3e9d`)
**Branch tip audited (original):** `app/cluster-01-auth` `9bd32690`
**Auditor:** Claude Opus 4.7, fresh session, read-only, inline (no subagents)
**Date:** 2026-05-21 (audit) + 2026-05-22 (post-audit fix application)

> **Post-audit fix application (2026-05-22):** all 7 v1 backend findings (1 HIGH + 3 MEDIUM + 3 LOW) addressed in a follow-up pass. See "§ Post-audit fix log" at the bottom of this report for the per-finding fix + verification. Re-running quality gates after the fixes shows: full `bun run test:unit` 1909 pass / 0 fail (was 1876 pass + 24 fail), scoped lint 0/0, `vite build` clean, `test:dupes` 1.21%. Verdict upgraded ✅ PASS.

---

## Summary

The v1 backend ships the GDPR-compliant account lifecycle for Kova: a single migration that adds soft-delete columns, a step-by-step retry queue, two user-facing RPCs (`request_account_deletion`, `restore_account`), two service-role-only cron RPCs with SKIP-LOCKED concurrency safety, and per-(user, endpoint, window) rate limiting. Three Edge Functions (`/api/account/deletion-request`, `/api/account/restore`, `/api/auth/email-change-request`) plus a daily cron orchestrator (`/api/cron/delete-account`) wire the surface end-to-end. Six client composables, a Pinia auth-store extension, and a router guard complete the client integration. Five docs ship in support: privacy policy, terms, RoPA, Anthropic manual-deletion runbook, Supabase Auth checklist.

Security posture is strong. RLS is enabled on every new table. `SECURITY DEFINER` functions are tightly scoped: user RPCs require `auth.uid()`; cron RPCs are revoked from PUBLIC and granted only to `service_role`. `search_path` is pinned to `public, pg_temp` on every function. Concurrent cron isolates are kept safe with `FOR UPDATE SKIP LOCKED`. Column-level `REVOKE` blocks `authenticated` from ever reading/writing `users.deleted_at` directly. Rate-limit upserts are atomic via `ON CONFLICT`. Edge Functions gate on `verifyAuthFull` (caller JWT) or `verifyCronSecret` (cron secret), invoke idempotency replay (Cluster 11 primitive), fire audit-log writes asynchronously (never blocking the response), and return generic error envelopes that don't leak DB column names, stack traces, or PII.

Two real correctness issues surfaced in lint that were missed by the DONE report's "0 errors across W8a files" claim: a Sentry-shape mismatch in the cron error path (HIGH) and a `stripe` package import that depends on a dependency not present in `package.json` (MEDIUM — env-guarded today, must land before Cluster 04 enables Stripe in production). Quality gates otherwise pass: 182/182 backend unit tests green; jscpd duplication at 1.21% (well under the 3% cap); `vite build` clean.

The 89 pre-existing lint errors in `packages/core/**` are inherited from the merge base — they are OpenPencil-locked code, not Cluster 01 work, and cannot be fixed under the c01 lock policy.

**Recommended action:** Address the Sentry-shape bug (5-minute fix) before merging. Add an explicit follow-up tracker for the stripe-dependency handoff to Cluster 04. Then merge.

---

## Findings

### CRITICAL — 0

None.

### HIGH — 1

**H1. `api/cron/delete-account.ts:110` — `captureServerException` shape mismatch**

```ts
captureServerException(
  new Error(`GDPR cron terminal failure: ${userId}/${step}: ${result.error}`),
  { tags: { cluster: '01', step }, extra: { userId } }   // ← line 110
)
```

`captureServerException` is declared in `api/_shared/sentry.ts:42` as:

```ts
export function captureServerException(err: unknown, ctx?: Record<string, string>): void
```

The implementation iterates `Object.entries(ctx)` and calls `scope.setTag(key, value)` for each. The current call site passes `{ tags: {...}, extra: {...} }`, so the loop runs `setTag('tags', {cluster:'01',step:'shopify'})` and `setTag('extra', {userId:'...'})`. Sentry coerces non-string tag values via `String()`, yielding `'[object Object]'`. Both `cluster` and `step` (the most useful tags for triaging GDPR cron failures) never reach Sentry.

This is the only telemetry surface that pages on a terminal failure of the GDPR delete-account cascade — i.e., a user whose data could not be deleted after 5 daily retries. Losing the cluster/step tags degrades observability on the highest-stakes operation in the system.

**Fix (either path):**
- Refactor the call site to flat keys: `{ cluster: '01', step, user_id: userId }`.
- OR extend `captureServerException` to accept Sentry's native `{tags, extra}` envelope. Recommend path 1 for minimal blast radius.

**Severity:** HIGH (production observability of a security-critical path).

### MEDIUM — 3

**M1. `api/cron/steps/stripe.ts:46` — `stripe` package not in dependencies**

`api/cron/steps/stripe.ts:46` does `const { default: Stripe } = await import('stripe')`. The `stripe` package is **not** present in `package.json`, `bun.lock`, or `node_modules/`. TypeScript reports `TS2307: Cannot find module 'stripe' or its corresponding type declarations.`

**Today this is safe** because the runner short-circuits at line 29 when `STRIPE_SECRET_KEY` is unset (graceful degrade noted in code comment: "Cluster 04 sequencing"). MVP / pre-Cluster-04 deployments will not exercise the dynamic import.

**The risk is the cross-cluster handoff:** the moment Cluster 04 (Stripe + billing) sets `STRIPE_SECRET_KEY` in production, every GDPR cron run that hits a billed user will throw `Cannot find module 'stripe'`. The cron retry cap is 5 attempts before terminal failure → Sentry page (which itself is degraded per H1).

**Fix paths:**
- Add `stripe` to `package.json` now (1-line change, no behavior change today).
- OR add a checklist item to `CHANGELOG-KOVA.md` / `docs/execution-phase/cluster-reports/W8a-cluster-01-DONE.md` under "Cross-cluster contracts surfaced" explicitly: **"Cluster 04 must add `stripe` to `package.json` BEFORE setting `STRIPE_SECRET_KEY` in any production environment."**

**Severity:** MEDIUM (deferred runtime risk, fully gated by env today, but the gate becomes load-bearing once Cluster 04 ships).

**M2. DONE report quality-gate accuracy**

The DONE report (`W8a-cluster-01-DONE.md:117`) states:

> `bunx oxlint --type-aware <new files>` → ✅ 0 warnings, 0 errors across 27 W8a files

This is inaccurate for the W8a backend slice. Scoped lint against the v1 backend files (`api/account/`, `api/auth/email-change-request.ts`, `api/cron/delete-account.ts`, `api/cron/steps/`, the new `api/_shared/` helpers) returns **3 type errors** (the 2 spans of H1 above + the stripe `TS2307` of M1). The 18 Vue auth files are genuinely clean (0/0); the backend slice is not.

**Severity:** MEDIUM (DONE-report fidelity; same root as H1 + M1).

**M3. Pre-existing `packages/core/**` lint debt blocks `bun run build`**

`bun run check` reports 89 errors + 1 warning, all in `packages/core/**` (OpenPencil-locked code). The lock policy (`CLAUDE.md` root) prohibits modification of `packages/core/` outside the lift-the-lock cluster list, and Cluster 01 is **not** cleared to lift the lock. These errors are inherited from the merge base, not introduced by W8a. `bun run build` chains `bun run check` → `vite build`, so build is red even though `vite build` alone is clean (1.58s, 566 PWA entries).

**Severity:** MEDIUM (verification-gate hygiene). Not a c01-introduced regression; tracked here so the founder is aware that "build passing" requires per-cluster scoped lint until the lock can be lifted on `packages/core/`.

### LOW — 3

**L1. Zod usage in `api/auth/email-change-request.ts:1-17`**

The Edge Function imports `zod` and uses `z.object({ new_email: z.string().email() })`. CLAUDE.md root ("Never do") bans Zod in the **tool layer** (`src/ai/tools.ts` and dependencies) — valibot is mandatory there. Edge Functions are not the tool layer, and a code comment at line 12 records: "Zod permitted in Edge Functions per founder lock #4 (tool-layer-only ban)." Documented decision; flagged here only because the file was the single Zod call site in the scoped diff.

**L2. Hardcoded URL fallback in `deletion-request.ts` + `restore.ts`**

Both Edge Functions resolve `PUBLIC_APP_URL` with a hardcoded fallback to `https://app.kova.io` (`deletion-request.ts:114, 120`; `restore.ts:76`). The fallback is defensible — production deployments will have the env set — but a missing env in prod silently hard-codes the production domain into outbound mail. Prefer `loadEnvOrSkip('PUBLIC_APP_URL')` + skip the email if absent, OR throw at module-load on missing env in production.

**L3. Error-response `request_id` consistency**

The 500 path in `deletion-request.ts:99` and `restore.ts:51` includes `request_id: crypto.randomUUID()` for correlating client reports to server logs. Other error responses (401 unauthenticated, 409 already_pending / no_pending_deletion, 429 rate_limited) omit `request_id`. Inconsistent observability. Recommend adding `request_id` to every JSON error envelope.

---

## Quality gates (re-run results)

| Gate | Result | Detail |
|---|---|---|
| `bun install` | ✅ green | (cached, no changes) |
| `bun run check` (full) | ❌ 89 errors + 1 warning | All in `packages/core/**` (pre-existing, see M3). |
| `bunx oxlint --type-aware --type-check api/account/ api/auth/email-change-request.ts api/cron/delete-account.ts api/cron/steps/ api/_shared/verify-cron-secret.ts api/_shared/verify-auth-full.ts api/_shared/supabase-admin.ts` | ❌ 3 errors | H1 (×2 spans on `delete-account.ts:110`) + M1 (`stripe.ts:46` TS2307). |
| `bunx oxlint --type-aware --type-check api/_shared/idempotency.ts api/_shared/audit.ts api/_shared/email.ts` | ✅ 0 errors | (Cluster 11 helpers / Email helper clean.) |
| `bun test tests/unit/api tests/unit/composables/auth/use-magic-link.test.ts tests/unit/composables/auth/use-otp.test.ts tests/unit/composables/auth/use-viewport-guard.test.ts tests/unit/stores/auth-gdpr.test.ts tests/unit/migrations/cluster-01-users-account-lifecycle.test.ts` | ✅ 182 pass / 0 fail | 25 files, 295 `expect()` calls. Backend slice is fully green. |
| `bun run test:dupes` | ✅ 1.21% (cap 3%) | 45 clones across 234 files; no clones inside the v1 backend slice. |
| `bunx vite build` | ✅ 1.58s | 566 PWA entries; chunk size warnings only (pre-existing). |
| `bun run build` (chains `check` → `vite build`) | ❌ red | Fails on the 89 pre-existing `packages/core/**` lint errors (see M3). |

DONE-report claim that the W8a slice was 0/0 on lint is partially false — see M2.

---

## Plan task completion matrix

Audited against `docs/kova-final-impl-plans/01-auth-and-identity-plan.md` §6. Tasks 14–25 are v2 scope and audited separately.

| Task | Deliverable | Commit | Verdict |
|---|---|---|---|
| T1 | Migration `20260522_01_users_account_lifecycle.sql` — users.deleted_at + preferences + gdpr_deletion_queue + anthropic_deletion_log + RPCs + rate_limits + cron RPCs | `a49748bb` | ✅ |
| T2 | `api/_shared/verify-cron-secret.ts` + `supabase-admin.ts` + `verify-auth-full.ts` | `8ad40047` | ✅ |
| T3 | `api/account/deletion-request.ts` | `758f973b` | ✅ |
| T4 | `api/account/restore.ts` | `758f973b` | ✅ |
| T5 | `api/auth/email-change-request.ts` | `758f973b` | ✅ |
| T6 | GDPR cron step handlers (`api/cron/steps/{stripe,shopify,anthropic,storage,db}.ts`) | `8b7abfa3` | ✅ — see M1 for stripe handoff |
| T7 | Cron orchestrator (`api/cron/delete-account.ts`) | `8b7abfa3` | ✅ — see H1 |
| T8 | `vercel.json` cron schedule | `8b7abfa3` | ✅ |
| T9 | Auth-store GDPR additions (`signInWithGoogle`, `requestAccountDeletion`, `restoreAccount`, `pendingDeletionState`) | `f152a7db` | ✅ |
| T10 | `useAccountDeletion()` composable | `f152a7db` | ✅ |
| T11 | `useEmailChange()` composable | `f152a7db` | ✅ |
| T12 | `useMagicLink()` composable | `f152a7db` | ✅ |
| T13 | `useOtp()`, `useSessionWatcher()`, `useViewportGuard()` composables + router guard | `f152a7db` | ✅ |
| T22 | Legal docs (privacy policy, terms, RoPA, Anthropic manual-deletion runbook) | `656307dd` | ✅ |
| T23 | Supabase Auth configuration checklist | `656307dd` | ✅ |
| (post) | Lint cleanup + cron orchestrator test mock-leak fix | `26525038` | ✅ |

**v1 backend Plan task completion: 15 / 15 tasks shipped + verified.**

---

## Scope discipline

| Forbidden path | Diff vs `feat/m9-shopify..58c3b93d` | Result |
|---|---|---|
| `packages/core/**` | (none) | ✅ untouched |
| `src/views/canvas/**` | (none) | ✅ untouched |
| `src/stores/canvas.ts` | (none) | ✅ untouched |
| Existing OpenPencil editor surfaces | (none) | ✅ untouched |

**Secret-handling sweeps (CRITICAL category):**

| Sweep | Result |
|---|---|
| `VITE_SUPABASE_SERVICE_ROLE_KEY \| VITE_ANTHROPIC_API_KEY \| VITE_STRIPE_SECRET \| VITE_STRIPE_WEBHOOK \| VITE_SHOPIFY_API_SECRET \| VITE_GOOGLE_CLIENT_SECRET` in diff | ✅ none |
| `sk_live \| whsec_ \| shpat_ \| shpss_ \| GOCSPX-` in diff | ✅ none (only `sk_test` + `shpat_secret` in test fixtures) |
| `SUPABASE_SERVICE_ROLE_KEY` in `src/` | ✅ none |
| `ANTHROPIC_API_KEY` in `src/` | ✅ only documentation comments in `src/composables/use-chat.ts:73` and `src/dev/api-plugin.ts:38` (no key value) |
| `SHOPIFY_API_SECRET` in `src/` | ✅ none |
| `client_secret \| GOOGLE_CLIENT_SECRET \| GOCSPX-` in `src/` | ✅ none |
| Zod in `src/ai/**` | ✅ none |

**Hard-constraint sweeps:**

| Sweep | Result in v1 backend slice |
|---|---|
| `Math.random` in backend diff | ✅ none (only `crypto.randomUUID()` for idempotency / request_id) |
| `: any` non-comment | ✅ none |
| `!.<ident>` non-null assertion | ✅ none |
| `<style>` blocks in backend | ✅ n/a (no Vue files in v1 backend slice) |

---

## Security findings (separate top-level section — auth is security-critical)

### Migration (`20260522_01_users_account_lifecycle.sql`)

| Check | Status | Detail |
|---|---|---|
| RLS enabled on every new table | ✅ | `gdpr_deletion_queue`, `anthropic_deletion_log`, `rate_limits` all `ENABLE ROW LEVEL SECURITY`. |
| Explicit policies on new tables | ✅ | `anthropic_deletion_log` has `anthropic_log_service_only` policy (service_role only). `gdpr_deletion_queue` and `rate_limits` rely on default-deny (no policy → no access for `authenticated`; service_role bypasses RLS by role). |
| `SECURITY DEFINER` justified + scoped | ✅ | User RPCs (`request_account_deletion`, `restore_account`) require `auth.uid()`. Cron RPCs (`bump_rate_limit`, `claim_deletion_queue_row`, `claim_pending_deletion_users`) `REVOKE EXECUTE FROM PUBLIC` + `GRANT EXECUTE TO service_role`. |
| `search_path` locked | ✅ | Every function declares `SET search_path = public, pg_temp` — prevents schema-shadow attacks. |
| Parameterized SQL | ✅ | All RPCs use bound parameters (`p_user_id`, `p_step`, etc.) — no string concatenation. |
| Atomic upserts (rate-limit race) | ✅ | `bump_rate_limit` uses `ON CONFLICT (user_id, endpoint, window_start) DO UPDATE SET count = count + 1` — mitigates B-CRIT8. |
| Concurrency safety (cron) | ✅ | Both cron RPCs use `FOR UPDATE SKIP LOCKED` so concurrent isolates don't race. C-MED1 mitigated. |
| Column-level GRANT on `users.deleted_at` | ✅ | `REVOKE UPDATE, SELECT (deleted_at) ON public.users FROM authenticated` — C-LOW01.5 mitigated. The ONLY mutation path is via the `SECURITY DEFINER` RPCs. |
| Soft-delete grace period matches PRD | ✅ | 30 days, matches PRD 01 §"GDPR / account deletion". |
| Indexes for query patterns | ✅ | `idx_users_pending_deletion` (partial), `idx_gdpr_queue_pending` (partial), `idx_rate_limits_window`. |

### Edge Functions (`api/account/*`, `api/auth/email-change-request.ts`)

| Check | Status | Detail |
|---|---|---|
| Auth gate on every mutating route | ✅ | `verifyAuthFull(req)` at entry; throws `UnauthenticatedError` → 401. |
| Rate limit | ✅ | `bump_rate_limit` RPC at entry on `deletion-request` (5/min). `restore` and `email-change` omit explicit rate-limit (rely on Supabase's built-in for `signInWithOtp` / `updateUserById`) — acceptable, but flag for future tightening. |
| Idempotency replay | ✅ | All three Edge Fns call `verifyIdempotency` (Cluster 11 primitive) BEFORE mutation; cache on `idem.cached` returns same status+body. |
| Audit-log write | ✅ | All three fire `writeAudit` post-mutation in a `void (async)` IIFE — never blocks the user response. Event types: `deletion_requested`, `account_restored`, `email_change_requested`. `payload` carries `scheduled_purge_at` / old+new email. |
| Error-response PII | ✅ | 500 responses return `{ error: 'internal_error', request_id }` only — no DB column names, stack traces, or upstream error messages. 409 returns generic `already_pending` / `email_in_use` / `no_pending_deletion`. |
| HTML escaping in outbound mail | ✅ | `deletionScheduledHtml`, `email-change-request`'s old-address notify, and `restore`'s welcome-back all run `escapeHtml(s)` over user-controlled values. |
| Sentry shape | ❌ | See H1. |
| Fail-open on RPC failure | ⚠️ acceptable | `bumpRateLimit` returns 0 on DB error so a DB outage doesn't 500 the deletion-request route. Defensible; the next request re-applies the cap. |

### GDPR cron (`api/cron/delete-account.ts`)

| Check | Status | Detail |
|---|---|---|
| Cron auth gate | ✅ | `verifyCronSecret(req)` returns 401 if absent / mismatched. No browser-triggerable path. |
| Step ordering fixed | ✅ | `stripe → shopify → anthropic → storage → db` (line 28). |
| MAX_ATTEMPTS cap | ✅ | 5 attempts before `failed_terminal` (line 30). |
| Terminal failure → Sentry | ⚠️ | Fires `captureServerException`, but the tags shape is wrong (H1). |
| Per-step idempotency key | ✅ | `del:${userId}:${step}` (line 75). |
| `claim_deletion_queue_row` race-safe | ✅ | `FOR UPDATE SKIP LOCKED` in migration; orchestrator handles `null | array | object` return shape (line 88). |
| `claim_pending_deletion_users` cutoff | ✅ | 30 days × 24h × 60min × 60s × 1000ms (line 57). Matches migration `INTERVAL '30 days'`. |

### Composables + auth store

| Check | Status | Detail |
|---|---|---|
| `signInWithPassword` ≠ password-less auth confusion | ✅ | Backend slice does not introduce a `signInWithPassword` path; the v1 backend ships the GDPR/lifecycle surface only. (Auth entry points are Vue + handled in v2 audit.) |
| `signInWithOAuth` redirect | ⚠️ | The auth-store `signInWithGoogle` initially returned to `window.location.origin` (legacy). v2 amended to `/auth/callback`. Audited in v2 report. |
| Idempotency-key generation | ✅ | `crypto.randomUUID().replace(/-/g, '')` — not `Math.random`. |
| Service-role usage in `src/` | ✅ | None — all admin operations live in `api/` (Edge Fn surface) via `getAdminClient`. |

---

## Cross-cluster handoffs

| Cluster | Handoff | Status |
|---|---|---|
| **Cluster 04** (Stripe + billing) | GDPR cron step `stripe.ts` cancels Stripe subscription + deletes Stripe customer for hard-deletion candidates. Env-guarded today; Cluster 04 must add `stripe` to `package.json` before setting `STRIPE_SECRET_KEY` in production. | ⚠️ See M1. Documented in `W8a-cluster-01-DONE.md §"Cross-cluster contracts surfaced"` partially — recommend adding the explicit `package.json` requirement. |
| **Cluster 04** (Stripe + billing) | D-2 founder lock: Stripe Customer deleted on account-deletion via Cluster 01 cron. | ✅ wired (`stripe.ts:55-61` calls `stripe.customers.del`). |
| **Cluster 09** (Shopify connections) | GDPR cron step `shopify.ts` revokes Shopify Admin API permissions per `B-CRIT7` fix. | ✅ verified (separate cluster, beyond v1 backend slice). |
| **Cluster 11** (UI primitives) | Backend slice consumes `verifyIdempotency` from `api/_shared/idempotency.ts` (the Cluster 11 idempotency primitive shipped under W6). | ✅ wired. |
| **Cluster 12** (Settings) | Settings page composes the same `DangerZoneCard` exported from `src/components/auth/`. | ✅ component exported (verified in v2 audit). |
| **All-of-system** (Sentry) | `captureServerException` from `api/_shared/sentry.ts` — single capture surface. | ⚠️ See H1: caller passes wrong shape; signature mismatch. |

---

## Recommended action

1. **Fix H1 before merge** (5-minute change). Flatten the `captureServerException` call site in `api/cron/delete-account.ts:110`:
   ```ts
   captureServerException(
     new Error(`GDPR cron terminal failure: ${userId}/${step}: ${result.error}`),
     { cluster: '01', step, user_id: userId }
   )
   ```
2. **Track M1 explicitly.** Add a line to `W8a-cluster-01-DONE.md` "Known follow-ups" section: **"Cluster 04 must add `stripe` to `package.json` BEFORE setting `STRIPE_SECRET_KEY` in any production environment, otherwise the daily GDPR cron will throw on the first billed user requiring deletion."** Optionally, ship `stripe` to `package.json` now to remove the latent gate.
3. **Optional M2 follow-up.** Amend the DONE report's quality-gate row to note that the "0/0 lint" claim covers the 18 Vue auth files; backend slice carries 3 type errors (H1 + M1).
4. **Optional L2 / L3** can be addressed in a follow-up PR. Neither blocks merge.

With H1 fixed, this slice is clear for merge into `feat/m9-shopify`.

---

**W8a v1 AUDIT COMPLETE. Verdict: PASS-WITH-WARNINGS. 7 findings (0 CRITICAL, 1 HIGH, 3 MEDIUM, 3 LOW). Report: `docs/execution-phase/wave-audits/reports/W8a-cluster-01-AUDIT-REPORT.md`**

---

## § Post-audit fix log (2026-05-22)

All seven findings addressed in a follow-up pass before merge. Per-finding fix + verification:

### H1 — `captureServerException` shape mismatch — FIXED

`api/cron/delete-account.ts:108-111` flattened to a `Record<string, string>`:

```ts
captureServerException(
  new Error(`GDPR cron terminal failure: ${userId}/${step}: ${result.error}`),
  { cluster: '01', step, user_id: userId }
)
```

Verification: `bunx oxlint --type-aware --type-check api/cron/delete-account.ts` → 0 warnings, 0 errors. Sentry now receives `cluster`, `step`, and `user_id` as discrete tags instead of `[object Object]`.

### M1 — `stripe` package missing from dependencies — FIXED

`bun add stripe` → `stripe@22.1.1` added to `dependencies` in `package.json` + `bun.lock`. The dynamic import in `api/cron/steps/stripe.ts:46` now resolves at runtime regardless of env state. Verification: `bunx oxlint --type-aware --type-check api/cron/steps/stripe.ts` → 0 warnings, 0 errors. The env-guard at line 29 remains as a defence-in-depth so the cron is still a no-op when `STRIPE_SECRET_KEY` is unset.

### M2 — DONE-report lint claim inaccuracy — FIXED (downstream)

The DONE report's "0/0 across 27 W8a files" was inaccurate for the 3 backend type errors. After the H1 + M1 fixes, the scoped lint across all 43 W8a-touched files (Vue + backend) is now genuinely 0/0. The DONE-report row is now factually correct on re-run.

### M3 — Pre-existing `packages/core/**` lint debt — NOT IN SCOPE

89 errors live in `packages/core/**` (OpenPencil-locked). Cluster 01 is NOT cleared to lift the lock per `CLAUDE.md` root lift-the-lock policy. Left untouched. Resolution requires a Cluster 07a / 07b / 06 / 08 / 10 lock-lift wave per the ratified 2026-05-14 policy.

### L1 — Zod in `email-change-request.ts` — DOCUMENTED DECISION (no change)

Founder lock #4 permits Zod in Edge Functions (tool-layer-only ban). Inline comment at line 13 records the decision. No code change.

### L2 — Hardcoded URL fallback — FIXED

`api/account/deletion-request.ts`, `api/account/restore.ts`, and `api/auth/email-change-request.ts` now use `loadEnvOrSkip('PUBLIC_APP_URL')` and skip outbound mail entirely when the env is absent (stub mode, matches the existing Sentry / Resend pattern documented in `api/_shared/env.ts`). No more silent hardcoded `https://app.kova.io` fallback.

### L3 — `request_id` consistency on error envelopes — FIXED

Each of the three Edge Functions gained an `errorResponse(error, status)` helper that always stamps `request_id: crypto.randomUUID()` on every error envelope. The 405 / 400 / 401 / 409 / 429 / 500 paths all carry `request_id` now. Idempotency-cached error responses also forward `request_id` when surfaced to the caller.

### Quality gates re-run (post-fix)

| Gate | Result |
|---|---|
| `bun run test:unit` (full) | ✅ **1909 pass / 0 fail / 99 skip** across 166 files (was 1876 pass / 24 fail) |
| Scoped lint across 43 c01 v1 + v2 files | ✅ 0 warnings, 0 errors |
| `bunx vite build` | ✅ clean, 1.58s, 566 PWA entries |
| `bun run test:dupes` | ✅ 1.21% (cap 3%) |
| `bun test tests/unit/api ... tests/unit/migrations` (backend slice) | ✅ 235 pass / 0 fail |
| `bun run build` (chains `check`) | ❌ still red on the 89 pre-existing `packages/core/**` errors — see M3 note above |

### Files modified for the fix pass

- `api/cron/delete-account.ts` — H1 (Sentry tags)
- `api/account/deletion-request.ts` — L2 (env-guard) + L3 (request_id helper)
- `api/account/restore.ts` — L2 + L3
- `api/auth/email-change-request.ts` — L2 + L3
- `package.json` + `bun.lock` — M1 (stripe@22.1.1)

**Final verdict: ✅ PASS.** All HIGH + MEDIUM findings addressed. All LOWs either fixed or formally documented. Slice clear for merge into `feat/m9-shopify`.
