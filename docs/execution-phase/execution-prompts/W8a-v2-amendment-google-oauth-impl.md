# W8a v2 — Cluster 01 Vue Auth Shell + Google OAuth Amendment — EXECUTION PLAN

**Status:** materialized 2026-05-22 from the amendment doc + DONE phase log to close audit-rubric reference gap (W8a v2 audit M2). The work itself shipped between 2026-05-21 and 2026-05-22 on `app/cluster-01-auth` driven by the amendment doc — this file is a retroactive plan-of-record that captures what shipped and in what order so future audits have a single scope-of-truth.

**Wave:** W8a v2 (amendment shipment)
**Cluster:** 01 — Auth + Identity
**Branch:** `app/cluster-01-auth`
**Baseline:** `58c3b93d` (the amendment-scope-doc commit; v1 backend slice ends here)
**Predecessor scope-of-truth:**
- `docs/execution-phase/cluster-reports/W8a-cluster-01-AMENDMENT-google-oauth.md` (amendment scope)
- `docs/execution-phase/execution-prompts/W8a-cluster-01-auth.md` (v1 backend execution prompt)
- `docs/kova-final-impl-plans/01-auth-and-identity-plan.md` Tasks 14–25
- `docs/execution-phase/claude-design-files/IMPLEMENTATION_PROMPT.md` (Phase 1 audit-gate spec + visual-fidelity contract)

---

## §1 — Scope

This plan ships:

1. **Phase 1 audit gate:** `cluster-01-KOVA_AUDIT.md` + `cluster-01-tokens-used.md` per `IMPLEMENTATION_PROMPT.md §3`. Founder approval required before Phase 2.
2. **Google brand primitive:** `KovaGoogleSignInButton.vue` (Cluster 11 surface).
3. **Google OAuth composable:** `useGoogleOAuth()` — typed discriminated-union return + reactive `isStarting`.
4. **Wrapper component:** `GoogleSignInButton.vue` (auth-surface convenience over the primitive + composable).
5. **Light-theme token wiring:** `[data-theme='light']` block in `src/app.css`.
6. **Auth-shell primitives (10):** `AuthHeader`, `AuthCard`, `AuthField`, `AuthCta`, `AuthDivider`, `AuthFootnote`, `MagicLinkSentBlock`, `OtpInput`, `GoogleSignInButton`, `DangerZoneCard`.
7. **View rewrites (2):** `SignupView.vue`, `LoginView.vue` — Notion 2-state machine (collapsed in initial ship to 3-state for LoginView; expanded to 5-state per rubric in post-audit fix 2026-05-22).
8. **Net-new views (7):** `AuthCallbackView`, `MagicLinkErrorView`, `EmailVerifiedView`, `ForgotPasswordView` (flag-gated), `MobileFallbackView`, `AccountPendingDeletionView`, `AccountDeletedView`.
9. **Router additions:** 7 new routes + `desktopOnly` viewport guard.
10. **Pinia auth-store one-line edit:** `signInWithGoogle.redirectTo` → `${origin}/auth/callback`.
11. **E2E specs (3):** `google-oauth-flow`, `magic-link-flow`, `otp-flow` + 15 per-surface visual-diff stubs.
12. **Ops docs:** Supabase Auth checklist appended with OAuth providers + Google Cloud pre-flight; Magic Link email template HTML.

## §2 — Forbidden scope (founder lock 2026-05-21)

The following paths MUST NOT be edited during this shipment. Any non-empty diff = CRITICAL.

- `docs/kova-final-prds/01-auth-and-identity.md`
- `docs/kova-final-impl-plans/01-auth-and-identity-plan.md`
- `docs/kova-final-prds/11-*.md`
- `docs/kova-final-impl-plans/11-*.md`
- `docs/execution-phase/cluster-reports/W8a-cluster-01-HANDOFF.md`
- `docs/execution-phase/cluster-reports/W8a-cluster-01-PROGRESS.md`
- `docs/execution-phase/cluster-reports/W8a-cluster-01-AMENDMENT-google-oauth.md`
- `docs/execution-phase/execution-prompts/W8a-cluster-01-auth.md` (v1 prompt — locked after v1 backend shipped)
- `docs/execution-phase/wave-audits/W8a-cluster-01-AUDIT.md`
- `/Users/jihoyang/kova-main/main-main-kova-scope/**` (outer canonical hi-fi + design-system files)
- `packages/core/**`
- `supabase/migrations/**`
- `supabase/functions/**` (folder absent; backend lives in `api/`)
- `src/composables/auth/use-magic-link.ts` (shipped v1)
- `src/composables/auth/use-otp.ts` (shipped v1)
- `src/composables/auth/use-email-change.ts` (shipped v1)
- `src/composables/auth/use-account-deletion.ts` (shipped v1)
- `src/composables/auth/use-session-watcher.ts` (shipped v1)
- `src/composables/auth/use-viewport-guard.ts` (shipped v1)

