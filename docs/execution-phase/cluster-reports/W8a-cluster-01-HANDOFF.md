# W8a Cluster 01 — Handoff Doc for Resume Agent

> **Read this end-to-end before touching any file.** This doc is self-contained — pair it with `docs/kova-final-impl-plans/01-auth-and-identity-plan.md` (your authoritative Plan) and the W8a execution prompt at `docs/execution-phase/execution-prompts/W8a-cluster-01-auth.md`.

---

## TL;DR

Previous agent shipped **backend foundation only** for W8a Cluster 01 (Auth + Identity + GDPR cascade). All Edge Functions, RPCs, cron handlers, composables, Pinia store extension, router guard, legal docs, and Supabase config checklist done. **All Vue work blocked on Phase 1 audit gate** (mandatory per `IMPLEMENTATION_PROMPT.md` §3 — `KOVA_AUDIT.md` + `tokens-used.md` + founder approval before any Vue code).

Your job: **resume from Task 14**. Run Phase 1 audit gate first. Get founder approval. Build 11 Vue auth views + 11 shared auth-shell components + DangerZoneCard. Wire router (Task 13.3 deferred). Run cluster-end gates (Task 25). Ship.

---

## 1. Branch + worktree state

| Field | Value |
|---|---|
| **Worktree path** | `/Users/jihoyang/kova-build-c01` |
| **Branch** | `app/cluster-01-auth` |
| **Tip** | `cf838f5b` (pushed to `origin/app/cluster-01-auth`) |
| **Cut from** | `feat/m9-shopify` at `fb1e540a` |
| **Commits ahead** | 9 |
| **Status** | clean — no uncommitted work |

Pre-flight verification (run on session start):

```bash
cd /Users/jihoyang/kova-build-c01
pwd                           # must print /Users/jihoyang/kova-build-c01
git branch --show-current     # must print app/cluster-01-auth
git status                    # must print "nothing to commit, working tree clean"
git log --oneline -10         # confirm 9 c01 commits on top of fb1e540a
```

If any of these are wrong, **STOP and ask founder via AskUserQuestion**.

---

## 2. What's DONE (Tasks 1–13 + 22 + 23)

### 2.1 Backend files created

| Path | Purpose | Test path | Test count |
|---|---|---|---|
| `supabase/migrations/20260522_01_users_account_lifecycle.sql` | users.deleted_at + users.preferences + gdpr_deletion_queue + anthropic_deletion_log + rate_limits + 5 RPCs | `tests/unit/migrations/cluster-01-users-account-lifecycle.test.ts` | 29 |
| `api/_shared/verify-cron-secret.ts` | Constant-time CRON_SECRET compare | `tests/unit/api/_shared/verify-cron-secret.test.ts` | 7 |
| `api/_shared/supabase-admin.ts` | Cached service-role client `getAdminClient()` | (none yet — trivial) | 0 |
| `api/_shared/verify-auth-full.ts` | Adapter returning `{ supabase, userId, email }` for c01 Edge Fns | (none yet — trivial) | 0 |
| `api/account/deletion-request.ts` | POST /api/account/deletion-request | `tests/unit/api/account/deletion-request.test.ts` | 7 |
| `api/account/restore.ts` | POST /api/account/restore | `tests/unit/api/account/restore.test.ts` | 5 |
| `api/auth/email-change-request.ts` | POST /api/auth/email-change-request | `tests/unit/api/auth/email-change-request.test.ts` | 5 |
| `api/cron/steps/stripe.ts` | Cancel sub + delete Stripe customer | `tests/unit/api/cron/steps/stripe.test.ts` | 5 |
| `api/cron/steps/shopify.ts` | Per-brand OAuth revoke | `tests/unit/api/cron/steps/shopify.test.ts` | 4 |
| `api/cron/steps/anthropic.ts` | DB delete + log to anthropic_deletion_log | `tests/unit/api/cron/steps/anthropic.test.ts` | 3 |
| `api/cron/steps/storage.ts` | Paginated bucket purge | `tests/unit/api/cron/steps/storage.test.ts` | 4 |
| `api/cron/steps/db.ts` | Mark queue succeeded → cascade delete users row → final email | `tests/unit/api/cron/steps/db.test.ts` | 3 |
| `api/cron/delete-account.ts` | Cron orchestrator | `tests/unit/api/cron/zz-orchestrator.test.ts` | 7 |
| `src/composables/auth/use-magic-link.ts` | useMagicLink + 60s cooldown | `tests/unit/composables/auth/use-magic-link.test.ts` | 5 |
| `src/composables/auth/use-otp.ts` | useOtp + 5-attempt lockout | `tests/unit/composables/auth/use-otp.test.ts` | 6 |
| `src/composables/auth/use-account-deletion.ts` | Delegates to Pinia | (covered by store tests) | 0 |
| `src/composables/auth/use-email-change.ts` | POST /api/auth/email-change-request + 1h cooldown | (none yet — trivial) | 0 |
| `src/composables/auth/use-session-watcher.ts` | onAuthStateChange SIGNED_OUT → /auth/session-expired | (none yet — trivial) | 0 |
| `src/composables/auth/use-viewport-guard.ts` | isDesktop / isTablet / isMobile reactive | `tests/unit/composables/auth/use-viewport-guard.test.ts` | 5 |
| `src/router/guards/auth-guard.ts` | viewport → session → requiresAuth | `tests/unit/router/guards/auth-guard.test.ts` | 7 |
| `src/stores/auth.ts` (modified additively) | Added pendingDeletion + scheduledPurgeAt + requestAccountDeletion + restoreAccount | `tests/unit/stores/auth-gdpr.test.ts` | 6 |
| `vercel.json` (modified) | Added daily 03:00 UTC cron entry | n/a | n/a |
| `docs/legal/privacy-policy.md` | GDPR Art. 15-21 + sub-processor disclosure | n/a | n/a |
| `docs/legal/terms.md` | Service terms (engineering draft) | n/a | n/a |
| `docs/legal/ropa.md` | Art. 30 record-of-processing-activities | n/a | n/a |
| `docs/operations/anthropic-manual-deletion-runbook.md` | Operator weekly drain procedure | n/a | n/a |
| `docs/operations/supabase-auth-config.md` | Supabase Studio settings checklist | n/a | n/a |
| `docs/execution-phase/cluster-reports/W8a-cluster-01-PROGRESS.md` | Progress report (sibling to this doc) | n/a | n/a |

