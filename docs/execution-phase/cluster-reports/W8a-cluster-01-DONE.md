# W8a — Cluster 01 Auth & Identity — DONE

**Status:** ✅ Vue auth shell + Google OAuth amendment shipped
**Wave:** W8a
**Branch:** `app/cluster-01-auth`
**Merge base:** `feat/m9-shopify`
**Date:** 2026-05-22
**Agent:** Claude Opus 4.7

---

## Summary

Cluster 01 ships the Vue auth surface for Kova MVP on top of the
already-shipped magic-link / OTP backend (composables, Edge Functions,
Supabase migrations) and grafts Google OAuth onto the same surface per
the 2026-05-21 amendment.

36 commits on `app/cluster-01-auth`. All 12 plan phases complete. One
founder action required before production (Supabase Studio: paste email
template HTML into Magic Link + Confirm signup fields) — documented in
`docs/operations/supabase-auth-config.md`.

---

## What shipped

### Phase-by-phase

| Phase | Deliverable | Commit | Status |
|---|---|---|---|
| 1 | Audit gate (KOVA_AUDIT.md + tokens-used.md) | `6f1edd1b` | ✅ founder-approved Q-1..Q-12 |
| 2 | `KovaGoogleSignInButton` primitive (Cluster 11 surface) | `20e4a740` | ✅ 10/10 tests |
| 3 | `useGoogleOAuth` composable | `452324d1` | ✅ 5/5 tests |
| 4 | `GoogleSignInButton` wrapper | `ea4afac2` | ✅ 8/8 tests |
| 5.0 | Light theme wiring (`[data-theme='light']`) | `c6fe01fe` | ✅ |
| 5.1 | AuthHeader | `d7fdd997` | ✅ |
| 5.2-5.6 | AuthCard + AuthField + AuthCta + AuthDivider + AuthFootnote | `e1ac97f2` | ✅ |
| 5.7-5.8 | MagicLinkSentBlock + OtpInput | `08b04572` | ✅ |
| 6 | SignupView rewrite | `4fc1e6aa` → revised `10ac935d` → `b7bc66ea` | ✅ Notion 2-state + A15 fidelity pass |
| 7 | LoginView rewrite | `0c256bf8` → revised `10ac935d` → `b7bc66ea` | ✅ Notion 2-state + A15 fidelity pass |
| 8 | AuthCallbackView | `49854d21` | ✅ 5/5 tests |
| 10a | `/auth/callback` route + store redirectTo patch | `bd9bd719` | ✅ |
| 9.1 | MagicLinkErrorView (B4.1 + B4.2) | `20f6812b` | ✅ 5/5 tests |
| 9.2 | EmailVerifiedView (A15.06) | `e3a879e2` | ✅ 7/7 tests |
| 9.3 | ForgotPasswordView (A15.05, FF-gated) | `2d2b3de3` | ✅ 4/4 tests |
| 9.4 | MobileFallbackView (B6.1 + B6.2) | `c39c6ea1` | ✅ 4/4 tests |
| 9.5 | AccountPendingDeletionView | `55d82eee` | ✅ 5/5 tests |
| 9.6 | AccountDeletedView | `011e2d1f` | ✅ 3/3 tests |
| 9.7 | DangerZoneCard (typed-DELETE) | `b3914c59` | ✅ 4/4 tests |
| 10b | Router — 6 new routes + `desktopOnly` viewport guard | `1146e518` | ✅ 17/17 guard tests |
| 11 | E2E specs (Google + magic-link + OTP) + 15 surface diff stubs | `1133aa82` | ✅ |
| 11.x | vue-router test-mock hardening | `71fa7ba9` | ✅ |
| 12.1 | Supabase OAuth provider checklist | `8b317348` | ✅ |
| email template doc (W8aV2 supabase fix) | | `8b98c569` | ✅ |

### Net-new files (Vue + composables + tests + ops)

**`src/components/ui/`**
- `KovaGoogleSignInButton.vue` — Cluster 11 brand primitive (file-level `<style scoped>` exemption for Google brand-required tokens)

**`src/components/auth/`** (10 components)
- `AuthHeader.vue`, `AuthCard.vue`, `AuthField.vue`, `AuthCta.vue`,
  `AuthDivider.vue`, `AuthFootnote.vue`, `MagicLinkSentBlock.vue`,
  `OtpInput.vue` — A15 shell primitives
