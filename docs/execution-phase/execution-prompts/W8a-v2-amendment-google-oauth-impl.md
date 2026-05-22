# W8a Amendment — Google OAuth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Do NOT use `superpowers:subagent-driven-development` for Phase 2-10 mechanical TDD.** This plan already carries inline code skeletons, file paths, and test cases per task — per-task subagent dispatch wastes budget on redundant doc re-reads (each subagent re-loads the 15 mandatory docs cold). Direct in-session TDD execution is faster + tighter for this plan shape.
>
> **Reserve subagent dispatch for the named roles in §4 only:**
> - Phase 11 — `security-auditor` + `e2e-runner` (independent OAuth security review + Playwright artifact capture)
> - Phase 12 — `superpowers:code-reviewer` (full-diff sweep)
> - Phase 5+ — `vue-expert` / `typescript-pro` only when you hit a genuine edge case that warrants independent judgment (reactivity bug, OAuth discriminated-union typing). Do not dispatch reflexively per phase.

**Goal:** Ship the Vue auth surface for W8a Cluster 01 with Google OAuth grafted onto the already-shipped magic-link + OTP backend. After this plan completes, c01 is done and the founder advances to W8b.

**Architecture:** Backend (magic-link + OTP + GDPR cascade + Edge Functions + RPCs) ALREADY SHIPPED on this branch (`app/cluster-01-auth` @ commit `58c3b93d`). This plan ships the BLOCKED Vue auth shell with the amendment's Google OAuth alternative integrated from day one. New files only — no edits to PRD 01, Plan 01, hi-fi HTML, exec prompt `W8a-cluster-01-auth.md`, HANDOFF, PROGRESS, or audit rubric. Legacy OpenPencil-inherited `SignupView.vue` / `LoginView.vue` / `GoogleIcon.vue` get rewritten end-to-end (net-new content; legacy email+password flow is dropped).

**Tech Stack:** Vue 3 Composition API · TypeScript · Pinia (existing `useAuthStore` extended) · Vue Router · Supabase Auth (magic-link, OTP, OAuth Google) · Reka UI · Tailwind 4 + canonical `kova-hifi-light.css` · Cluster 11 primitives · Vitest + Playwright.

**Branch:** `app/cluster-01-auth` (current). All commits land here.

**Worktree:** `/Users/jihoyang/kova-build-c01`.

---

## 0. Source of truth (mandatory reading — cover-to-cover, no skim)

The fresh agent MUST read these in order before touching code. The amendment + handoff + IMPLEMENTATION_PROMPT define the visual-fidelity contract and the audit gate that PRECEDES any Vue code.

| # | Path | Why |
|---|---|---|
| 1 | `docs/execution-phase/MASTER-EXECUTION-GUIDE.md` | Wave-by-wave execution framework, gate definitions |
| 2 | `docs/execution-phase/claude-design-files/IMPLEMENTATION_PROMPT.md` | **Phase 1 audit gate spec** + 3-rule visual-fidelity contract + drift protocol §7 |
| 3 | `docs/execution-phase/DESIGN-SYSTEM-COMPLIANCE-RIDER.md` | Token discipline, ban list enforcement |
| 4 | `docs/execution-phase/cluster-reports/W8a-cluster-01-HANDOFF.md` | Current state of c01 — what's done, blockers, decisions, pitfalls. **§4.5 + §6 + §7 are load-bearing.** |
| 5 | `docs/execution-phase/cluster-reports/W8a-cluster-01-AMENDMENT-google-oauth.md` | The Google OAuth scope addition. §2 + §3.3 + §4 + §5 + §7 + §8. **§3.1-3.9 doc edits are OVERRIDDEN by this plan — do NOT execute them.** |
| 6 | `docs/execution-phase/cluster-reports/W8a-cluster-01-PROGRESS.md` | Backend-shipped checklist, what's left |
| 7 | `docs/kova-final-prds/01-auth-and-identity.md` | PRD 01 — the WHY (§§1-3, 6.4, 8.1, 11). Read-only. |
| 8 | `docs/kova-final-impl-plans/01-auth-and-identity-plan.md` | Plan 01 — Tasks 14-20 task specs are the source for Vue file structure + component contracts. Read-only. |
| 9 | `/Users/jihoyang/kova-main/main-main-kova-scope/design-system/design.md` | Token canon + 14 bans |
| 10 | `/Users/jihoyang/kova-main/main-main-kova-scope/design-system/kova-hifi-light.css` | Light-theme tokens for auth surfaces |
| 11 | `/Users/jihoyang/kova-main/main-main-kova-scope/batch-a/light/Kova Hi-Fi A15 Auth - Light.html` | Visual reference for Signup / Login / Magic-link-sent / OTP / Email-verified / Forgot-password. **READ-ONLY — never modify.** |
| 12 | `/Users/jihoyang/kova-main/main-main-kova-scope/batch-a-additions/light/Kova Hi-Fi B4 Auth Errors - Light.html` | Visual reference for B4.1-B4.6 error states. **READ-ONLY.** |
| 13 | `docs/operations/supabase-auth-config.md` | Supabase Auth provider config (extend with Google section per §3 below — this IS allowed) |
| 14 | `CLAUDE.md` (root + `kova-open-pencil-1/`) | Hard constraints, lift-the-lock policy, coding conventions |
| 15 | `~/.claude/rules/common/security.md` | Pre-commit security checklist |

---

## 1. What's already shipped (DO NOT re-do)

Verified at HEAD `58c3b93d` on `app/cluster-01-auth`:

- **Migration:** `supabase/migrations/20260522_01_users_account_lifecycle.sql` — `users` lifecycle columns + GDPR queue + RPCs
- **Edge Functions:** `supabase/functions/_shared/` helpers + `account-deletion` + `account-deletion-restore` + `email-change` + GDPR cron orchestrator
- **Composables:** `src/composables/auth/use-magic-link.ts`, `use-otp.ts`, `use-email-change.ts`, `use-account-deletion.ts`, `use-session-watcher.ts`, `use-viewport-guard.ts`
- **Pinia store extensions:** `src/stores/auth.ts` carries the W8a-era surface (new methods alongside legacy `signIn` / `signUp` / `signInWithGoogle`)
- **Router guard:** existing route-meta auth middleware
- **Legal docs:** Privacy + RoPA
- **Supabase config checklist:** `docs/operations/supabase-auth-config.md`
- **Cron schedule:** `vercel.json` GDPR cron entry

**Backend tests pass.** The lint cleanup + cron orchestrator test mock-leak fix landed (`26525038`).

---

## 2. What you build (THIS plan ships)

### Net-new files