**Total: 140/140 c01 tests pass. Lint baseline preserved (89 errors / 1 warning — pre-existing, none added).**

### 2.2 Commit history (9 commits on `app/cluster-01-auth`)

```
cf838f5b docs(c01): W8a progress report
656307dd docs(c01-t22,t23): legal docs + Supabase auth config checklist
26525038 fix(c01-review): lint cleanup + cron orchestrator test mock-leak fix
8b7abfa3 feat(c01-t9-13): auth store GDPR additions + 6 composables + router guard
[...] feat(c01-t6,7,8): GDPR cron orchestrator + 5 step handlers + vercel.json schedule
[...] feat(c01-t3,4,5): Edge Functions for account-deletion / restore / email-change
[...] feat(c01-t2): _shared helpers — verify-cron-secret + supabase-admin + verify-auth-full
[...] feat(c01-t1): migration for users lifecycle + GDPR queue + RPCs
fb1e540a docs(wave-audits): add W7-W12 cluster audit prompts + W7 cluster-07a audit report
```

---

## 3. Founder decisions ratified during previous session

These are **load-bearing**. Encode them in your behavior:

### 3.1 Auth model = magic-link + OTP only (passwordless)

The execution prompt at `docs/execution-phase/execution-prompts/W8a-cluster-01-auth.md` mentions `signInWithPassword (per B-CRIT13 fix)`. **This is stale.** PRD 01 §1.3 + Plan 01 specify magic-link + OTP passwordless. Founder ratified PRD direction on 2026-05-21.

**Implication for you:** SignupView + LoginView (Tasks 17) use `useMagicLink` + `useOtp` composables. No password fields. `/forgot-password` route exists but entry point is gated behind `FORGOT_PASSWORD_ENABLED = false` feature flag.

### 3.2 Shopify OAuth SKIPPED in c01

Execution prompt lists `/api/auth/shopify/{install,callback,revoke}` as in-scope. **PRD §13.8 hands Shopify ownership to Cluster 04 + M9 reuse.** Founder ratified PRD direction on 2026-05-21. No Shopify endpoints in c01.

### 3.3 Full Plan 01 scope (not prompt's narrow scope)