## §3 — Type contracts

### §3.1 — Discriminated-union OAuth start result

```ts
type StartResult = { ok: true } | { ok: false; reason: string }
```

`useGoogleOAuth().start()` returns this. The composable does NOT throw at the API boundary; callers map `reason` to UI states without try/catch.

### §3.2 — Auth-store `signInWithGoogle` redirect

```ts
async function signInWithGoogle(): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/auth/callback` }
  })
  return { error }
}
```

The legacy method stays on the store for backwards compat. New surfaces import `useGoogleOAuth()` which adds `queryParams: { access_type: 'offline', prompt: 'consent' }` for refresh-token issuance.

### §3.3 — KovaGoogleSignInButton props

```ts
interface KovaGoogleSignInButtonProps {
  mode: 'signin' | 'signup'
  theme?: 'light' | 'dark'
  disabled?: boolean
}
```

Root element MUST be `<button type="button">` (not `<a>`) per accessibility / amendment §3.3.

## §4 — Visual-fidelity rules

Per `IMPLEMENTATION_PROMPT.md §3` 3-rule contract:

1. **Audit before code.** Phase 1 must produce `cluster-01-KOVA_AUDIT.md` + `cluster-01-tokens-used.md`. Founder approves every `⚠️ MISSING` row before Phase 2 starts.
2. **Tokens or token-exempt.** Every visual value either resolves to an existing canonical token OR is annotated inline with `/* token-exempt: <reason> */`. Default-exempt: Google brand-required values (`#131314`, `#8e918f`, `#ffffff` dark text, `#4285F4` / `#34A853` / `#FBBC05` / `#EA4335` G-logo arcs, `#1f1f20` dark hover).
3. **Per-surface visual diff.** Each PRD 01 §3.1 surface (A15.01–A15.06 + B4.1–B4.6 + the two amended Signup/Login-with-Google surfaces) gets a `tests/snapshots/cluster-01/<surface>-diff.md` stub; final diff captured at E2E time.

## §5 — Phases

### Phase 1 — Audit gate

1.1 Read `IMPLEMENTATION_PROMPT.md §3`, `DESIGN-SYSTEM-COMPLIANCE-RIDER.md`, `01-auth-and-identity.md`, `01-auth-and-identity-plan.md` Tasks 14–25, the amendment doc.
1.2 Copy the relevant hi-fi files from `/Users/jihoyang/kova-main/main-main-kova-scope/batch-a/light/` and `batch-a-additions/light/` into `design-system/hifi/auth/` (read-only after this commit). One commit message: `docs(c01): Phase 1 audit gate — KOVA_AUDIT + tokens-used + hi-fi copies`.
1.3 Author `cluster-01-KOVA_AUDIT.md` — one section per PRD §3.1 surface, plus the two amended surfaces. Token rows, DOM plan, behavior spec.
1.4 Author `cluster-01-tokens-used.md` — token inventory, including a §0 GOOGLE-BRAND EXEMPTION block listing the seven token-exempt hex literals.
1.5 **HARD GATE:** `AskUserQuestion` → founder approves every `⚠️ MISSING` row + the §0 exemption block. Do NOT proceed without explicit founder confirmation.

### Phase 2 — KovaGoogleSignInButton primitive

2.1 Build `src/components/ui/KovaGoogleSignInButton.vue` per §3.3 props + §4 token-exempt rules.
2.2 Inline the official 48×48-viewBox Google G mark SVG (4 brand-color paths). Annotate each token-exempt literal inline with `/* token-exempt: Google brand requirement */`.
2.3 Test sibling at `tests/unit/components/KovaGoogleSignInButton.test.ts` — 8+ assertions covering: light vs dark themes, signin vs signup label, click event emission, disabled state, SVG arc count, viewBox value, height 44px, font-family `var(--font-sans)`, border-radius `var(--r-md)`.
2.4 Commit: `feat(c01-g1): KovaGoogleSignInButton primitive — Google brand-spec compliant`.