| Path | Purpose |
|---|---|
| `docs/execution-phase/cluster-audits/cluster-01-KOVA_AUDIT.md` | Phase 1 audit doc per IMPLEMENTATION_PROMPT.md §3 |
| `docs/execution-phase/cluster-audits/cluster-01-tokens-used.md` | Phase 1 token inventory + 1 Google-brand exemption row |
| `design-system/hifi/auth/` (copy from outer) | Read-only copies of A15 + B4 hi-fi HTML files (COPIED, not modified) |
| `src/components/ui/KovaGoogleSignInButton.vue` | New Cluster 11 primitive — Google-brand-compliant button |
| `src/components/ui/KovaGoogleSignInButton.test.ts` | Unit tests |
| `src/components/auth/AuthHeader.vue` | Shared auth-shell — logo + nav |
| `src/components/auth/AuthCard.vue` | Shared auth-shell — centered card chrome |
| `src/components/auth/AuthField.vue` | Single-field input row with label + inline error |
| `src/components/auth/AuthCta.vue` | Primary submit button row |
| `src/components/auth/AuthDivider.vue` | "or" divider between Google button and email field (Notion pattern) |
| `src/components/auth/AuthFootnote.vue` | "Already have an account?" / "Don't have an account?" link row |
| `src/components/auth/MagicLinkSentBlock.vue` | A15.03 — headline + email + 60s resend timer + "Enter code instead" link |
| `src/components/auth/OtpInput.vue` | A15.04 — 6-digit code input with paste handling |
| `src/components/auth/GoogleSignInButton.vue` | Wrapper over `KovaGoogleSignInButton`, calls `useGoogleOAuth` |
| `src/components/auth/DangerZoneCard.vue` | Account → Delete account modal trigger (Plan 01 Task 19; cross-link Cluster 04) |
| `src/composables/auth/use-google-oauth.ts` | New composable — wraps `supabase.auth.signInWithOAuth({ provider: 'google' })` |
| `src/components/auth/*.test.ts` | One unit test per component |
| `src/composables/auth/use-google-oauth.test.ts` | Composable unit test |
| `tests/e2e/auth/google-oauth-flow.spec.ts` | E2E spec — Google flow round-trip with Playwright route interception |
| `tests/e2e/auth/magic-link-flow.spec.ts` | E2E spec — magic-link round-trip |
| `tests/e2e/auth/otp-flow.spec.ts` | E2E spec — OTP round-trip |
| `tests/snapshots/cluster-01/` | Per-surface written diff stubs (empty per IMPLEMENTATION_PROMPT.md §6) |
| `docs/execution-phase/cluster-reports/W8a-cluster-01-DONE.md` | Cluster-end DONE report |

### Files REWRITTEN (legacy OpenPencil inherited content fully replaced)

| Path | Change |
|---|---|
| `src/views/SignupView.vue` | Drop legacy email+password+confirm UI. New content: magic-link signup with Google button above + AuthField email + AuthCta. State: `email-entry` → `magic-link-sent` (mounts `<MagicLinkSentBlock>`). |
| `src/views/LoginView.vue` | Drop legacy. New content: 5-state machine per Plan 01 §6.4 — `email-entry` (A15.02) / `magic-link-sent` (A15.03) / `otp-entry` (A15.04) / `otp-wrong` (B4.3 inline) / `otp-locked` (B4.4). Google button above email field. |
| `src/components/icons/GoogleIcon.vue` | Replace with Google's OFFICIAL G logo SVG per [Google branding guidelines](https://developers.google.com/identity/branding-guidelines). The legacy SVG may not be brand-compliant — verify. If compliant, keep as-is. Either way, ensure the file ships the colored 4-quadrant G mark. |

### Files MODIFIED (minimal additive edits — no shape change)

| Path | Change |
|---|---|
| `src/router.ts` | Wire 7 new auth routes per Plan 01 §6.4: `/auth/callback`, `/auth/magic?status=expired\|invalid`, `/auth/email-verified`, `/forgot-password` (hidden behind `FORGOT_PASSWORD_ENABLED=false`), `/account-pending-deletion`, `/account-deleted`. Mobile fallback redirect for `/signup` + `/login` when `useViewportGuard` reports phone. |
| `src/stores/auth.ts` | NO shape change. The existing `signInWithGoogle` method already delegates to `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })` — verify redirectTo points to `${window.location.origin}/auth/callback`. If yes, no edit needed. If wrong, one-line patch. |
| `docs/operations/supabase-auth-config.md` | Append "OAuth providers" section per amendment §3.6 (founder pre-flight + Google Cloud Console steps). |

### Files NEVER touched

- `docs/kova-final-prds/01-auth-and-identity.md`
- `docs/kova-final-impl-plans/01-auth-and-identity-plan.md`
- `docs/kova-final-prds/11-*.md`
- `docs/kova-final-impl-plans/11-*.md`
- `docs/execution-phase/cluster-reports/W8a-cluster-01-HANDOFF.md`
- `docs/execution-phase/cluster-reports/W8a-cluster-01-PROGRESS.md`
- `docs/execution-phase/cluster-reports/W8a-cluster-01-AMENDMENT-google-oauth.md` (read-only input)
- `docs/execution-phase/execution-prompts/W8a-cluster-01-auth.md` (original exec prompt — stays stale; this plan supersedes for the Vue portion)
- `docs/execution-phase/wave-audits/W8a-cluster-01-AUDIT.md` (audit rubric — read-only)
- `/Users/jihoyang/kova-main/main-main-kova-scope/**/*.html` (HI-FI FILES — READ-ONLY)
- `/Users/jihoyang/kova-main/main-main-kova-scope/design-system/*.{md,css}` (CANONICAL — READ-ONLY)
- `packages/core/**` (LOCKED unless cluster has lift-the-lock — c01 does not)
- `src/composables/auth/use-magic-link.ts` (shipped)
- `src/composables/auth/use-otp.ts` (shipped)
- `src/composables/auth/use-email-change.ts` (shipped)
- `src/composables/auth/use-account-deletion.ts` (shipped)
- `src/composables/auth/use-session-watcher.ts` (shipped)
- `src/composables/auth/use-viewport-guard.ts` (shipped)
- Any `supabase/migrations/*.sql` (shipped)
- Any `supabase/functions/**` (shipped)

---

## 3. Mandatory skills (load before phase 1)

1. `superpowers:using-superpowers` (auto-injected on session start)
2. `superpowers:test-driven-development` — every component test FAILS before impl
3. `superpowers:verification-before-completion` — every DONE claim requires evidence
4. `superpowers:requesting-code-review` — at the end (before DONE report)

## 4. Mandatory subagents (dispatch as instructed per phase)