Execution prompt summary lists ~7 Edge Fns + 5 Vue pages + 1 Resend template. **Plan 01 is 25 tasks / 94 steps + 11 Vue pages + 4 Resend templates + full GDPR 5-step cron.** Founder ratified full Plan scope on 2026-05-21.

### 3.4 Authority chain when prompt and PRD/Plan conflict

PRD wins. Plan wins. Execution prompt is stale dispatch metadata. Per `MASTER-EXECUTION-GUIDE.md` §1 authority chain.

---

## 4. Deviations from Plan code (critical to know)

Plan 01 was drafted with assumptions about Cluster 11 helper shapes that landed differently. These adaptations are in code — match them when writing Tasks 14+ (Vue calls into these helpers).

### 4.1 `verifyIdempotency` signature

**Plan expected:** `verifyIdempotency(supabase, { key, method, path, bodyText })` → `{ cached, conflict }`

**Actual (Cluster 11):** `verifyIdempotency(supabaseAdmin: SupabaseClient, req: Request, userId: string, endpoint: string)` → `IdempotencyResult` which is either:
- `{ cached: false, persist: (status: number, body: unknown) => Promise<void> }`
- `{ cached: true, status: number, body: unknown }`

May throw `IdempotencyHttpError(status, payload)`.

Auto-extracts X-Idempotency-Key header + bodyText internally. Caller passes `req` directly.

**Edge Fns I wrote use the actual contract.** Your Vue code doesn't touch this — Vue calls Edge Fns via fetch.

### 4.2 `sendEmail` signature

**Plan expected:** `sendEmail({ to, subject, templatePath, variables })`

**Actual (Cluster 11 at `api/_shared/email.ts`):**
```typescript
sendEmail({ to, subject, html, text?, from?, replyTo?, unsubscribeUrl })
  → { ok: boolean, skipped?: boolean, id?: string, error?: string }
```

`unsubscribeUrl` is REQUIRED. Caller pre-renders HTML; no template loading.

Edge Functions I wrote inline the HTML body. **Task 21 will swap to `<EmailShell>` composition when Cluster 11 ships it.**

### 4.3 `verifyAuth` does NOT exist in Cluster 11

Plan references `verifyAuth(req)` returning `{ supabase, userId, email }`. Cluster 11 ships `authenticateRequest(req)` returning `{ userId }` OR a 401/500 `Response`.

**Adapter built at `api/_shared/verify-auth-full.ts`** — exports `verifyAuthFull(req)` returning `{ supabase, userId, email }` + throws `UnauthenticatedError`. Use this in any new Edge Fn you write.

### 4.4 `getAdminClient` built fresh

Plan Task 7 references `_shared/supabase-admin`. Did not exist. **Built at `api/_shared/supabase-admin.ts`** — exports `getAdminClient(): SupabaseClient` (cached singleton, service-role key). Use for rate limit + audit log + service-role-only tables.

### 4.5 `useAuthStore` refactor is ADDITIVE, not destructive

Plan Task 9 says "REMOVE password methods, fix all callers." I instead **kept M5-era password methods** (`signIn`, `signUp`, `signInWithGoogle`, `updateName`) marked `@deprecated`. Reason: 9+ existing callers (LoginView, SignupView, NameStep, BrandSettingsView, AccountMenu, useOnboardingComplete, etc.) would all break. Tasks 17+ rewrite those views around magic-link composables; deprecated methods retire when callers no longer reference them.

**Implication for you when writing new LoginView / SignupView in Tasks 17:** use `useMagicLink` + `useOtp` from `src/composables/auth/`, NOT `store.signIn` / `store.signUp`. When the rewrites land + callers stop using deprecated methods, delete them from the store.

### 4.6 Migration filename `20260522_01_*` (not Plan's `20260515_01_*`)

To land AFTER Cluster 11's `20260521_11_idempotency_keys.sql`. Plan's backdated filename would have applied out-of-order on production. **Already applied locally** via `psql -f` against the shared supabase at port 54322.

### 4.7 Migration consolidates Task 6c + Task 7 additions

Plan iterates on the migration mid-cluster (Task 6c adds `anthropic_deletion_log`, Task 7.3 adds `claim_*` RPCs). To avoid re-editing the same file 3 times, **all consolidated into the single Task 1 migration**. The file already contains `claim_deletion_queue_row` + `claim_pending_deletion_users` + `anthropic_deletion_log`.

