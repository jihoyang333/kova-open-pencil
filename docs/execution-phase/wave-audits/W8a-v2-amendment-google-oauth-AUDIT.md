# W8a v2 (Amendment) — Google OAuth Vue Auth Shell AUDIT Prompt

**Wave:** W8a v2 (amendment shipment)
**Cluster:** 01 — Auth + Identity Vue auth shell + Google OAuth amendment
**Audit type:** Vue auth shell completeness + Google brand-spec compliance + scope discipline (zero edits to forbidden docs/files) + Phase 1 audit gate verification + cross-cluster contracts
**Status:** ready after W8a v2 exec agent prints DONE banner
**Prerequisites:** Branch `app/cluster-01-auth` already carries W8a v1 backend (`58c3b93d`). W8a v2 exec ships Vue auth shell + Google OAuth on top. DONE at `cluster-reports/W8a-cluster-01-DONE.md`.

---

## Founder pre-flight

1. W8a v2 execution agent printed DONE banner
2. `docs/execution-phase/cluster-reports/W8a-cluster-01-DONE.md` exists on `app/cluster-01-auth`
3. Quality gates (`bun run check / format / test:unit / test:dupes / test / build`) ran green at DONE time per the exec plan §12.2
4. Branch `app/cluster-01-auth` pushed to origin

If any prerequisite fails: do NOT launch audit. Resume exec agent first.

---

## Launch

Fresh session. Opus 4.7. Worktree `/Users/jihoyang/kova-build-c01` on branch `app/cluster-01-auth`. Paste PROMPT block verbatim.

---

## PROMPT (paste verbatim)