| Subagent | When | Brief |
|---|---|---|
| `vue-expert` | Phases 2-9 | Composition API + reactivity discipline + Reka UI patterns + light/dark theme switching for auth pages |
| `typescript-pro` | Phase 5 | `useGoogleOAuth` typing (Supabase `OAuthResponse` discriminated union) |
| `security-auditor` | End of Phase 11 | OAuth flow audit — `client_secret` never in `src/`, PKCE handled by Supabase, redirect_uri allowlist correctness |
| `e2e-runner` | Phase 11 | Playwright route-interception for Google OAuth redirect mock; magic-link + OTP happy paths |
| `superpowers:code-reviewer` | End of Phase 12 | Full diff sweep — design-system compliance, hard-constraint grep, scope discipline, plan task completion |

## 5. Conditional subagents

- `database-reviewer` — only if you find yourself modifying any `supabase/migrations/*.sql`. You should NOT — flag CRITICAL via AskUserQuestion if you think you need to.
- `refactoring-specialist` — only if the legacy `SignupView.vue` / `LoginView.vue` rewrite reveals shared structure that warrants a 4th shared component beyond the 8 specified.

---

## 6. Founder pre-flight (BEFORE Phase 2)

Per amendment §4. The agent VERIFIES these are done before writing Vue code. If not done, halt and AskUserQuestion the founder.

- [ ] Google Cloud project created (founder records project ID in `docs/operations/supabase-auth-config.md` after this plan appends the section)
- [ ] OAuth 2.0 Client ID created (Web application). Authorized JavaScript origins: `https://app.kova.io` + `http://localhost:1420`. Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`
- [ ] Client ID + secret pasted into Supabase Studio → Authentication → Providers → Google → enabled (local + staging + prod)
- [ ] Founder confirms via AskUserQuestion: "Google provider enabled in Supabase Studio?" before Phase 2 begins

---

## 7. Phases

### Phase 1 — Audit gate (BLOCKING per IMPLEMENTATION_PROMPT.md §3)

**Files:**
- Create: `docs/execution-phase/cluster-audits/cluster-01-KOVA_AUDIT.md`
- Create: `docs/execution-phase/cluster-audits/cluster-01-tokens-used.md`
- Create: `design-system/hifi/auth/` (copy A15 + B4 hi-fi HTML files into worktree)

- [ ] **1.1** Read IMPLEMENTATION_PROMPT.md cover-to-cover. Internalize the 3-rule visual-fidelity contract (values COPIED, DOM TRANSLATED, behavior ENGINEERED) and the drift protocol §7.

- [ ] **1.2** Copy A15 + B4 hi-fi HTML files from outer canonical into in-repo `design-system/hifi/auth/`. Do NOT modify them.

  ```bash
  mkdir -p design-system/hifi/auth
  cp "/Users/jihoyang/kova-main/main-main-kova-scope/batch-a/light/Kova Hi-Fi A15 Auth - Light.html" design-system/hifi/auth/
  cp "/Users/jihoyang/kova-main/main-main-kova-scope/batch-a-additions/light/Kova Hi-Fi B4 Auth Errors - Light.html" design-system/hifi/auth/
  ```

- [ ] **1.3** Write `cluster-01-KOVA_AUDIT.md` per IMPLEMENTATION_PROMPT.md §3:
  - For EACH surface listed in PRD 01 §3.1 (A15.01-A15.06, B4.1-B4.6, plus the amendment's two amended Signup + Login screens — note "Google button visual derived from KovaGoogleSignInButton primitive per Google brand spec, NOT from a hi-fi HTML mockup; A15 hi-fi is NOT amended per founder lock 2026-05-21"):
    - Hi-fi reference path
    - Token inventory (per element)
    - DOM structure plan
    - Behavior spec
    - One row per element with `<source value>` and `<token>` columns

- [ ] **1.4** Write `cluster-01-tokens-used.md`:
  - One token per row
  - Include the GOOGLE-BRAND EXEMPTION row:
    | Token | Value | Source | Status |
    |---|---|---|---|
    | (none — token-exempt) | `#131314` | Google branding guidelines (dark theme bg) | **Token-exempt per Google brand requirement.** Annotated inline at `KovaGoogleSignInButton.vue` with `/* token-exempt: Google brand requirement */` |
    | (none — token-exempt) | `#8e918f` | Google branding guidelines (dark theme border) | Same as above |
    | (none — token-exempt) | `#ffffff` | Google branding guidelines (dark theme text) | Same as above |
  - All other Google button colors (light theme bg `#ffffff`, light theme text `--ink`, border `--line`) come from canonical tokens.

- [ ] **1.5** Run AskUserQuestion to founder:
  ```
  Question: "Phase 1 audit gate ready for review. Two files staged:
            cluster-01-KOVA_AUDIT.md ({N} surfaces audited)
            cluster-01-tokens-used.md ({M} tokens + 3 Google-brand exemptions).
            Approve to proceed to Phase 2?"
  Options:
    - Approve — proceed to Phase 2
    - Request changes — list the surfaces / rows needing fixes
  ```

- [ ] **1.6** On approval, commit Phase 1 docs.

  ```bash
  git add docs/execution-phase/cluster-audits/cluster-01-KOVA_AUDIT.md \
          docs/execution-phase/cluster-audits/cluster-01-tokens-used.md \
          design-system/hifi/auth/
  git commit -m "docs(c01): Phase 1 audit gate — KOVA_AUDIT + tokens-used + hi-fi copies"
  ```

### Phase 2 — KovaGoogleSignInButton primitive (Cluster 11 surface, net-new file)

**Files:**
- Create: `src/components/ui/KovaGoogleSignInButton.vue`
- Create: `src/components/ui/KovaGoogleSignInButton.test.ts`

- [ ] **2.1 (test first)** Write `KovaGoogleSignInButton.test.ts` with these test cases:
  - renders with `mode="signin"` → label "Continue with Google"
  - renders with `mode="signup"` → label "Sign up with Google"
  - renders with `theme="light"` (default) → `--ink` text color, `#ffffff` bg, `--line` border
  - renders with `theme="dark"` → `#ffffff` text, `#131314` bg, `#8e918f` border
  - emits `click` event on button click
  - root element is `<button type="button">` (NOT `<a>` — accessibility per amendment §3.3)
  - inline SVG = Google's official 4-color G mark (assert presence of 4 `<path>` elements with brand-colors `#4285F4` `#34A853` `#FBBC05` `#EA4335`)
  - height matches `.btn` (44px on auth surfaces; check via computed style or class assertion)
  - `border-radius` consumes `var(--r-md)`

- [ ] **2.2** Run tests — they fail (component does not exist).

  Run: `bun test src/components/ui/KovaGoogleSignInButton.test.ts`
  Expected: FAIL — module not found