### 4.8 No `_shared/sentry` wrapper change

Plan references `captureException`. Cluster 11 exports `captureServerException(error, context)`. Orchestrator uses the actual name.

---

## 5. Quality gates status

### 5.1 Passed

- ✅ 140/140 c01 unit tests pass (`bun test tests/unit/migrations/cluster-01 tests/unit/api/_shared/verify-cron-secret tests/unit/api/account tests/unit/api/auth tests/unit/api/cron tests/unit/stores/auth.test.ts tests/unit/stores/auth-gdpr.test.ts tests/unit/composables/auth tests/unit/router/guards`)
- ✅ Lint baseline preserved: 89 errors / 1 warning (run `bun run check` from c01 worktree — count must stay ≤ 89 errors / 1 warning)
- ✅ Migration applied to local Supabase (shared instance, port 54322)
- ✅ Branch pushed to `origin/app/cluster-01-auth`

### 5.2 Not run (your job)

- ❌ `superpowers:code-reviewer` agent (cluster-end gate per Plan Task 25)
- ❌ `security-auditor` agent (mandatory per execution prompt — auth is security-critical)
- ❌ `database-reviewer` agent (review migration + RPCs)
- ❌ `e2e-runner` agent (Shopify OAuth round-trip + signup flow — note: Shopify part skipped per §3.2)
- ❌ Playwright visual diff (per IMPLEMENTATION_PROMPT.md §6 — 0.1% component / 0.5% screen thresholds)
- ❌ `bun run build` (full build verify)
- ❌ `bun run test:dupes` (jscpd < 3%)
- ❌ Founder browser smoke per `feedback_browser_smoke_test_before_done` memory

---

## 6. What's BLOCKED — your starting point

### 6.1 The blocker: Phase 1 audit gate (MANDATORY)

Per `docs/execution-phase/claude-design-files/IMPLEMENTATION_PROMPT.md` §3 + RIDER §1 + MASTER §4 STAGE 3: **no Vue code may be written before** these two docs exist + founder approves them:

#### Document 1: `docs/execution-phase/cluster-audits/cluster-01-audit.md` (`KOVA_AUDIT.md`)

Per IMPLEMENTATION_PROMPT.md §3 must include:
- §1.1 Token map (every short token from `kova-hifi-light.css :root` → Tailwind `@theme` block)
- §1.2 Existing-component inventory (every Vue component in `src/components/`)
- §1.3 Reuse decisions (per `design.md` §3 component — reuse / extend / build new)
- §1.4 New tokens needed
- §1.5 New components needed
- §1.6 Open questions

#### Document 2: `docs/execution-phase/cluster-audits/cluster-01-tokens-used.md` (`tokens-used.md`)

Per IMPLEMENTATION_PROMPT.md §3 must enumerate **every visual value** across all c01 hi-fi files mapped to either an existing token or `⚠️ MISSING`:
- Colors table
- Spacing table (px exact)
- Typography table (size/line-height/weight/tracking)
- Radii / Shadows / Density / Motion / Z-index tables
- MISSING summary with founder decision per row: (a) extend system, (b) update hi-fi, (c) keep literal with `/* token-exempt */` exemption

**Founder approves both docs before any Vue.** Do NOT skip this gate. Do NOT write Vue and audit afterward.

### 6.2 Hi-fi files you need to walk

All hi-fi originals at outer `main-main-kova-scope/` path. **Per RIDER §0 + IMPLEMENTATION_PROMPT.md §10 (CI determinism), copy them into in-repo first:**

```bash
mkdir -p /Users/jihoyang/kova-build-c01/design-system/hifi/auth
cp '/Users/jihoyang/kova-main/main-main-kova-scope/batch-a/light/Kova Hi-Fi A15 Auth - Light.html' /Users/jihoyang/kova-build-c01/design-system/hifi/auth/
cp '/Users/jihoyang/kova-main/main-main-kova-scope/batch-a-additions/light/Kova Hi-Fi B4 Auth Errors - Light.html' /Users/jihoyang/kova-build-c01/design-system/hifi/auth/
cp '/Users/jihoyang/kova-main/main-main-kova-scope/batch-a-additions/light/Kova Hi-Fi B5 Email Change Landing - Light.html' /Users/jihoyang/kova-build-c01/design-system/hifi/auth/
cp '/Users/jihoyang/kova-main/main-main-kova-scope/batch-a-additions/light/Kova Hi-Fi B6 Mobile Fallback - Light.html' /Users/jihoyang/kova-build-c01/design-system/hifi/auth/
cp '/Users/jihoyang/kova-main/main-main-kova-scope/batch-a-additions/dark/Kova Hi-Fi B4 Session Expired - Dark.html' /Users/jihoyang/kova-build-c01/design-system/hifi/auth/
cp '/Users/jihoyang/kova-main/main-main-kova-scope/batch-a/dark/Kova Hi-Fi A4+A9+A10 Modals - Dark.html' /Users/jihoyang/kova-build-c01/design-system/hifi/auth/
```