```
You are the W8a v2 AUDIT agent for Kova. Independent reviewer for
Cluster 01 Vue auth shell + Google OAuth amendment shipment.

The shipped backend foundation (Edge Fns, migrations, GDPR cron,
shipped composables) is OUT OF SCOPE for this audit — that was
audited under the original W8a-cluster-01-AUDIT.md against the
pre-Google scope. THIS audit covers the Vue auth shell + Google
OAuth amendment work shipped per the v2 execution plan.

This work has FIVE critical disciplines to verify:
1. ZERO edits to forbidden docs (PRD 01, Plan 01, PRD 11, Plan 11,
   HANDOFF, PROGRESS, amendment doc, original exec prompt, original
   audit rubric)
2. ZERO edits to hi-fi files (outer canonical
   main-main-kova-scope/**/*.html stays untouched; in-repo
   design-system/hifi/auth/ files = pure copies, not modified after
   Phase 1.2)
3. ZERO edits to shipped backend (supabase/migrations/*.sql,
   supabase/functions/**, shipped composables in
   src/composables/auth/ except the NEW use-google-oauth.ts)
4. ZERO edits to packages/core/** (c01 has no lift-the-lock)
5. Google brand-spec compliance + single <style scoped> exception
   (exactly 1 file in codebase carries <style scoped>; exactly 4
   token-exempt hex literals annotated)

READ-ONLY audit. Surface CRITICAL findings via AskUserQuestion
mid-audit. Do NOT fix issues — report only.

## Mandatory reading

1. docs/execution-phase/MASTER-EXECUTION-GUIDE.md
2. docs/execution-phase/DESIGN-SYSTEM-COMPLIANCE-RIDER.md
3. docs/execution-phase/claude-design-files/IMPLEMENTATION_PROMPT.md
   (Phase 1 audit gate spec + 3-rule visual-fidelity contract +
   drift protocol §7 — verify the executing agent followed §3)
4. docs/execution-phase/execution-prompts/W8a-v2-amendment-google-oauth-impl.md
   (THE v2 PLAN — primary scope-of-truth for this audit)
5. docs/execution-phase/cluster-reports/W8a-cluster-01-AMENDMENT-google-oauth.md
   (amendment doc — read amendment §3 to verify §3.1-3.9 doc edits
   were OVERRIDDEN per founder lock 2026-05-21 and NOT executed)
6. docs/execution-phase/cluster-reports/W8a-cluster-01-HANDOFF.md
   (current-state handoff — read-only)
7. docs/execution-phase/cluster-reports/W8a-cluster-01-PROGRESS.md
   (progress report — read-only)
8. docs/execution-phase/cluster-reports/W8a-cluster-01-DONE.md
   (DONE report — verify accuracy against the plan)
9. docs/execution-phase/cluster-audits/cluster-01-KOVA_AUDIT.md
   (Phase 1 audit gate output — verify completeness per
   IMPLEMENTATION_PROMPT.md §3)
10. docs/execution-phase/cluster-audits/cluster-01-tokens-used.md
    (Phase 1 token inventory — verify 4 Google-brand-exempt rows
    present)
11. docs/kova-final-prds/01-auth-and-identity.md (read-only)
12. docs/kova-final-impl-plans/01-auth-and-identity-plan.md
    (read-only — cross-reference Task 14-20 spec coverage)
13. /Users/jihoyang/kova-main/main-main-kova-scope/batch-a/light/Kova Hi-Fi A15 Auth - Light.html
    (visual reference — READ-ONLY)
14. /Users/jihoyang/kova-main/main-main-kova-scope/batch-a-additions/light/Kova Hi-Fi B4 Auth Errors - Light.html
    (visual reference — READ-ONLY)
15. /Users/jihoyang/kova-main/main-main-kova-scope/design-system/design.md
    (token canon + 14 bans)
16. CLAUDE.md root + outer
17. ~/.claude/rules/common/security.md
18. https://developers.google.com/identity/branding-guidelines
    (Google brand spec — WebFetch this URL to verify the G logo
    SVG used in KovaGoogleSignInButton matches the official mark)

## Mandatory skills

1. superpowers:using-superpowers
2. superpowers:verification-before-completion

## Mandatory subagents

1. superpowers:code-reviewer — full diff sweep against the v2 plan
2. vue-expert — Vue 3 Composition API discipline, reactivity in
   state machine views (LoginView 5 states), Reka UI integration,
   light-theme token application
3. typescript-pro — useGoogleOAuth typing (Supabase OAuthResponse
   discriminated union), prop types on the 8 shared auth-shell
   components, no `any` / no `!` discipline
4. security-auditor — Google OAuth flow security; verify
   `client_secret` never appears in `src/`; verify
   `signInWithOAuth` redirectTo is allowlist-correct; verify no
   PII in OAuth error logs

## Conditional subagents

- e2e-runner — re-run the 3 E2E specs (google-oauth-flow,
  magic-link-flow, otp-flow); capture screenshots of every
  surface state; verify Playwright route interception correctly
  mocks the Google OAuth round-trip
- database-reviewer — only invoke if the diff touches
  supabase/migrations/*.sql or supabase/functions/** (it SHOULD
  NOT — that is itself a CRITICAL finding)
- refactoring-specialist — only invoke if you find duplicated
  state-machine logic between SignupView and LoginView that
  warrants a shared composable (don't propose new code; flag for
  future consideration)

## v2 plan expected scope (verify against this scope)

ALLOWED net-new files:
- docs/execution-phase/cluster-audits/cluster-01-KOVA_AUDIT.md
- docs/execution-phase/cluster-audits/cluster-01-tokens-used.md
- design-system/hifi/auth/* (read-only copies, never modified
  after Phase 1.2)
- src/components/ui/KovaGoogleSignInButton.vue + .test.ts
- src/components/auth/AuthHeader.vue + .test.ts
- src/components/auth/AuthCard.vue + .test.ts
- src/components/auth/AuthField.vue + .test.ts
- src/components/auth/AuthCta.vue + .test.ts
- src/components/auth/AuthDivider.vue + .test.ts
- src/components/auth/AuthFootnote.vue + .test.ts
- src/components/auth/MagicLinkSentBlock.vue + .test.ts
- src/components/auth/OtpInput.vue + .test.ts
- src/components/auth/GoogleSignInButton.vue + .test.ts
- src/components/auth/DangerZoneCard.vue + .test.ts
- src/composables/auth/use-google-oauth.ts + .test.ts
- src/views/auth/AuthCallbackView.vue + .test.ts
- src/views/auth/MagicLinkErrorView.vue + .test.ts
- src/views/auth/EmailVerifiedView.vue + .test.ts
- src/views/auth/ForgotPasswordView.vue + .test.ts
- src/views/auth/MobileFallbackView.vue + .test.ts
- src/views/auth/AccountPendingDeletionView.vue + .test.ts
- src/views/auth/AccountDeletedView.vue + .test.ts
- tests/e2e/auth/google-oauth-flow.spec.ts
- tests/e2e/auth/magic-link-flow.spec.ts
- tests/e2e/auth/otp-flow.spec.ts
- tests/snapshots/cluster-01/<surface>-diff.md (per-surface,
  empty per IMPLEMENTATION_PROMPT.md §6)
- docs/execution-phase/cluster-reports/W8a-cluster-01-DONE.md

ALLOWED rewritten files (legacy OpenPencil content fully replaced):
- src/views/SignupView.vue (+ .test.ts)
- src/views/LoginView.vue (+ .test.ts)
- src/components/icons/GoogleIcon.vue (verify replaced with
  official Google G SVG OR confirmed already brand-compliant)

ALLOWED minimal-additive edits:
- src/router.ts — 7 new auth route records + mobile-fallback guard
- src/router.test.ts (new if absent; additive if present)
- src/stores/auth.ts — at MOST a one-line redirectTo correction
  inside the existing signInWithGoogle method; NO new methods,
  NO removed methods
- docs/operations/supabase-auth-config.md — APPEND a new "OAuth
  providers" section only (existing sections untouched)

FORBIDDEN paths (ANY edit = CRITICAL):
- docs/kova-final-prds/01-auth-and-identity.md
- docs/kova-final-impl-plans/01-auth-and-identity-plan.md
- docs/kova-final-prds/11-*.md
- docs/kova-final-impl-plans/11-*.md
- docs/execution-phase/cluster-reports/W8a-cluster-01-HANDOFF.md
- docs/execution-phase/cluster-reports/W8a-cluster-01-PROGRESS.md
- docs/execution-phase/cluster-reports/W8a-cluster-01-AMENDMENT-google-oauth.md
- docs/execution-phase/execution-prompts/W8a-cluster-01-auth.md
- docs/execution-phase/wave-audits/W8a-cluster-01-AUDIT.md
- /Users/jihoyang/kova-main/main-main-kova-scope/**/*.html
- /Users/jihoyang/kova-main/main-main-kova-scope/design-system/*.{md,css}
- packages/core/**
- src/composables/auth/use-magic-link.ts (shipped)
- src/composables/auth/use-otp.ts (shipped)
- src/composables/auth/use-email-change.ts (shipped)
- src/composables/auth/use-account-deletion.ts (shipped)
- src/composables/auth/use-session-watcher.ts (shipped)
- src/composables/auth/use-viewport-guard.ts (shipped)
- Any supabase/migrations/*.sql
- Any supabase/functions/**

## Audit dimensions

### A. Branch + diff baseline

  git fetch origin
  git log --oneline 58c3b93d..app/cluster-01-auth
  git diff --stat 58c3b93d..app/cluster-01-auth

Verify one-commit-per-task discipline (conventional commits —
prefixes feat / fix / docs / test / chore; scopes c01-t<N> or
c01-g<N> or c01-amend or c01-ops). Count commits — should be
approximately 30-40 (one per phase task + a handful of test +
docs commits). Investigate any commit that looks oversized
(>250 lines of diff for a single TDD task is suspect).

### B. Forbidden-doc edit grep (per scope §FORBIDDEN — CRITICAL)

Verify ZERO edits to forbidden paths:

  git diff 58c3b93d..app/cluster-01-auth -- \
    docs/kova-final-prds/01-auth-and-identity.md \
    docs/kova-final-impl-plans/01-auth-and-identity-plan.md \
    'docs/kova-final-prds/11-*.md' \
    'docs/kova-final-impl-plans/11-*.md' \
    docs/execution-phase/cluster-reports/W8a-cluster-01-HANDOFF.md \
    docs/execution-phase/cluster-reports/W8a-cluster-01-PROGRESS.md \
    docs/execution-phase/cluster-reports/W8a-cluster-01-AMENDMENT-google-oauth.md \
    docs/execution-phase/execution-prompts/W8a-cluster-01-auth.md \
    docs/execution-phase/wave-audits/W8a-cluster-01-AUDIT.md \
    'packages/core/**' \
    'supabase/migrations/**' \
    'supabase/functions/**'

ANY non-empty diff = CRITICAL. Founder lock 2026-05-21 violated.

Also verify hi-fi files untouched (outer canonical is outside
worktree so impossible to edit, but verify in-repo copies):

  git log --oneline 58c3b93d..app/cluster-01-auth -- \
    design-system/hifi/auth/

Should show exactly ONE commit (the Phase 1.2 copy commit) and
NOTHING after it touching that path. Any additional commit =
CRITICAL.

### C. Shipped-backend untouched (CRITICAL)

  git diff 58c3b93d..app/cluster-01-auth -- \
    src/composables/auth/use-magic-link.ts \
    src/composables/auth/use-otp.ts \
    src/composables/auth/use-email-change.ts \
    src/composables/auth/use-account-deletion.ts \
    src/composables/auth/use-session-watcher.ts \
    src/composables/auth/use-viewport-guard.ts

ANY non-empty diff = CRITICAL. These were shipped in W8a v1
backend and the v2 plan §2 explicitly lists them as untouchable.

### D. Phase 1 audit gate verification (per IMPLEMENTATION_PROMPT.md §3)

Open docs/execution-phase/cluster-audits/cluster-01-KOVA_AUDIT.md.
Verify per IMPLEMENTATION_PROMPT.md §3 spec:
- One section per surface listed in PRD 01 §3.1 — A15.01-A15.06
  + B4.1-B4.6
- Each section has: hi-fi reference path, token inventory, DOM
  structure plan, behavior spec, one row per element with
  source-value + token columns
- AMENDED Signup + Login surfaces note "Google button visual
  derived from KovaGoogleSignInButton primitive per Google brand
  spec, NOT from a hi-fi HTML mockup"

MISSING surface = HIGH. Section without token rows = HIGH.

Open docs/execution-phase/cluster-audits/cluster-01-tokens-used.md.
Verify the 3-4 Google-brand-exempt rows present (#131314, #8e918f,
#ffffff dark-text, plus optional #1f1f20 hover) — each annotated
"Token-exempt per Google brand requirement".

Missing exemption row = HIGH. Wrong hex value (not matching
Google brand spec) = HIGH.

### E. Founder-approved Phase 1 evidence

Verify the executing agent triggered AskUserQuestion at Phase
1.5 (founder approval gate). Evidence: a commit prior to Phase
2.5 (the first KovaGoogleSignInButton commit) that lands the
Phase 1 docs. The Phase 1 commit message per plan §1.6 is
"docs(c01): Phase 1 audit gate — KOVA_AUDIT + tokens-used + hi-fi
copies".

Commit absent or out-of-order = HIGH (skipped audit gate).

### F. KovaGoogleSignInButton — Google brand-spec compliance (CRITICAL)

Open src/components/ui/KovaGoogleSignInButton.vue. Verify:

1. Root element is `<button type="button">` (NOT `<a>` —
   accessibility per amendment §3.3). Any other element =
   CRITICAL.

2. Inline SVG has EXACTLY 4 `<path>` elements with fills:
   - #4285F4 (Google blue, top-right arc)
   - #34A853 (Google green, bottom arc)
   - #FBBC05 (Google yellow, left arc)
   - #EA4335 (Google red, top-left arc)
   Missing color or wrong hex = CRITICAL (brand spec violation).

3. SVG viewBox = "0 0 48 48". Different = HIGH.

4. Width/height = 18/18 (or 16/16 — match Google spec). Other
   value = MEDIUM.

5. Cross-check against the official spec:
   WebFetch https://developers.google.com/identity/branding-guidelines
   Compare the SVG path data to the official mark. If path data
   differs structurally (not just whitespace), report HIGH.

6. Light theme: bg #ffffff (token-exempt), color var(--ink),
   border 1px solid var(--line). Dark theme: bg #131314, color
   #ffffff, border 1px solid #8e918f. Any drift from these exact
   values = HIGH.

7. Label per mode prop: "Continue with Google" (signin) /
   "Sign up with Google" (signup). Wrong copy = MEDIUM.

8. Height = 44px (auth-surface CTA height). Other = MEDIUM.

9. border-radius consumes var(--r-md). Hardcoded radius = HIGH.

### G. Token discipline — token-exempt grep (CRITICAL)

The 4 Google-brand hex literals must appear ONLY in
KovaGoogleSignInButton.vue:

  git grep -nE '#131314|#8e918f' src/
  git grep -nE '#4285F4|#34A853|#FBBC05|#EA4335' src/

Expected: every hit is inside
src/components/ui/KovaGoogleSignInButton.vue. Any other file =
CRITICAL (token leak).

Verify the token-exempt annotation comment is present on each
line carrying these values:

  grep -n 'token-exempt' src/components/ui/KovaGoogleSignInButton.vue

Should appear 4+ times. Missing annotation = HIGH.

### H. <style scoped> single-exception verification (CRITICAL)

The v2 plan §2 + plan §8 + plan §12.3 specify EXACTLY ONE
<style scoped> block in the codebase, inside
KovaGoogleSignInButton.vue.

  git grep -l '<style scoped' src/

Expected: exactly one file
(src/components/ui/KovaGoogleSignInButton.vue). Multiple files
or zero files = CRITICAL.

Cross-check: no <style> blocks elsewhere either:

  git grep -l '<style' src/ | wc -l

Should be 1.

### I. Other CLAUDE.md hard-constraint grep sweep

  git diff 58c3b93d..app/cluster-01-auth -- 'src/**' \
    | grep -nE 'Math\.random|: any[^a-zA-Z]|!\.[a-zA-Z]|<icon-lucide-|<svg(?! class="google-signin)'

- Math.random hit = CRITICAL (use crypto.getRandomValues only)
- `: any` hit = CRITICAL (no any)
- `!.` non-null assertion = CRITICAL (no ! assertions)
- `<icon-lucide-*>` direct usage = HIGH (use KovaIcon registry)
- `<svg>` outside KovaGoogleSignInButton or GoogleIcon = HIGH

Verify `e.code` not `e.key` in any keyboard handler:

  git diff 58c3b93d..app/cluster-01-auth -- 'src/**' \
    | grep -nE "e\.key|event\.key"

Any hit outside comments = HIGH.

Verify VITE_ prefix discipline:

  git grep -nE 'VITE_SUPABASE_SERVICE_ROLE_KEY|VITE_ANTHROPIC|VITE_STRIPE_SECRET|VITE_GOOGLE_CLIENT_SECRET' src/

ANY hit = CRITICAL (server-only secret exposed to browser).

Verify no Google client_secret literal:

  git grep -nE 'client_secret|GOOGLE_CLIENT_SECRET|GOCSPX-' src/

ANY hit = CRITICAL.

### J. Vue auth shell completeness (per plan Phase 5-9)

Verify each net-new file in scope §ALLOWED net-new files
actually exists at HEAD:

  ls src/components/ui/KovaGoogleSignInButton.vue \
     src/components/auth/AuthHeader.vue \
     src/components/auth/AuthCard.vue \
     src/components/auth/AuthField.vue \
     src/components/auth/AuthCta.vue \
     src/components/auth/AuthDivider.vue \
     src/components/auth/AuthFootnote.vue \
     src/components/auth/MagicLinkSentBlock.vue \
     src/components/auth/OtpInput.vue \
     src/components/auth/GoogleSignInButton.vue \
     src/components/auth/DangerZoneCard.vue \
     src/composables/auth/use-google-oauth.ts \
     src/views/auth/AuthCallbackView.vue \
     src/views/auth/MagicLinkErrorView.vue \
     src/views/auth/EmailVerifiedView.vue \
     src/views/auth/ForgotPasswordView.vue \
     src/views/auth/MobileFallbackView.vue \
     src/views/auth/AccountPendingDeletionView.vue \
     src/views/auth/AccountDeletedView.vue

Each missing file = HIGH (plan task incomplete).

Each component must have a sibling .test.ts. Missing test = HIGH
(TDD discipline violated).

### K. SignupView + LoginView rewrite verification

  cat src/views/SignupView.vue | grep -c 'signInWithPassword\|password'
  cat src/views/LoginView.vue | grep -c 'signInWithPassword\|password'

Expected: 0 occurrences (legacy email+password dropped). Any
hit = HIGH (legacy code residual).

Verify state-machine completeness in LoginView:

  grep -nE "'email-entry'|'magic-link-sent'|'otp-entry'|'otp-wrong'|'otp-locked'" src/views/LoginView.vue

Expected: all 5 strings present. Missing state = HIGH.

Verify GoogleSignInButton import in BOTH views:

  grep -n 'GoogleSignInButton' src/views/SignupView.vue \
                                src/views/LoginView.vue

### L. Router wiring per plan Phase 10

  grep -nE "'/auth/callback'|'/auth/magic'|'/auth/email-verified'|'/forgot-password'|'/account-pending-deletion'|'/account-deleted'|'/mobile-fallback'" src/router.ts

Expected: 7 route records. Missing route = HIGH.

Verify ForgotPasswordView is behind FORGOT_PASSWORD_ENABLED flag:

  grep -n 'FORGOT_PASSWORD_ENABLED' src/

Should appear in router.ts OR LoginView.vue (controlling
visibility of the field-label "Forgot password?" link). Absent =
MEDIUM.

Verify mobile-fallback guard wired to /signup + /login:

  grep -nE 'useViewportGuard|mobile-fallback' src/router.ts

Should appear. Absent = MEDIUM.

### M. use-google-oauth composable correctness

Open src/composables/auth/use-google-oauth.ts. Verify:

1. Calls supabase.auth.signInWithOAuth with provider='google'
   and redirectTo=`${window.location.origin}/auth/callback`.
   Any other redirect target = CRITICAL (security).

2. Returns discriminated union `{ ok: true } | { ok: false;
   reason: string }`. Other shape = MEDIUM (plan §3 type
   contract).

3. Exposes reactive `isStarting: Ref<boolean>` toggled around
   the await. Absent = MEDIUM.

4. No `client_secret` reference anywhere. Confirmed via §I grep.

5. queryParams { access_type: 'offline', prompt: 'consent' }
   present (matches Supabase docs for refresh-token issuance).
   Absent = LOW (Supabase works without but loses refresh-token
   on subsequent sign-ins).

### N. AuthCallbackView dual-provider handling

Open src/views/auth/AuthCallbackView.vue. Verify:

1. On mount, calls supabase.auth.getSession() to retrieve the
   Supabase-populated session.

2. Routing branch: `hasBrands === false` → /onboarding;
   `hasBrands === true` → /dashboard.

3. Timeout fallback: if no session within 5 seconds → navigate
   /login?status=callback_failed.

4. Identical handling regardless of session.user.app_metadata.
   provider ('email' for magic-link, 'google' for Google).
   Verify with the AuthCallbackView.test.ts assertions.

5. No PKCE / OAuth state handling in app code (Supabase JS SDK
   handles PKCE natively — verify no manual code/state
   extraction from URL).

### O. supabase-auth-config.md append-only

  git diff 58c3b93d..app/cluster-01-auth -- docs/operations/supabase-auth-config.md

Should show only ADDITIONS (the new "OAuth providers" section).
ANY edit to existing lines = MEDIUM (plan §12.1 specified
append-only).

### P. Test coverage + E2E pass

Re-run:

  bun run test:unit
  bun run test

Expected: all unit tests + 3 E2E specs PASS.

Spot-check 3 component tests for quality (not just coverage):
- KovaGoogleSignInButton.test.ts: 8+ assertions per §F
- use-google-oauth.test.ts: 3 assertions (happy / error /
  isStarting reactivity)
- AuthCallbackView.test.ts: dual-provider parity assertion

### Q. Quality gates (re-run)

  bun install
  bun run check
  bun run format -- --check
  bun run test:unit
  bun run test:dupes
  bun run test
  bun run build

ANY red gate = HIGH (plan §12.2 requires all green at DONE).

### R. Code-review sweep

Spawn superpowers:code-reviewer with brief:
  "Audit 58c3b93d..app/cluster-01-auth full diff. Focus:
   - v2 plan §8 acceptance criteria checklist
   - Forbidden-doc edit verification (per dimension B above)
   - Google brand spec compliance (per dimension F)
   - Token discipline (per dimension G)
   - Single <style scoped> exception (per dimension H)
   - CLAUDE.md hard constraints (per dimension I)
   - Plan task completion (Phases 1-12 all done)
   - Conventional commits + one-per-task discipline
   Report CRITICAL/HIGH/MEDIUM/LOW with file:line citations."

### S. Security audit

Spawn security-auditor with brief:
  "Audit 58c3b93d..app/cluster-01-auth for OAuth security:
   - No client_secret / GOOGLE_CLIENT_SECRET in src/
   - signInWithOAuth redirectTo on allowlist
   - PKCE handled by Supabase (no manual state/verifier in app)
   - No PII in OAuth error logs
   - Mobile-fallback redirect does not expose session tokens
   - Verify any auth-error path does not leak provider details
     that aid enumeration (B4.6 PRD §12.5 — enumeration-safe
     pivot consideration)
   Report CRITICAL/HIGH/MEDIUM/LOW."

### T. E2E artifact verification

Spawn e2e-runner with brief:
  "Re-run tests/e2e/auth/google-oauth-flow.spec.ts,
   magic-link-flow.spec.ts, otp-flow.spec.ts. Capture
   screenshots of every state surface (email-entry,
   magic-link-sent, otp-entry, otp-wrong, otp-locked,
   magic-link-expired, magic-link-invalid, mobile-fallback,
   email-verified, account-pending-deletion, account-deleted).
   Verify the Google OAuth round-trip is correctly mocked via
   Playwright page.route(...) interception. Upload artifacts."

### U. DONE report accuracy

Open docs/execution-phase/cluster-reports/W8a-cluster-01-DONE.md.
Spot-check 5 DONE claims by reading the referenced code at HEAD.
Any DONE-vs-code mismatch = HIGH.

### V. Plan task completion walk

Walk v2 plan §7 Phases 1-12 task-by-task. For each `- [ ]`
checkbox, verify the corresponding code/doc exists. Any
unchecked-but-claimed-done task = HIGH.

Mark each phase verified ✅ / ⚠️ partial / 🛑 missing in the
report.

## Output

  docs/execution-phase/wave-audits/reports/W8a-amendment-google-oauth-AUDIT-REPORT.md

Format per W7 template. Include these dedicated sections:
- "Forbidden-doc edit verification" (per §B — grep audit)
- "Shipped-backend untouched verification" (per §C — grep audit)
- "Google brand-spec compliance" (per §F — SVG path + token
  audit)
- "Token-exempt leak audit" (per §G — grep + annotation check)
- "<style scoped> single-exception verification" (per §H)
- "Vue auth shell completeness matrix" (per §J — file × test
  table)
- "Phase-by-phase task completion verdict" (per §V — ✅ / ⚠️ /
  🛑 per phase)

Verdict categories: CRITICAL / HIGH / MEDIUM / LOW.
Overall verdict: ✅ PASS / ⚠️ PASS WITH WARNINGS / 🛑 BLOCK.

Print closing line:
  "W8a v2 (Google OAuth amendment) AUDIT COMPLETE.
  Verdict: <V>. <N> findings.
  Report: docs/execution-phase/wave-audits/reports/W8a-amendment-google-oauth-AUDIT-REPORT.md"

Begin. Mandatory docs first.
```

---

## Notes for the audit agent

- **Independence:** you did not write the v2 work. Trust the diff,
  not the DONE report. Cross-verify every DONE claim against code.
- **Caveman mode awareness:** founder runs `/caveman full` in chat.
  Your AskUserQuestion text + final report = write normal English.
  Status updates between dimensions in chat may be terse.
- **No fixes.** Report-only. If you discover a CRITICAL, surface
  via AskUserQuestion immediately; do not patch.
- **AskUserQuestion liberally:** CRITICAL findings, ambiguous scope
  (e.g., is a particular file an "additive edit" or a "rewrite"),
  borderline brand-spec drift.
- **Worktree:** `/Users/jihoyang/kova-build-c01` on branch
  `app/cluster-01-auth`. All git commands run there.

---

**Estimated wall-clock: 75-120 min. Token spend: $90-160.**

End of audit prompt.