- [ ] **2.3** Implement `KovaGoogleSignInButton.vue`:

  ```vue
  <script setup lang="ts">
  import { computed } from 'vue'

  export interface KovaGoogleSignInButtonProps {
    mode: 'signin' | 'signup'
    theme?: 'light' | 'dark'
    disabled?: boolean
  }

  const props = withDefaults(defineProps<KovaGoogleSignInButtonProps>(), {
    theme: 'light',
    disabled: false,
  })

  const emit = defineEmits<{ click: [] }>()

  const label = computed(() =>
    props.mode === 'signin' ? 'Continue with Google' : 'Sign up with Google'
  )

  const themeClass = computed(() =>
    props.theme === 'dark' ? 'google-signin--dark' : 'google-signin--light'
  )
  </script>

  <template>
    <button
      type="button"
      class="google-signin"
      :class="themeClass"
      :disabled="disabled"
      @click="emit('click')"
    >
      <svg
        class="google-signin__logo"
        viewBox="0 0 48 48"
        width="18"
        height="18"
        aria-hidden="true"
      >
        <!-- Google official G mark per https://developers.google.com/identity/branding-guidelines -->
        <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"/>
        <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"/>
        <path fill="#FBBC05" d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z"/>
        <path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7C13.42 14.62 18.27 10.75 24 10.75z"/>
      </svg>
      <span class="google-signin__label">{{ label }}</span>
    </button>
  </template>

  <style scoped>
  /*
   * Google-brand-spec primitive. The dark-theme hex literals are
   * TOKEN-EXEMPT per Google branding requirements — recorded in
   * docs/execution-phase/cluster-audits/cluster-01-tokens-used.md.
   */
  .google-signin {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    height: 44px;
    padding: 0 16px;
    border-radius: var(--r-md);
    font-family: var(--font-sans);
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.1s, border-color 0.1s;
  }
  .google-signin:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .google-signin__logo {
    flex-shrink: 0;
  }
  .google-signin--light {
    background-color: #ffffff; /* token-exempt: Google brand requirement */
    color: var(--ink);
    border: 1px solid var(--line);
  }
  .google-signin--light:hover:not(:disabled) {
    background-color: var(--fill);
  }
  .google-signin--dark {
    background-color: #131314; /* token-exempt: Google brand requirement */
    color: #ffffff; /* token-exempt: Google brand requirement */
    border: 1px solid #8e918f; /* token-exempt: Google brand requirement */
  }
  .google-signin--dark:hover:not(:disabled) {
    background-color: #1f1f20; /* token-exempt: Google brand requirement (hover state) */
  }
  </style>
  ```

  **Important:** This is the ONE `<style scoped>` block exception allowed in the codebase, justified by the token-exempt Google brand requirement. Annotate in `cluster-01-tokens-used.md` per Phase 1.4.

- [ ] **2.4** Run tests — expect PASS.

  Run: `bun test src/components/ui/KovaGoogleSignInButton.test.ts`
  Expected: PASS (all 8+ test cases green)

- [ ] **2.5** Commit.

  ```bash
  git add src/components/ui/KovaGoogleSignInButton.vue \
          src/components/ui/KovaGoogleSignInButton.test.ts
  git commit -m "feat(c01-g1): KovaGoogleSignInButton primitive — Google brand-spec compliant"
  ```

### Phase 3 — `use-google-oauth` composable

**Files:**
- Create: `src/composables/auth/use-google-oauth.ts`
- Create: `src/composables/auth/use-google-oauth.test.ts`

- [ ] **3.1 (test first)** Write `use-google-oauth.test.ts`:

  ```ts
  import { mock, describe, expect, it, beforeEach } from 'bun:test'

  const signInWithOAuth = mock(async () => ({ data: { provider: 'google', url: 'https://example.com' }, error: null }))
  mock.module('@/lib/supabase', () => ({ supabase: { auth: { signInWithOAuth } } }))

  import { useGoogleOAuth } from './use-google-oauth'

  describe('useGoogleOAuth', () => {
    beforeEach(() => {
      signInWithOAuth.mockClear()
    })

    it('calls supabase signInWithOAuth with provider=google and correct redirectTo', async () => {
      const { start } = useGoogleOAuth()
      await start()
      expect(signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: { access_type: 'offline', prompt: 'consent' },
        },
      })
    })

    it('returns error when Supabase OAuth init fails', async () => {
      signInWithOAuth.mockImplementationOnce(async () => ({
        data: null,
        error: { message: 'oauth_init_failed', name: 'AuthError' } as any,
      }))
      const { start } = useGoogleOAuth()
      const result = await start()
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.reason).toBe('oauth_init_failed')
    })

    it('exposes a reactive isStarting flag during the call', async () => {
      const { start, isStarting } = useGoogleOAuth()
      expect(isStarting.value).toBe(false)
      const promise = start()
      expect(isStarting.value).toBe(true)
      await promise
      expect(isStarting.value).toBe(false)
    })
  })
  ```

- [ ] **3.2** Run tests — fail (module not found).

- [ ] **3.3** Implement `use-google-oauth.ts`:

  ```ts
  import { ref, type Ref } from 'vue'
  import { supabase } from '@/lib/supabase'

  type StartResult = { ok: true } | { ok: false; reason: string }

  export function useGoogleOAuth(): {
    start: () => Promise<StartResult>
    isStarting: Ref<boolean>
  } {
    const isStarting = ref(false)

    async function start(): Promise<StartResult> {
      isStarting.value = true
      try {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
            queryParams: { access_type: 'offline', prompt: 'consent' },
          },
        })
        if (error) return { ok: false, reason: error.message ?? 'unknown' }
        return { ok: true }
      } finally {
        isStarting.value = false
      }
    }

    return { start, isStarting }
  }
  ```

- [ ] **3.4** Run tests — PASS.

- [ ] **3.5** Commit.

  ```bash
  git add src/composables/auth/use-google-oauth.ts \
          src/composables/auth/use-google-oauth.test.ts
  git commit -m "feat(c01-g2): useGoogleOAuth composable — provider=google + redirectTo /auth/callback"
  ```

### Phase 4 — `GoogleSignInButton` wrapper (Cluster 01 surface)

**Files:**
- Create: `src/components/auth/GoogleSignInButton.vue`
- Create: `src/components/auth/GoogleSignInButton.test.ts`

- [ ] **4.1 (test first)** Tests:
  - renders the underlying `<KovaGoogleSignInButton>` with the same `mode` prop forwarded
  - on click, calls `useGoogleOAuth().start()`
  - while `isStarting` is true, the underlying primitive is disabled
  - emits `oauth-error` with reason when `start()` returns `{ok: false}`
  - never emits when `start()` returns `{ok: true}` (the page will redirect away — no local state change)

- [ ] **4.2** Run tests — fail.