Also follow IMPLEMENTATION_PROMPT.md §10 bake-in steps (fonts local, icons local, hover CSS conditional on `?ci=1`, animations disabled).

### 6.3 Hi-fi → Plan task mapping (Plan §"Hi-fi → Task surface mapping")

| Plan task | Surfaces | Hi-fi file | Scene IDs | Theme |
|---|---|---|---|---|
| 14 | AuthShell + AuthCard + AuthHeading + AuthCta + AuthMedal + AuthIcon | `A15 Auth - Light.html` | A15.01–A15.06 | LIGHT |
| 15 | AuthField + OtpInput + MagicLinkSentBlock + PersistentSessionToggle | `A15 Auth - Light.html` | A15.02 + A15.03 + A15.04 + A15.06 | LIGHT |
| 16 | DangerZoneCard | `A4+A9+A10 Modals - Dark.html` | A9.1 typed-confirm | DARK |
| 17 | SignupView + LoginView | `A15 Auth - Light.html` | A15.01, A15.02, A15.04 | LIGHT |
| 18 | ForgotPasswordView + MagicLinkErrorView + AuthCallbackView | A15 + B4 | A15.05, B4.1, B4.2, A15.06 | LIGHT |
| 19 | EmailChangeVerifyView + SessionExpiredView + DesktopOnlyView | B5 + B4 dark + B6 | B5.1, B5.2, B4.7, B6.1, B6.2 | mixed |
| 20 | AccountPendingDeletionView + PrivacyPolicyView + TermsView | composes B4.7+A4 (no dedicated hi-fi) | n/a | mixed |

---

## 7. Remaining Plan tasks (your TODO)

In order:

1. **Phase 1 audit gate** (BLOCKING) — produce `KOVA_AUDIT.md` + `tokens-used.md`, get founder approval via AskUserQuestion
2. **Task 14** — 6 shared auth-shell components (AuthShell / AuthCard / AuthHeading / AuthCta / AuthMedal / AuthIcon)
3. **Task 15** — 4 field-level components (AuthField / OtpInput / MagicLinkSentBlock / PersistentSessionToggle)
4. **Task 16** — DangerZoneCard with typed-confirm modal (composes Cluster 11's `<KovaModal>`)
5. **Task 17** — SignupView + LoginView (state machine: email-entry / sent / otp / otp-wrong / otp-locked)
6. **Task 18** — ForgotPasswordView + MagicLinkErrorView + AuthCallbackView
7. **Task 19** — EmailChangeVerifyView + SessionExpiredView + DesktopOnlyView
8. **Task 20** — AccountPendingDeletionView + PrivacyPolicyView + TermsView
9. **Task 13.3 (deferred)** — wire 11 new routes in `src/router.ts` per PRD §6.1 + mount `router.beforeEach(authGuard)` — do this AFTER views exist so build doesn't break
10. **Task 21** — Resend email renderers (composes Cluster 11 `<EmailShell>` if shipped; otherwise leave as stub-throws-NotImplemented — Edge Fns guard on `RESEND_API_KEY` already)
11. **Task 24** — Playwright E2E suite (7 specs per Plan §Task 24)
12. **Task 25** — security verification + final pass (grep checks + quality gates + browser smoke)
13. **DONE report** at `docs/execution-phase/cluster-reports/W8a-cluster-01-DONE.md`
14. **Cluster-end agents** — `security-auditor`, `database-reviewer`, `superpowers:code-reviewer`, `e2e-runner`

---

## 8. Pitfalls + lessons from previous session

### 8.1 bun:test mock.module is process-global

`mock.module(...)` at file load time replaces the module in the shared module cache. When multiple test files mock the same module, cross-file pollution occurs.

**Specific bite:** Orchestrator test (`tests/unit/api/cron/zz-orchestrator.test.ts`) initially mocked the 5 step modules. Step tests in `tests/unit/api/cron/steps/*.test.ts` then received the mocked `runStep` instead of the real impl → 13 failures.

**Fix used:** orchestrator test renamed to `zz-orchestrator.test.ts` (sorts last), drops step-module mocks entirely, uses a mocked Supabase admin client that makes each step short-circuit naturally (empty data returns `{ ok: true }`).

**Lesson for your Vue component tests:** scope mocks per test file. If you mock the Pinia store or composables in one component test, expect leakage. Prefer `setActivePinia(createPinia())` in `beforeEach` over module mocks where possible.

### 8.2 Lint baseline = 89 errors / 1 warning (DO NOT EXCEED)

Per Plan P5: "ZERO new errors. If pre-existing errors exist, snapshot the count before starting tasks; the count must not increase."

Verify after every batch of changes:
```bash
cd /Users/jihoyang/kova-build-c01 && bun run check 2>&1 | grep -E '^Found'
# Must print: Found 1 warning and 89 errors.
```

If count goes up, FIX before committing. Common new-error sources I hit:
- `open-pencil/no-typeof-window-check` — use `IS_BROWSER` from `@/constants`, not `typeof window`
- `TS2741 WritableComputedRefSymbol` — annotate composable returns with `ComputedRef<T>` (from `vue`), not `ReturnType<typeof computed<T>>`
- `typescript-eslint/no-unnecessary-condition` — Supabase errors are non-nullable in error branches; no optional chain on `error.message`

### 8.3 Supabase local instance is SHARED across worktrees

The running supabase docker container is keyed to `/Users/jihoyang/kova-main/kova-open-pencil-1`. The c01 worktree shares it (port 54322). Don't start a second instance.

Migration I wrote was applied via `psql 'postgresql://postgres:postgres@127.0.0.1:54322/postgres' -f <path>` — bypassing `supabase migration up` because the CLI looks for a per-worktree container that doesn't exist.

**Implication:** if you change the migration, re-apply manually via psql, OR symlink/copy to the main worktree's migrations dir + `supabase db reset --workdir /Users/jihoyang/kova-main/kova-open-pencil-1` to fully reset.

### 8.4 IS_BROWSER constant import path

```typescript
import { IS_BROWSER } from '@/constants'   // re-export from @open-pencil/core
```

Use this anywhere you'd write `typeof window !== 'undefined'`. Lint rule enforces it.

---

## 9. Reference paths

### 9.1 Spec docs you MUST read

| Path | When |
|---|---|
| `docs/execution-phase/MASTER-EXECUTION-GUIDE.md` | Session start |
| `docs/execution-phase/DESIGN-SYSTEM-COMPLIANCE-RIDER.md` | Before any UI |
| `docs/execution-phase/claude-design-files/IMPLEMENTATION_PROMPT.md` | Before Phase 1 audit (cover-to-cover) |
| `docs/kova-final-prds/01-auth-and-identity.md` | Already informs your scope |
| `docs/kova-final-impl-plans/01-auth-and-identity-plan.md` | Your task-by-task source |
| `docs/execution-phase/wave-audits/W8a-cluster-01-AUDIT.md` | The audit rubric a future agent will run against your work — build to it |
| `/Users/jihoyang/kova-main/main-main-kova-scope/design-system/design.md` | Token canon, component patterns, 14 bans |
| `/Users/jihoyang/kova-main/main-main-kova-scope/design-system/kova-hifi-light.css` | Auth-page light theme tokens |
| `/Users/jihoyang/kova-main/main-main-kova-scope/design-system/kova-hifi.css` | Dark theme tokens (B4.7 session-expired + DangerZoneCard) |
| `/Users/jihoyang/kova-main/main-main-kova-scope/design-system/TOKEN_CANONICAL.md` | Token vocabulary cheat-sheet |
| `CLAUDE.md` (project root) | Hard rules |

### 9.2 Project memory keys (read before recommending UI patterns)

| Memory key | Why |
|---|---|
| `feedback_app_dark_website_light` | Dark inside app; light only on auth + marketing |
| `feedback_figma_ui_theme` | Figma as reference for visual decisions |
| `feedback_browser_smoke_test_before_done` | Required gate before claiming done |
| `feedback_verify_with_docs` | context7 + WebFetch help.figma.com before proposing patterns |
| `project_kova_avatar` | User-level scope; freelancer with many brands |
| `project_design_system_master` | Canonical design-system paths |

### 9.3 Cluster 11 helpers you'll consume

| Path | Function | Signature |
|---|---|---|
| `api/_shared/audit.ts` | `writeAudit(admin, { userId, eventType, payload, clusterOwner })` | Best-effort; swallows DB errors |
| `api/_shared/email.ts` | `sendEmail({ to, subject, html, text?, unsubscribeUrl, from?, replyTo? })` | Env-guarded; returns `{ ok, skipped?, id?, error? }` |
| `api/_shared/env.ts` | `requireEnv(name)` / `loadEnvOrSkip(name)` | Use instead of `process.env.X!` |
| `api/_shared/sentry.ts` | `captureServerException(error, context)` | Env-guarded; no-op without DSN |
| `api/_shared/idempotency.ts` | `verifyIdempotency(admin, req, userId, endpoint)` | See §4.1 |
| `src/components/ui/KovaModal.vue` | Reka Dialog wrapper | Use for DangerZoneCard (Task 16) |
| `src/components/ui/KovaIcon.vue` | Lucide icon — `<KovaIcon name="..." />` | NEVER raw `<icon-lucide-*>` or SVG |
| `src/components/ui/KovaPopover.vue` / `KovaMenu.vue` / `KovaTooltip.vue` / `KovaSkeleton.vue` / `KovaToast.vue` | Reka primitive wrappers | Per design.md §3 |
| `src/composables/use-toast.ts` | `useToast()` | For signup success toasts |

### 9.4 New surface in c01 (your imports)

| Path | Purpose |
|---|---|
| `api/_shared/verify-cron-secret.ts` | `verifyCronSecret(req): boolean` |
| `api/_shared/supabase-admin.ts` | `getAdminClient(): SupabaseClient` (cached) |
| `api/_shared/verify-auth-full.ts` | `verifyAuthFull(req): { supabase, userId, email }` + `UnauthenticatedError` |
| `src/composables/auth/use-magic-link.ts` | `useMagicLink()` for SignupView / LoginView |
| `src/composables/auth/use-otp.ts` | `useOtp(email)` for LoginView OTP state |
| `src/composables/auth/use-account-deletion.ts` | `useAccountDeletion()` for DangerZoneCard / AccountPendingDeletionView |
| `src/composables/auth/use-email-change.ts` | `useEmailChange()` for Cluster 04's email change UI later |
| `src/composables/auth/use-session-watcher.ts` | `useSessionWatcher()` — mount once in `App.vue` |
| `src/composables/auth/use-viewport-guard.ts` | `useViewportGuard()` for DesktopOnlyView |
| `src/router/guards/auth-guard.ts` | `authGuard` — wire in router.ts (Task 13.3 deferred) |
| `src/stores/auth.ts` | `useAuthStore()` — `pendingDeletion`, `scheduledPurgeAt`, `requestAccountDeletion()`, `restoreAccount()` |

---

## 10. Skills + agents to invoke

Per execution prompt + Plan:

### 10.1 Mandatory skills (per cluster)

1. `superpowers:using-superpowers` — orientation
2. `superpowers:executing-plans` — drives the per-task loop
3. `superpowers:test-driven-development` — TDD discipline (RED → GREEN → REFACTOR)
4. `superpowers:code-reviewer` — at cluster end

### 10.2 Conditional subagents

- `vue-expert` — auth pages are Composition API + Reka Dialog + light + dark themes (USE THIS for Tasks 14–20)
- `security-auditor` — MANDATORY at cluster end (auth/JWT — founder lock)
- `database-reviewer` — MANDATORY at cluster end (review migration + RPCs)
- `e2e-runner` — signup → onboarding → dashboard redirect smoke (note: Shopify OAuth round-trip from execution prompt SKIPPED per §3.2)

### 10.3 AskUserQuestion liberally

Per founder preference (CLAUDE.md "Always Use Superpowers Skills" + memory `feedback_verify_with_docs`). Specifically:
- Phase 1 audit MISSING rows — one question per ⚠️ row OR batched question listing all
- Reka UI primitive choices when Cluster 11 doesn't ship the exact match
- Hi-fi vs design-system drift (extend / update mockup / exempt literal)
- Account-pending-deletion view contents (no dedicated hi-fi — compose from B4.7 + A4 modal pattern per PRD §12.10)

---

## 11. Resume procedure (run these first thing)

```bash
# 1. Verify worktree state
cd /Users/jihoyang/kova-build-c01
pwd                           # /Users/jihoyang/kova-build-c01
git branch --show-current     # app/cluster-01-auth
git status                    # clean
git log --oneline -10         # 9 c01 commits

# 2. Verify tests pass
bun test tests/unit/migrations/cluster-01 \
         tests/unit/api/_shared/verify-cron-secret \
         tests/unit/api/account \
         tests/unit/api/auth \
         tests/unit/api/cron \
         tests/unit/stores/auth.test.ts \
         tests/unit/stores/auth-gdpr.test.ts \
         tests/unit/composables/auth \
         tests/unit/router/guards
# Expect: 140 pass / 0 fail

# 3. Verify lint baseline
bun run check 2>&1 | grep -E '^Found'
# Expect: Found 1 warning and 89 errors.

# 4. Read this doc end-to-end (already doing it)

# 5. Read Plan 01 if not already loaded
# Path: docs/kova-final-impl-plans/01-auth-and-identity-plan.md

# 6. Read IMPLEMENTATION_PROMPT.md cover-to-cover before Phase 1
# Path: docs/execution-phase/claude-design-files/IMPLEMENTATION_PROMPT.md

# 7. Copy hi-fi files in-repo (§6.2 of this handoff)

# 8. Begin Phase 1 audit — produce KOVA_AUDIT.md + tokens-used.md
# Output paths:
#   docs/execution-phase/cluster-audits/cluster-01-audit.md
#   docs/execution-phase/cluster-audits/cluster-01-tokens-used.md

# 9. AskUserQuestion for founder approval on Phase 1 docs BEFORE writing Vue

# 10. Proceed Task 14 → Task 20 → Task 13.3 (router wiring) → Task 21 → Task 24 → Task 25
```

---

## 12. Done criteria for full W8a

You're done when ALL of:

- [ ] Phase 1 audit gate green + founder-approved
- [ ] Tasks 14–20 (Vue) shipped with per-screen written diff at `tests/snapshots/cluster-01/<surface>-diff.md` empty for every surface
- [ ] Task 13.3 router.ts wiring complete + auth guard mounted
- [ ] Task 21 email renderers shipped (stub if `<EmailShell>` not ready — Edge Fn `RESEND_API_KEY` guard prevents prod fire)
- [ ] Task 24 E2E suite shipped + green via `e2e-runner` agent
- [ ] Task 25 grep checks + quality gates all green
- [ ] `bun run build` succeeds
- [ ] `bun run test:dupes` < 3%
- [ ] Lint baseline preserved (89 errors / 1 warning max)
- [ ] Playwright visual-diff ≤ 0.1% component / ≤ 0.5% screen per surface
- [ ] PR description ready with 3-screenshot row per surface
- [ ] `superpowers:code-reviewer` PASS (no CRITICAL/HIGH)
- [ ] `security-auditor` PASS (auth is security-critical)
- [ ] `database-reviewer` PASS (migration + RPCs)
- [ ] Founder browser smoke per `feedback_browser_smoke_test_before_done`
- [ ] DONE report at `docs/execution-phase/cluster-reports/W8a-cluster-01-DONE.md`
- [ ] Print: `W8a CLUSTER 01 DONE. <N> commits pushed to app/cluster-01-auth. Sibling clusters 04 + 12 may still be running.`

---

## 13. Sibling clusters status

- **W8b — Cluster 04 (Stripe)** — worktree at `/Users/jihoyang/kova-build-c04`, branch `app/cluster-04-stripe`, cut from `feat/m9-shopify` @ `fb1e540a`. Not started.
- **W8c — Cluster 12 (Settings)** — worktree at `/Users/jihoyang/kova-build-c12`, branch `app/cluster-12-settings`, cut from `feat/m9-shopify` @ `fb1e540a`. Not started.

These do not affect your c01 work. Sibling agents will work in their own worktrees in parallel sessions.

---

**End of handoff doc. Pair with `docs/kova-final-impl-plans/01-auth-and-identity-plan.md`. Begin.**