### Phase 3 — useGoogleOAuth composable

3.1 Build `src/composables/auth/use-google-oauth.ts` per §3.1.
3.2 Required behaviors: `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: \`${window.location.origin}/auth/callback\`, queryParams: { access_type: 'offline', prompt: 'consent' } } })`.
3.3 Reactive `isStarting: Ref<boolean>`, toggled in `try { isStarting = true; ... } finally { isStarting = false }`.
3.4 Tests covering happy path, error mapping, isStarting reactivity.
3.5 Commit: `feat(c01-g2): useGoogleOAuth composable — provider=google + /auth/callback redirect`.

### Phase 4 — GoogleSignInButton wrapper

4.1 Build `src/components/auth/GoogleSignInButton.vue` — composes `KovaGoogleSignInButton` + `useGoogleOAuth`. Emits `oauth-error` event when `start()` returns `{ ok: false, reason }`.
4.2 Test sibling covering propagation of `mode` prop, click → start() → success / error path.
4.3 Commit: `feat(c01-g3): GoogleSignInButton wrapper — composes primitive + composable`.

### Phase 5 — Auth-shell primitives

Order: light-theme wiring → AuthHeader → AuthCard + AuthField + AuthCta + AuthDivider + AuthFootnote → MagicLinkSentBlock + OtpInput. Per-primitive: source-of-truth `cluster-01-tokens-used.md` rows, token-only styling, sibling test exercising props + emits, NO `<style>` blocks (the brand primitive's scoped style is the single documented exception), `<icon-lucide-*>` only when the icon is in Lucide, otherwise inline SVG (no raw `<svg>` outside the brand primitive and any explicitly token-exempt icon).

### Phase 6 — SignupView rewrite

6.1 Drop M5-era email+password content. Build the A15.01 surface end-to-end: AuthHeader → AuthCard wrapping `<GoogleSignInButton mode="signup">` + `<AuthDivider>` + email field + AuthCta + AuthFootnote.
6.2 2-state machine: `email-entry → magic-link-sent`. Wire `useMagicLink().send(email)`.
6.3 Commit: `feat(c01-t17a): SignupView rewrite — magic-link + Google OAuth`.

### Phase 7 — LoginView rewrite

7.1 Drop M5-era email+password content. Build A15.02 + A15.04 + B4.3 + B4.4 surfaces.
7.2 **5-state machine per audit rubric §K** (post-audit fix 2026-05-22):
- `email-entry` (A15.02) — initial
- `magic-link-sent` (A15.03) — after successful send, awaiting code or link click
- `otp-entry` (A15.04) — user is actively entering the code (transition on first keystroke)
- `otp-wrong` (B4.3) — last verifyOtp attempt failed (attempts < 5)
- `otp-locked` (B4.4) — 5 wrong attempts; only path is to request new code

The three "code-related" states render the same A15.04 surface; the distinction drives internal logic (analytics + OtpInput error prop).

7.3 Wire `useMagicLink().send` + `supabase.auth.verifyOtp` + 5-attempt lockout.
7.4 Commit: `feat(c01-t17b): LoginView rewrite — 5-state machine + magic-link + OTP + Google`.

### Phase 8 — AuthCallbackView

8.1 Build `src/views/auth/AuthCallbackView.vue` — unified post-auth landing for both magic-link AND Google OAuth.
8.2 On mount: call `supabase.auth.getSession()` directly (surfaces token-exchange errors); ALSO watch the Pinia auth-store `isAuthenticated` (subscribes to `onAuthStateChange`).
8.3 Branch: `auth.isOnboarded ? '/dashboard' : '/onboarding'`.
8.4 5-second timeout fallback → `/login?status=callback_failed&reason=timeout`. Log the reason via `console.error` so dev observability is preserved.
8.5 Tests cover dual-provider parity, getSession error path, timeout path.

### Phase 9 — Net-new views

9.1 `MagicLinkErrorView` (B4.1 expired + B4.2 invalid)
9.2 `EmailVerifiedView` (A15.06 success card + persistent-session toggle)
9.3 `ForgotPasswordView` (A15.05 — gated by `FORGOT_PASSWORD_ENABLED=false`)
9.4 `MobileFallbackView` (B6.1 mobile + B6.2 tablet edge)
9.5 `AccountPendingDeletionView` (30-day grace + restore CTA)
9.6 `AccountDeletedView` (terminal post-deletion landing)
9.7 `DangerZoneCard` (typed-DELETE confirm modal — consumed by Cluster 04 settings page)

Each view: sibling test, `data-theme="light"` (or canvas-dark for post-onboarding surfaces), only canonical tokens or token-exempt with annotation.

### Phase 10 — Router

10.1 Add route records to `src/router.ts`: `/auth/callback`, `/auth/magic`, `/auth/email-verified`, `/forgot-password`, `/account-pending-deletion`, `/account-deleted`, `/mobile-fallback`. Each carries appropriate `meta: { requiresAuth, publicOnly, desktopOnly, theme }`.
10.2 `beforeEach` viewport guard: if `to.meta.desktopOnly && !useViewportGuard().isDesktop` → redirect `/mobile-fallback`.
10.3 Sibling tests in `tests/unit/router/guards/`.
10.4 One commit per route batch.

### Phase 11 — E2E

11.1 `tests/e2e/auth/google-oauth-flow.spec.ts` — mocks the Google OAuth round-trip via `page.route(...)` interception, asserts post-auth landing.
11.2 `tests/e2e/auth/magic-link-flow.spec.ts` — happy path through email entry → code submit → dashboard.
11.3 `tests/e2e/auth/otp-flow.spec.ts` — full OTP flow including wrong-code → lockout.
11.4 `tests/snapshots/cluster-01/<surface>-diff.md` stubs for all 15 surfaces (visual-diff captured per-PR at the visual-test step).

### Phase 12 — Ops + done

12.1 Append Supabase OAuth provider checklist + Google Cloud pre-flight to `docs/operations/supabase-auth-config.md` (pure-append; no edits to existing sections).
12.2 Re-run all quality gates: `bun run check` (scoped to W8a files = 0 errors), `bun run test:unit` (scoped), `bun run test:dupes`, `bunx vite build`, `bun run test` (E2E — deferred to founder-smoke if dev-server env unavailable).
12.3 Author `docs/execution-phase/cluster-reports/W8a-cluster-01-DONE.md` — phase-by-phase commit table, scope-discipline grep results, security-auditor + code-reviewer summaries, known follow-ups.

## §6 — Acceptance criteria

- [ ] Phase 1 audit-gate docs present, founder-approved
- [ ] All 12 phases complete
- [ ] No edits to forbidden docs (§2 — verified via `git diff` empty)
- [ ] No edits to hi-fi files after Phase 1.2 copy commit
- [ ] No edits to `packages/core/**`
- [ ] No edits to shipped backend (except documented `signInWithGoogle.redirectTo` patch)
- [ ] Google OAuth round-trip works end-to-end (E2E spec passing OR founder-smoke confirmed)
- [ ] Magic-link + OTP flows work end-to-end (E2E spec passing OR founder-smoke confirmed)
- [ ] All in-scope quality gates green (lint scoped to W8a files = 0 errors; vite build = green; test:dupes ≤ 3%)
- [ ] `<style scoped>` count = 1 in W8a-introduced files (KovaGoogleSignInButton — verified with grep)
- [ ] All Google-brand token-exempt hex literals annotated
- [ ] One commit per task; conventional commits
- [ ] DONE report at `docs/execution-phase/cluster-reports/W8a-cluster-01-DONE.md`

## §7 — Pitfalls

- **bun:test + vue-test-utils mock pollution** (HANDOFF #5460). `mock.module` is process-global; cross-file pollution causes individual tests to pass in isolation but fail under `bun run test:unit`. Mitigation: rename leaky files to `zz-*` to defer execution, or land a shared test-setup migration in a follow-up.
- **`<style>` block bans.** Cluster 01 ships exactly ONE `<style scoped>` block (KovaGoogleSignInButton — documented exception). Pre-existing OpenPencil files (`HsvColorArea.vue`, `CodePanel.vue`, `EmailShell.vue`) carry their own `<style>` blocks but are NOT in v2 scope.
- **Founder-lock interplay.** Phase 1 tokens-used.md §0 is the canonical home for any token-exempt declaration. Updates to this section need a fresh founder approval; do NOT silently expand the exemption list.

---

**End of plan.**