- [ ] **4.3** Implement:

  ```vue
  <script setup lang="ts">
  import { useGoogleOAuth } from '@/composables/auth/use-google-oauth'
  import KovaGoogleSignInButton from '@/components/ui/KovaGoogleSignInButton.vue'

  defineProps<{ mode: 'signin' | 'signup' }>()
  const emit = defineEmits<{ 'oauth-error': [reason: string] }>()

  const { start, isStarting } = useGoogleOAuth()

  async function onClick() {
    const result = await start()
    if (!result.ok) emit('oauth-error', result.reason)
  }
  </script>

  <template>
    <KovaGoogleSignInButton
      :mode="mode"
      :disabled="isStarting"
      @click="onClick"
    />
  </template>
  ```

- [ ] **4.4** Run tests — PASS.

- [ ] **4.5** Commit.

  ```bash
  git add src/components/auth/GoogleSignInButton.vue \
          src/components/auth/GoogleSignInButton.test.ts
  git commit -m "feat(c01-g3): GoogleSignInButton wrapper — composes KovaGoogleSignInButton + useGoogleOAuth"
  ```

### Phase 5 — Shared auth-shell components (8 components per Plan 01 §6.4.2)

Build the 8 shared components below in this order. Each follows the TDD loop (test → fail → impl → pass → commit). One commit per component.

Use Plan 01 §6.4.2 + the A15 / B4 hi-fi reference HTML files for visual spec. Token discipline per Phase 1 audit doc.

- [ ] **5.1** `AuthHeader.vue` — logo + (optional) "Sign in" / "Sign up" link in right corner per A15.01-A15.06. Props: `mode: 'signin' | 'signup' | 'verified' | 'sent'`.

- [ ] **5.2** `AuthCard.vue` — centered card chrome (576px max-width, page bg). Slot `default`. Slot `footer` (optional).

- [ ] **5.3** `AuthField.vue` — `<label>` + `<input>` + inline error span. Props: `label`, `type` (`'email' | 'text'`), `modelValue`, `error?`, `placeholder?`, `autocomplete?`. v-model compatible. Emit `update:modelValue`.

- [ ] **5.4** `AuthCta.vue` — primary submit button row. Props: `loading: boolean`, `disabled: boolean`, `label: string`. Slot for secondary link.

- [ ] **5.5** `AuthDivider.vue` — horizontal line with centered "or" label per Notion pattern. Used between `<GoogleSignInButton>` and `<AuthField type="email">`.

- [ ] **5.6** `AuthFootnote.vue` — "Already have an account? Sign in" / "Don't have an account? Sign up" row. Props: `mode: 'signin' | 'signup'`. Uses `<RouterLink>`.

- [ ] **5.7** `MagicLinkSentBlock.vue` — A15.03 surface. Props: `email: string`, `resendCooldown: number` (seconds, 0 = ready), `tagState?: 'delivered' | 'pending'`. Emits `resend`, `enter-code-instead`. Per Plan 01 §6.4.3.

- [ ] **5.8** `OtpInput.vue` — A15.04. 6 single-character inputs with auto-advance + paste handling for full 6-digit code. Emits `complete: [code: string]` when all 6 filled, `change: [code: string]` on every keystroke. Per Plan 01 §6.4.4.

Each component's test asserts:
- renders with required props
- light theme tokens applied (`--ink`, `--ink-2`, `--line`, `--bg`, etc — read Phase 1 KOVA_AUDIT for the per-element token list)
- emits documented events with correct payload
- accessibility: labels associated to inputs, `aria-invalid` on error, `aria-label` on icon-only buttons

Commit message convention: `feat(c01-t14.<N>): <ComponentName> shared auth-shell — light theme`

### Phase 6 — `SignupView.vue` rewrite (A15.01 + Google)

**Files:**
- Modify (full rewrite of body): `src/views/SignupView.vue`
- Create: `src/views/SignupView.test.ts`

- [ ] **6.1 (test first)** Tests:
  - mounts in `email-entry` state by default
  - renders `<AuthHeader mode="signup">` + `<AuthCard>` + `<GoogleSignInButton mode="signup">` + `<AuthDivider>` + `<AuthField type="email">` + `<AuthCta label="Continue with email">` + `<AuthFootnote mode="signup">`
  - submitting empty email shows inline error "Enter your email"
  - submitting valid email calls `useMagicLink().send(email)` and transitions to `magic-link-sent` state
  - in `magic-link-sent` state, renders `<MagicLinkSentBlock>` with the submitted email and a 60s `resendCooldown`
  - clicking "Enter a 6-digit code instead" navigates to `/login?state=otp-entry` (per Plan 01 §6.4 LoginView state machine)
  - Google button click triggers `useGoogleOAuth().start()` (verified via stub on the composable)
  - Google OAuth error displays toast via `<KovaToast>` (Cluster 11)

- [ ] **6.2** Run tests — fail (legacy SignupView has email+password UI).

- [ ] **6.3** Replace `src/views/SignupView.vue` body fully. Use Plan 01 §6.4.3 + A15.01 hi-fi for visual + behavior spec. Key shape:

  ```vue
  <script setup lang="ts">
  import { ref } from 'vue'
  import { useRouter } from 'vue-router'

  import AuthCard from '@/components/auth/AuthCard.vue'
  import AuthCta from '@/components/auth/AuthCta.vue'
  import AuthDivider from '@/components/auth/AuthDivider.vue'
  import AuthField from '@/components/auth/AuthField.vue'
  import AuthFootnote from '@/components/auth/AuthFootnote.vue'
  import AuthHeader from '@/components/auth/AuthHeader.vue'
  import GoogleSignInButton from '@/components/auth/GoogleSignInButton.vue'
  import MagicLinkSentBlock from '@/components/auth/MagicLinkSentBlock.vue'
  import { useMagicLink } from '@/composables/auth/use-magic-link'
  import { useToast } from '@/composables/use-toast'

  type State = 'email-entry' | 'magic-link-sent'
  const state = ref<State>('email-entry')
  const email = ref('')
  const emailError = ref('')

  const { send, cooldown } = useMagicLink()
  const { error: toastError } = useToast()
  const router = useRouter()

  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  async function onSubmit() {
    if (!EMAIL_PATTERN.test(email.value)) {
      emailError.value = 'Enter your email'
      return
    }
    emailError.value = ''
    const result = await send(email.value)
    if (result.ok) {
      state.value = 'magic-link-sent'
    } else {
      // map rate_limited / invalid_email / no_account / unknown to inline error per PRD §3.1 B4.6
      emailError.value = result.reason === 'rate_limited' ? 'Too many requests. Try again soon.' : 'Could not send. Try again.'
    }
  }

  function onEnterCodeInstead() {
    void router.push({ path: '/login', query: { state: 'otp-entry', email: email.value } })
  }

  function onOAuthError(reason: string) {
    toastError(`Google sign-in failed: ${reason}`)
  }
  </script>

  <template>
    <div class="auth-page auth-light">
      <AuthHeader mode="signup" />
      <AuthCard>
        <template v-if="state === 'email-entry'">
          <h1 class="auth-title">Create your account</h1>
          <GoogleSignInButton mode="signup" @oauth-error="onOAuthError" />
          <AuthDivider />
          <form @submit.prevent="onSubmit">
            <AuthField
              v-model="email"
              type="email"
              label="Email"
              autocomplete="email"
              :error="emailError"
            />
            <AuthCta label="Continue with email" :loading="false" :disabled="!email" />
          </form>
          <AuthFootnote mode="signup" />
        </template>
        <MagicLinkSentBlock
          v-else
          :email="email"
          :resend-cooldown="cooldown"
          @resend="onSubmit"
          @enter-code-instead="onEnterCodeInstead"
        />
      </AuthCard>
    </div>
  </template>
  ```