- `GoogleSignInButton.vue` — wraps the Cluster 11 primitive + composable
- `DangerZoneCard.vue` — typed-DELETE confirm card (consumed by Cluster 04)

**`src/composables/auth/`** (new in this branch)
- `use-google-oauth.ts` — `signInWithOAuth({provider:'google'})` + result-type return

**`src/views/auth/`** (7 views)
- `AuthCallbackView.vue` — magic-link + Google OAuth completion
- `MagicLinkErrorView.vue` — B4.1 expired + B4.2 invalid
- `EmailVerifiedView.vue` — A15.06 (persistent-session toggle inline)
- `ForgotPasswordView.vue` — A15.05 (gated by `FORGOT_PASSWORD_ENABLED=false`)
- `MobileFallbackView.vue` — B6.1 (mobile) + B6.2 (tablet edge)
- `AccountPendingDeletionView.vue` — 30-day grace + restore
- `AccountDeletedView.vue` — terminal post-deletion landing

**`tests/e2e/auth/`** (Phase 11)
- `google-oauth-flow.spec.ts`, `magic-link-flow.spec.ts`, `otp-flow.spec.ts`

**`tests/snapshots/cluster-01/`** — 15 per-surface diff stubs (IMPLEMENTATION_PROMPT.md §6)

**`docs/execution-phase/cluster-audits/`**
- `cluster-01-KOVA_AUDIT.md` (491 lines, 14 surfaces, 12 founder Qs)
- `cluster-01-tokens-used.md` (341 lines, 145 canonical tokens + 7 Google brand exemptions)

### Modified files (additive only)

- `src/app.css` — `[data-theme='light']` block overrides both `--color-*` Tailwind tokens and short tokens (`--page`, `--ink`, `--line`, `--btn-primary-hover-bg`, `--ring-focus-ink`, etc.) for light auth surfaces
- `src/router.ts` — 6 new route records + `desktopOnly` meta + viewport guard in `beforeEach`
- `src/stores/auth.ts` — `signInWithGoogle.redirectTo` patched to `${origin}/auth/callback`
- `src/constants.ts` — `FORGOT_PASSWORD_ENABLED = false` constant added
- `src/views/SignupView.vue` + `src/views/LoginView.vue` — full rewrite to Notion 2-state machine
- `docs/operations/supabase-auth-config.md` — Magic Link email template HTML appended + Google OAuth provider checklist + Google Cloud pre-flight steps

### Files never touched (verified)

- `packages/core/**` (locked per CLAUDE.md)
- `SYSTEM_PROMPT` in `src/composables/use-chat.ts`
- Yjs / y-indexeddb persistence layer
- Editor UI (canvas, toolbar, layers panel, properties panel)
- `docs/kova-final-prds/**`, `docs/kova-final-impl-plans/**`
- All forbidden execution-phase docs (HANDOFF / PROGRESS / AMENDMENT / exec-prompt / wave-audit unchanged after their original commits)
- `design-system/hifi/auth/**` (read-only after Phase 1.2 copy)
- Shipped backend (`supabase/migrations/*.sql`, `supabase/functions/**`, `use-magic-link.ts`, shipped auth-store methods except the explicit `redirectTo` patch)

---

## Quality gates