- [ ] **6.4** Run tests — PASS.

- [ ] **6.5** Commit.

  ```bash
  git add src/views/SignupView.vue src/views/SignupView.test.ts
  git commit -m "feat(c01-t17a): SignupView — magic-link + Google OAuth + state machine"
  ```

### Phase 7 — `LoginView.vue` rewrite (5-state machine + Google)

**Files:**
- Modify (full rewrite): `src/views/LoginView.vue`
- Create: `src/views/LoginView.test.ts`

- [ ] **7.1 (test first)** Tests — one per state per Plan 01 §6.4 (15+ tests):
  - mounts in `email-entry` by default (A15.02)
  - if `?state=otp-entry` query param, mounts in `otp-entry` (A15.04)
  - email-entry → submitting valid email → `magic-link-sent` (A15.03)
  - magic-link-sent → click "Enter code instead" → `otp-entry`
  - otp-entry → 6 digits typed → calls `useOtp().verify(email, code)` → on success navigates to `/dashboard`
  - otp-entry → wrong code → `otp-wrong` (B4.3 inline error, A15.04 stays mounted)
  - otp-wrong → 5 attempts → `otp-locked` (B4.4)
  - Google button click on email-entry → `useGoogleOAuth().start()`
  - Google OAuth error toast

- [ ] **7.2** Run tests — fail.

- [ ] **7.3** Replace `src/views/LoginView.vue` body per Plan 01 §6.4 state machine. Same skeleton as SignupView but with 5 sub-blocks (email-entry, magic-link-sent, otp-entry, otp-wrong inline, otp-locked).

- [ ] **7.4** Run tests — PASS.

- [ ] **7.5** Commit.

  ```bash
  git add src/views/LoginView.vue src/views/LoginView.test.ts
  git commit -m "feat(c01-t17b): LoginView — 5-state machine + magic-link + OTP + Google OAuth"
  ```

### Phase 8 — `AuthCallbackView.vue` (handles BOTH magic-link AND Google)

**Files:**
- Create: `src/views/auth/AuthCallbackView.vue`
- Create: `src/views/auth/AuthCallbackView.test.ts`

- [ ] **8.1 (test first)** Tests:
  - on mount, calls `supabase.auth.getSession()` to retrieve the session Supabase has populated from the OAuth callback OR magic-link exchange
  - if session has a user → check `useAuthStore().hasBrands` → if `false` (new user) navigate `/onboarding`, if `true` navigate `/dashboard`
  - if no session within 5 seconds → navigate `/login?status=callback_failed`
  - identical behavior whether the underlying provider was `email` (magic-link) or `google` (OAuth) — verify by stubbing the session.user.app_metadata.provider field

- [ ] **8.2** Run tests — fail.

- [ ] **8.3** Implement. Read PRD 01 §6.4 + amendment §3.1 (LoginView/SignupView gain GoogleSignInButton — note that callback is identical for both providers).

- [ ] **8.4** Tests PASS.

- [ ] **8.5** Commit.

  ```bash
  git add src/views/auth/AuthCallbackView.vue src/views/auth/AuthCallbackView.test.ts
  git commit -m "feat(c01-t18): AuthCallbackView — handles magic-link + Google OAuth completion"
  ```

### Phase 9 — Plan 01 Task 14-20 remaining views

Build the views below in this order. Each follows the TDD loop. One commit per view. Use Plan 01 §6.4 + the hi-fi B4 file for error-state visuals.

- [ ] **9.1** `MagicLinkErrorView.vue` — handles `/auth/magic?status=expired` (B4.1) and `?status=invalid` (B4.2). Single-CTA "Send a new link" / "Sign in".

- [ ] **9.2** `EmailVerifiedView.vue` — post-magic-link landing (Plan 01 §6.4 + A15.06).

- [ ] **9.3** `ForgotPasswordView.vue` — Plan 01 §6.4 + A15.05. Behind `FORGOT_PASSWORD_ENABLED=false` feature flag. Honest help-line copy. Hidden from `/login` field-label link in MVP.

- [ ] **9.4** `MobileFallbackView.vue` — desktop-only fallback when `useViewportGuard` reports phone/tablet. Plan 01 §6.4.

- [ ] **9.5** `AccountPendingDeletionView.vue` — signed-in surface during 30-day grace period (Plan 01 §6.4 + A15.07 if exists, else derive from B4 errors styling). Reads from `useAuthStore().deletionScheduledAt`.

- [ ] **9.6** `AccountDeletedView.vue` — terminal "Your account is deleted" page (Plan 01 §6.4).

- [ ] **9.7** `DangerZoneCard.vue` (`src/components/auth/`) — Account → Delete account modal trigger. Mounts in Cluster 04's account-settings page (cross-cluster). Modal wraps `useAccountDeletion()` composable.

Commit message convention: `feat(c01-t<N>): <ComponentName>`

### Phase 10 — Router wiring + mobile fallback

**Files:**
- Modify: `src/router.ts` (additive — new route records)
- Create: `src/router.test.ts` (if not present)

- [ ] **10.1 (test first)** Tests:
  - `/auth/callback` → AuthCallbackView
  - `/auth/magic?status=expired` → MagicLinkErrorView with status='expired'
  - `/auth/magic?status=invalid` → MagicLinkErrorView with status='invalid'
  - `/auth/email-verified` → EmailVerifiedView
  - `/forgot-password` → ForgotPasswordView (only accessible by URL — no nav link in MVP)
  - `/account-pending-deletion` → AccountPendingDeletionView (requires auth)
  - `/account-deleted` → AccountDeletedView (no auth required)
  - `/signup` + `/login` redirect to `/mobile-fallback` when viewport guard reports phone
  - Existing protected routes (`/dashboard`, `/editor/*`, `/account/*`) still redirect to `/login` when unauthenticated

- [ ] **10.2** Add route records to `src/router.ts`. Apply viewport-guard meta to `/signup` + `/login`.

- [ ] **10.3** Tests PASS.

- [ ] **10.4** Commit.

  ```bash
  git add src/router.ts src/router.test.ts src/views/auth/
  git commit -m "feat(c01-t13.3): router — 7 new auth routes + mobile-fallback guard"
  ```

### Phase 11 — E2E + security audit

**Files:**
- Create: `tests/e2e/auth/google-oauth-flow.spec.ts`
- Create: `tests/e2e/auth/magic-link-flow.spec.ts`
- Create: `tests/e2e/auth/otp-flow.spec.ts`
- Create: `tests/snapshots/cluster-01/` (one empty .md per surface per IMPLEMENTATION_PROMPT.md §6)

- [ ] **11.1** Write `google-oauth-flow.spec.ts`. Use Playwright `page.route(...)` to intercept `https://accounts.google.com/**` and `https://<supabase>.supabase.co/auth/v1/callback*` URLs. Mock the OAuth round-trip to land at `/auth/callback` with a fake session.

  ```ts
  import { expect, test } from '@playwright/test'

  test('Google OAuth round-trip on signup lands at onboarding', async ({ page, context }) => {
    await context.route('https://accounts.google.com/**', (route) => route.fulfill({
      status: 302,
      headers: { location: 'http://localhost:1420/auth/callback?code=mock_pkce_code' },
    }))
    await context.route('**/auth/v1/token**', (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ access_token: 'fake', refresh_token: 'fake', user: { id: 'u_test', email: 't@example.com' } }),
    }))
    await page.goto('http://localhost:1420/signup')
    await page.getByRole('button', { name: /sign up with google/i }).click()
    await expect(page).toHaveURL(/\/onboarding/)
  })
  ```

- [ ] **11.2** Write `magic-link-flow.spec.ts` — happy path: signup → email → magic-link-sent → click test link → /auth/callback → /onboarding.

- [ ] **11.3** Write `otp-flow.spec.ts` — happy path: login → email → magic-link-sent → "Enter code instead" → 6 digits → /dashboard.

- [ ] **11.4** Run all E2E:

  ```bash
  bun run test
  ```

  Expected: all 3 specs PASS.

- [ ] **11.5** Dispatch `security-auditor` subagent with brief:

  > "Audit feat/m9-shopify...app/cluster-01-auth for Google OAuth security. Verify:
  > - No `client_secret` or `GOOGLE_CLIENT_SECRET` literal in `src/` (server-only via Supabase config)
  > - `signInWithOAuth` redirectTo matches an allowlisted callback URL
  > - No PII logged in OAuth error paths
  > - `useGoogleOAuth` does not leak the OAuth `state` or `code_verifier` to client logs (Supabase handles PKCE; verify no manual handling)
  > - Hard constraints: VITE_ prefix discipline, no Math.random, no `any`, no `!`, no `<style scoped>` except the Google brand exemption.
  > Report CRITICAL/HIGH/MEDIUM/LOW."

- [ ] **11.6** Address any CRITICAL/HIGH findings before continuing. Re-run security-auditor after fixes.

- [ ] **11.7** Dispatch `e2e-runner` subagent with brief:

  > "Re-run the 3 specs in tests/e2e/auth/. Verify all pass. Capture screenshots of email-entry, magic-link-sent, otp-entry, otp-wrong, otp-locked, magic-link-expired states. Upload artifacts."

- [ ] **11.8** Create the empty per-surface written diff stubs at `tests/snapshots/cluster-01/<surface>-diff.md` per IMPLEMENTATION_PROMPT.md §6.

- [ ] **11.9** Commit.

  ```bash
  git add tests/e2e/auth/ tests/snapshots/cluster-01/
  git commit -m "test(c01-t24): E2E auth flows (Google + magic-link + OTP) + per-surface diff stubs"
  ```

### Phase 12 — Cluster-end gates + DONE report

- [ ] **12.1** Append `## OAuth providers` section to `docs/operations/supabase-auth-config.md` per amendment §3.6 (do NOT modify existing sections — append only).

  ```bash
  git add docs/operations/supabase-auth-config.md
  git commit -m "docs(c01-ops): Supabase Auth — Google OAuth provider checklist + Google Cloud pre-flight"
  ```

- [ ] **12.2** Run all quality gates from the cluster root:

  ```bash
  bun install
  bun run check        # lint + type check
  bun run format       # oxfmt
  bun run test:unit    # all unit tests pass
  bun run test:dupes   # < 3% duplication
  bun run test         # all E2E pass
  bun run build        # production build green
  ```

  Any red gate = halt + fix. Do not proceed.

- [ ] **12.3** Dispatch `superpowers:code-reviewer` with brief:

  > "Audit feat/m9-shopify...app/cluster-01-auth full diff. Focus areas:
  > - Phase 1 audit gate docs present + complete
  > - Google brand spec compliance (KovaGoogleSignInButton)
  > - Token discipline (no raw hex except 4 Google-brand-exempt locations, all annotated)
  > - `<style scoped>` count = 1 (only KovaGoogleSignInButton)
  > - No edits to PRD/Plan/HIFI/HANDOFF/PROGRESS/exec-prompt/audit-rubric
  > - No edits to shipped backend (composables, migrations, Edge Functions)
  > - All hard CLAUDE.md constraints (no any, no !, no Math.random, no `<style>` blocks elsewhere, no `<icon-lucide-*>` direct, no raw SVG except Google G mark, VITE_ prefix discipline, no React/Next/PixiJS)
  > - Plan tasks 1-12 all complete
  > - Conventional commits one-per-task
  > Report CRITICAL/HIGH/MEDIUM/LOW."

- [ ] **12.4** Address any CRITICAL/HIGH findings.

- [ ] **12.5** Write `docs/execution-phase/cluster-reports/W8a-cluster-01-DONE.md`. Format per W7-cluster-07a-DONE.md template. Include:
  - One-line summary
  - Per-phase completion checklist (Phase 1-12)
  - File-creation inventory (all new files committed)
  - File-modification inventory (router.ts, SignupView.vue, LoginView.vue, GoogleIcon.vue if changed, supabase-auth-config.md)
  - Quality-gate results (all green required)
  - Subagent reports summary (security-auditor verdict, e2e-runner verdict, code-reviewer verdict)
  - Cross-cluster contracts surfaced (Cluster 04 consumes `DangerZoneCard`; Cluster 11 ships `KovaGoogleSignInButton`)
  - Known follow-ups (none expected; flag any)

- [ ] **12.6** Final commit.

  ```bash
  git add docs/execution-phase/cluster-reports/W8a-cluster-01-DONE.md
  git commit -m "docs(c01): W8a DONE — Vue auth shell + Google OAuth amendment shipped"
  ```

- [ ] **12.7** Push branch:

  ```bash
  git push -u origin app/cluster-01-auth
  ```