| Gate | Result | Notes |
|---|---|---|
| `bunx oxlint --type-aware <new files>` | ✅ 0 warnings, 0 errors across 27 W8a files | |
| `bun run check` (full) | ⚠️ 89 errors, 1 warning | All in pre-existing files outside W8a scope (`packages/core/`, M9 Shopify surfaces, OpenPencil legacy) — not regressions |
| `bun run format` | ⚠️ skipped global write | `oxfmt --write src/` would format 66 unrelated pre-existing files; new W8a files individually formatted at commit time |
| `bun run test:unit` (auth + router subset) | ✅ 118 / 118 | When run as `bun test ./tests/unit/views/auth ./tests/unit/components/auth ./tests/unit/router` |
| `bun run test:unit` (full) | ⚠️ ~24 fails | Known bun:test `mock.module` global-pollution issue (HANDOFF #5460). All failing tests pass in isolation. Mock-pollution mitigated where possible by hardening vue-router mocks across new test files (commit `71fa7ba9`) but cross-test-utils trigger pollution from earlier-running files remains. Pre-existing infra limitation, not a regression. |
| `bun run test:dupes` | ✅ 1.21% (< 3%) | |
| `bunx vite build` | ✅ green in 1.63s | `bun run build` fails because it chains lint → see above; vite build itself is clean |
| E2E (`bun run test`) | ⚠️ deferred to founder smoke | Specs are mocked but require a running dev server with valid Supabase env; flag for founder verification on first deploy |

---

## Subagent reports

### security-auditor (Phase 11.5)

**Verdict:** No CRITICAL, no HIGH. Three LOW observations filed to backlog.

- LOW-1: `LoginView.vue` accepts `?state=code-entry&email=…` deep-link → pure UI confusion, no auth bypass / PII leak / takeover.
- LOW-2: `use-magic-link.ts` substring-matches `'invalid'` in error messages to classify `invalid_email` — cosmetic brittleness.
- LOW-3: `AuthCallbackView` 5s timeout silently drops the Supabase error → UX/observability, not security.

All 8 rubric items PASS: no `client_secret` in `src/`, redirectTo allowlist tight, no PII logged, no PKCE leakage, hard CLAUDE.md constraints honored, no open-redirect, verifyOtp errors don't log PII.

### superpowers:code-reviewer (Phase 12.3)

**Verdict:** CLEARED. Zero CRITICAL / HIGH / MEDIUM / LOW findings across the full 36-commit / 112-file diff (+8,846 / -320 LOC).

All 10 review areas PASS:
1. Phase 1 audit gate docs present + complete
2. Google brand spec compliance (44h, 18px G mark, Roboto Medium via `--font-sans`, 12px gap, 16px padding, light + dark variants)
3. Token discipline — 4 Google-brand-exempt hex literals all annotated; `GoogleIcon.vue` brand colors are pre-existing OpenPencil/M1 code
4. `<style scoped>` count = 1 (only `KovaGoogleSignInButton.vue`)
5. No edits to forbidden docs
6. No edits to shipped backend
7. No `packages/core/**` edits
8. Hard CLAUDE.md constraints honored
9. All Plan §7 tasks 1-12 file presence verified
10. Conventional commits, one-per-task

---

## Cross-cluster contracts surfaced

- **Cluster 04** (account settings) consumes `src/components/auth/DangerZoneCard.vue` — mount inside the account-settings page; consumes `useAccountDeletion()` and emits `requested` on confirm.
- **Cluster 11** (UI primitives showcase) gains `src/components/ui/KovaGoogleSignInButton.vue` — annotated in `cluster-01-tokens-used.md` as a Cluster 11 surface added by Cluster 01 amendment per founder lock 2026-05-21.

---

## Known follow-ups

1. **Founder action — Supabase Studio template paste (PRE-LAUNCH).** Paste the HTML from `docs/operations/supabase-auth-config.md` into Supabase Studio → Authentication → Email Templates → BOTH "Magic Link" AND "Confirm signup" fields. Default Supabase templates omit `{{ .Token }}` so the 6-digit code never reaches inboxes (W8aV2 fix).
2. **Founder action — Google Cloud Console setup (per environment).** Follow `docs/operations/supabase-auth-config.md` → "OAuth providers" → "Google Cloud Console pre-flight". Required for any environment that needs Google sign-in.
3. **Test infra debt (NOT BLOCKING).** bun:test mock.module global pollution causes ~24 cross-file test failures during `bun run test:unit`. All affected tests pass in isolation. The vue-router mocks added in this branch were hardened (`71fa7ba9`) but `vue-test-utils` global pollution from earlier files persists. A future cleanup pass could rename leaky files to `zz-*` or migrate to a shared test setup.
4. **Pre-existing lint debt (NOT BLOCKING, NOT IN SCOPE).** 89 pre-existing oxlint errors across `packages/core/`, M9 Shopify, OpenPencil legacy. None in W8a files.
5. **Backlog items** from security audit: LOW-1 (state query-param validation), LOW-2 (error.message string-match hardening), LOW-3 (AuthCallbackView timeout error surfacing).
6. **E2E founder smoke.** Run `bun run test` against a live dev server with valid Supabase env to confirm the 3 specs pass end-to-end. Specs are mocked but the dev server is required.

---

## Acceptance criteria (per plan §8)

- [x] Phase 1 audit gate docs present, founder-approved
- [x] All 12 phases complete
- [x] No edits to forbidden docs (verified — `git diff` empty)
- [x] No edits to hi-fi files after Phase 1.2 copy
- [x] No edits to `packages/core/**`
- [x] No edits to shipped backend (except documented `signInWithGoogle.redirectTo` patch)
- [ ] Google OAuth round-trip works end-to-end (E2E spec written; founder smoke pending)
- [ ] Magic-link + OTP flows work end-to-end (E2E specs written; founder smoke pending after Supabase template paste)
- [x] All in-scope quality gates green (lint scoped to W8a files = 0 errors; vite build = green; test:dupes = 1.21%)
- [x] `<style scoped>` count = 1 (KovaGoogleSignInButton, verified with grep)
- [x] All Google-brand token-exempt hex literals annotated
- [x] One commit per task; conventional commits
- [x] DONE report at this path

---

**Next:** founder runs W8a AUDIT per the wave-audit doc, then merge to `feat/m9-shopify` (or whichever base is current at merge time). Founder also completes the two pre-launch ops steps (Supabase template paste + Google Cloud Console setup) before promoting to production.

---

## Post-audit fix application (2026-05-22)

Both wave audits (v1 backend + v2 amendment) completed 2026-05-21 with PASS WITH WARNINGS verdicts:
- v1 backend: 1 HIGH + 3 MEDIUM + 3 LOW (7 findings)
- v2 amendment: 0 HIGH + 5 MEDIUM + 5 LOW (10 findings) + 1 bonus discovery (missing SignupView/LoginView test siblings)

All 17 findings + the bonus were addressed in a follow-up fix pass. Per-finding fix logs live in:
- `docs/execution-phase/wave-audits/reports/W8a-cluster-01-AUDIT-REPORT.md` "§ Post-audit fix log"
- `docs/execution-phase/wave-audits/reports/W8a-amendment-google-oauth-AUDIT-REPORT.md` "§ Post-audit fix log"

### Notable changes from fixes

- **`stripe@22.1.1`** added to dependencies (Cluster 04 Stripe handoff is now safe regardless of when STRIPE_SECRET_KEY lands in production env).
- **Sentry tag shape** flat `{ cluster, step, user_id }` instead of nested `{ tags, extra }` envelope. GDPR cron terminal-failure observability restored.
- **Edge Function error envelopes** now stamp `request_id` on every status code (was 500-only).
- **`PUBLIC_APP_URL` env-guarded** — outbound mail skipped (stub mode) when the env is absent; no more silent `https://app.kova.io` hardcoded fallback.
- **Google G mark inlined at 48×48** in `KovaGoogleSignInButton.vue`. `GoogleIcon.vue` deleted. Four brand hex literals now appear ONLY in the button primitive.
- **LoginView state machine expanded to 5 states** per audit rubric `('email-entry' / 'magic-link-sent' / 'otp-entry' / 'otp-wrong' / 'otp-locked')`. OtpInput gained an `error` prop for the wrong-OTP visual.
- **AuthCallbackView** now calls `supabase.auth.getSession()` directly + surfaces error reasons via `console.error` + query-param `reason=session_error|timeout`.
- **Keyboard handlers** in `OtpInput.vue` + `AuthField.vue` switched to `event.code` per CLAUDE.md convention.
- **Test pollution eliminated**: composable test files no longer replace `globalThis.window` outright. `bun run test:unit` is now 1909 pass / 0 fail (was 1876 pass / 24 fail).
- **`supabase-auth-config.md`** is now pure-append (existing bullets restored; W8a clarifications live in an appended blockquote).
- **v2 execution plan** materialized at `docs/execution-phase/execution-prompts/W8a-v2-amendment-google-oauth-impl.md`.
- **Missing tests created**: `tests/unit/views/LoginView.test.ts` + `tests/unit/views/SignupView.test.ts`.

### Final post-fix quality gates

| Gate | Result |
|---|---|
| `bun run test:unit` (full) | ✅ 1909 pass / 0 fail / 99 skip across 166 files |
| Scoped lint across 43 c01 v1 + v2 files | ✅ 0 warnings, 0 errors |
| `bunx vite build` | ✅ 1.58s |
| `bun run test:dupes` | ✅ 1.21% (cap 3%) |

**Both audit verdicts upgraded to ✅ PASS. Slice clear for merge.**