- [ ] **12.8** Print DONE banner:

  ```
  W8a CLUSTER 01 COMPLETE.
  Branch: app/cluster-01-auth @ <sha>
  DONE report: docs/execution-phase/cluster-reports/W8a-cluster-01-DONE.md
  Next: founder runs W8a AUDIT per docs/execution-phase/wave-audits/W8a-cluster-01-AUDIT.md
  ```

---

## 8. Acceptance criteria (founder reads these before approving merge)

Each must be green at DONE time:

- [ ] Phase 1 audit gate docs present, founder-approved
- [ ] All 12 phases complete
- [ ] No edits to forbidden docs (verify with `git diff feat/m9-shopify...HEAD -- 'docs/kova-final-prds/' 'docs/kova-final-impl-plans/' 'docs/execution-phase/cluster-reports/W8a-cluster-01-HANDOFF.md' 'docs/execution-phase/cluster-reports/W8a-cluster-01-PROGRESS.md' 'docs/execution-phase/cluster-reports/W8a-cluster-01-AMENDMENT-google-oauth.md' 'docs/execution-phase/execution-prompts/W8a-cluster-01-auth.md' 'docs/execution-phase/wave-audits/W8a-cluster-01-AUDIT.md'` — expect empty)
- [ ] No edits to hi-fi files (verify against `main-main-kova-scope` — that path is outside the worktree so no edit possible; double-check no edits to in-repo `design-system/hifi/auth/` after Phase 1.2 copy)
- [ ] No edits to `packages/core/**`
- [ ] No edits to shipped backend (`supabase/migrations/*.sql`, `supabase/functions/**`, shipped composables, shipped store methods)
- [ ] Google OAuth round-trip works end-to-end (E2E spec passes + manual founder smoke if Supabase Studio is configured)
- [ ] Magic-link + OTP flows work end-to-end (E2E specs pass)
- [ ] All quality gates green (`bun run check / format / test:unit / test:dupes / test / build`)
- [ ] `<style scoped>` count = 1 (KovaGoogleSignInButton — verified with grep)
- [ ] All Google-brand token-exempt hex literals annotated with `/* token-exempt: Google brand requirement */`
- [ ] One commit per task; conventional commits
- [ ] DONE report at `docs/execution-phase/cluster-reports/W8a-cluster-01-DONE.md`

---

## 9. Scope explicitly OUT

- Apple OAuth (deferred)
- Microsoft OAuth (deferred)
- SAML SSO (deferred)
- Passkeys (deferred)
- Email + password (deferred to Phase 2 per PRD 01 §2.3)
- MFA / TOTP (deferred)
- Hi-fi A15 HTML modification (founder lock 2026-05-21 — amendment §3.4 OVERRIDDEN)
- PRD 01 / Plan 01 / Plan 11 / HANDOFF / PROGRESS / exec-prompt / audit-rubric edits (founder lock — amendment §3.1, §3.2, §3.3, §3.5, §3.7, §3.8, §3.9 all OVERRIDDEN)
- Backend changes (already shipped)
- Cluster 04 + Cluster 12 work (separate waves)

---

## 10. Risks + mitigations

| Risk | Mitigation |
|---|---|
| Founder hasn't completed Google Cloud Console pre-flight when agent starts Phase 2 | §6 AskUserQuestion gate before Phase 2 |
| Existing `src/components/icons/GoogleIcon.vue` is NOT brand-compliant | Phase 2 ships the full Google G SVG inline inside `KovaGoogleSignInButton`. The legacy `GoogleIcon.vue` is no longer referenced — delete it OR leave dormant. Verify with grep. |
| Plan 11 (Cluster 11) is already merged — adding `KovaGoogleSignInButton` is a Cluster 11 surface | This plan adds the file directly to `src/components/ui/`. No edits to Plan 11 docs (founder-locked). Annotate the new file in c01-tokens-used.md as "Cluster 11 surface, added by Cluster 01 amendment per founder lock 2026-05-21". |
| Founder objects to legacy `SignupView.vue` / `LoginView.vue` being rewritten | Rewrite is the only path to ship W8a Vue with the magic-link backend (legacy uses `signInWithPassword` which the new backend does not surface). Plan §2 explicitly flags this rewrite. Founder approves at Phase 1 audit gate. |
| Visual fidelity drift | Phase 1 audit doc lists token-per-element. Phase 11 captures Playwright screenshots. Code-reviewer agent in Phase 12 verifies. |
| Token-exempt Google hex literals get used elsewhere (token leak) | Phase 12 code-reviewer grep: `grep -rn '#131314\|#8e918f\|#4285F4\|#34A853\|#FBBC05\|#EA4335' src/` — expect ALL hits inside `KovaGoogleSignInButton.vue` only. |

---

## 11. Self-review (run before Phase 1 begins)

The drafting agent (not the executing agent) ran this checklist:

- [x] **Spec coverage:** Amendment §2 (founder decision) → Phase 2-4 + 6-7. §3.3 (KovaGoogleSignInButton primitive) → Phase 2. §3.4 (hi-fi mod) → EXPLICITLY OVERRIDDEN per founder lock. §3.6 (supabase-auth-config) → Phase 12.1. §4 (founder pre-flight) → Phase 6 gate. §5 (execution order) → matches Phases 1-12.
- [x] **Placeholder scan:** No TBD / TODO / "implement later" / "add appropriate error handling" / "similar to Task N" / unspecified types.
- [x] **Type consistency:** `useGoogleOAuth().start()` returns `Promise<{ok: true} | {ok: false, reason: string}>` — referenced consistently in Phases 3, 4, 6, 7. `isStarting: Ref<boolean>` — consistent. `mode: 'signin' | 'signup'` — consistent across KovaGoogleSignInButton + GoogleSignInButton + AuthHeader + AuthFootnote.
- [x] **Plan 01 task numbering reuse:** Commits use `c01-t<plan-01-task-num>` (e.g. `c01-t14.1`, `c01-t17a`, `c01-t18`, `c01-t13.3`, `c01-t24`) for traceability. New surface gets `c01-g<N>` (g = Google) for the 3 Google-specific commits.

---

## 12. Notes for the executing agent

- **Caveman mode awareness:** Founder has `/caveman full` active in chat. Code, commits, PRs, DONE reports = write normal English. Chat updates back to founder = caveman terse.
- **AskUserQuestion liberally:** at Phase 1.5 founder approval, Phase 6 Google pre-flight gate, and anywhere you find scope ambiguity.
- **Worktree:** stay in `/Users/jihoyang/kova-build-c01`. All commits land on `app/cluster-01-auth`.
- **Never amend commits.** New commit per task per CLAUDE.md.
- **Never `--no-verify`.** If pre-commit hook fails, fix the underlying issue.
- **Verification before completion:** Phase 12.2 gates are blocking. Do not mark DONE without all green.

End of plan.
