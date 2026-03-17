# M1 Completion Audit Prompt

> **Purpose:** Verify that Milestone 1 (Core Infrastructure) was implemented correctly,
> given that the executing agent used AI-generated/fake skill and subagent files instead
> of the real GitHub-verified originals. Identifies any gaps or anti-pattern violations
> that the incorrect tooling guidance may have caused.
>
> **Run this prompt in a fresh agent session.** It is fully self-contained.

---

## Context

Milestone 1 was executed on branch `prdv4execution` in `kova-open-pencil-1/`. The agent
had access to incorrectly-generated VoltAgent and ECC skill files. Those fake files have
since been replaced with verified GitHub originals. A code review (commit `6781d78`) was
already performed, but that review ran under the same session and may have missed issues
the wrong skill guidance caused.

**M1 had minimal skill dependencies** — primarily `superpowers:*` workflows (TDD, code
review, subagent-driven-development) and `web-asset-generator` for icon generation.
The biggest risk is that the wrong TDD/code-review skill guidance allowed anti-patterns
to slip through.

---

## Files M1 Created or Modified

Read all of these before evaluating:

### New Files (all on `prdv4execution` branch)
| File | What it should do |
|------|------------------|
| `src/lib/supabase-factory.ts` | Creates the Supabase client; separated for mock.module compatibility |
| `src/lib/supabase.ts` | Proxy-based lazy singleton; exports `supabase` |
| `src/stores/auth.ts` | Pinia auth store: user, session, profile, signIn/signUp/signOut/initialize |
| `src/views/LoginView.vue` | Light theme, email/password + Google OAuth button, uses `useAuthStore` |
| `src/views/SignupView.vue` | Mirrors login layout, adds confirm-password field, redirects to `/onboarding` |
| `src/views/DashboardView.vue` | Placeholder dashboard (light theme) |
| `src/views/OnboardingView.vue` | Placeholder onboarding (light theme) |
| `src/router.ts` | `createAppRouter()`, all routes, `beforeEach` navigation guard |
| `src/router.d.ts` | Extended `RouteMeta` with `requiresAuth`, `publicOnly`, `requiresOnboarding` |
| `supabase/migrations/20260316_users.sql` | `users` table with RLS, `handle_new_user` trigger, `updated_at` trigger |
| `tests/unit/lib/supabase.test.ts` | Env validation unit tests |
| `tests/unit/stores/auth.test.ts` | Auth store unit tests (10 tests) |
| `tests/unit/router/guards.test.ts` | Router guard tests (TDD: written before implementation) |

### Modified Files
| File | What changed |
|------|-------------|
| `src/main.ts` | Async auth init before mount: `auth.initialize().finally(() => app.mount())` |
| `src/App.vue` | Loading gate: `v-if="auth.isLoading"` shows pulsing Kova logo |
| `src/router.ts` | Completely rewritten (see above) |
| `src/constants.ts` | Added `APP_NAME = 'Kova'`, `SHOW_DEV_FEATURES = false` |
| `src/components/ChatPanel.vue` | ChatInput placeholder rebranded to Kova |
| `src/components/AppMenu.vue` | Alt text updated |
| `src/views/EditorView.vue` | Kova references |
| `index.html` | Title, loader background white, Kova blue (`#4F6EF7`) accent |
| `package.json` | `name: "kova"` |
| `vite.config.ts` | PWA manifest: name, short_name, description updated |
| `src/assets/` | Kova branded icons (geometric white K on blue `#4F6EF7` rounded square) |

---

## Reference Documents

Read these to understand what M1 was supposed to produce:

1. `kova-open-pencil-1/docs/superpowers/plans/2026-03-16-milestone-1-core-infrastructure.md` — full task list with acceptance criteria
2. `kova-open-pencil-1/docs/superpowers/specs/2026-03-16-milestone-1-core-infrastructure-design.md` — architecture decisions and interface contracts
3. `kova-open-pencil-1/CLAUDE.md` — hard constraints and code conventions

---

## M1 Commits to Audit (chronological)

```
e847420  chore: install pinia + supabase SDK, remove old migration, update test:unit
6ab7a40  feat: add APP_NAME, SHOW_DEV_FEATURES constants and update ACP_DESIGN_CONTEXT
948833a  feat: rebrand metadata to Kova (title, package name, PWA manifest)
a04d5d3  feat: rebrand all user-visible text from OpenPencil to Kova
5dada4a  feat: hide developer features behind SHOW_DEV_FEATURES flag
d35ab83  feat: add users table with RLS, auto-create trigger, updated_at trigger
fab0739  feat: replace OpenPencil icons with Kova branded icons
3ad0330  feat: create Supabase client singleton with env validation
0a8d764  feat: create Pinia auth store with Supabase integration
6aa37c5  feat: create login page with email/password and Google OAuth
8372505  feat: create signup page with email/password and Google OAuth
037297e  feat: initialize auth on app load with loading gate
0a43648  feat: add routes, navigation guards, and placeholder views (TDD)
ef833fc  feat: update loader to light theme with Kova brand colors
ccceabb  fix: add void operator to floating promise in auth initialization
6781d78  fix: address M1 code review findings (C1, I1-I7, M2-M3)
```

Use `git show <hash>` or `git diff <hash>^..<hash>` to inspect each commit in detail.

---

## Audit Checklist

### 1. CLAUDE.md Conventions — Hard Constraints

Check every new/modified file against these rules:

- [ ] **Vue 3 only:** `<script setup lang="ts">` everywhere, Composition API only. No Options API.
- [ ] **Tailwind CSS 4 only:** No `<style>` blocks, no inline `style=` attributes.
- [ ] **No `any`:** TypeScript strict — no `any` type, no `@ts-ignore`, no `as unknown as X`.
- [ ] **No `!` non-null assertions:** Use optional chaining (`?.`) or explicit null checks instead.
- [ ] **`@/` alias:** All app imports use `@/` prefix, not relative `../` paths.
- [ ] **`crypto.getRandomValues()`:** No `Math.random()` anywhere.
- [ ] **Pinia only:** No Vuex, no custom reactive store patterns for auth/user state.
- [ ] **Valibot only:** No Zod, no Yup, no hand-rolled schema validation.
- [ ] **Immutability:** No mutations — new objects returned, not modified in place.
- [ ] **`structuredClone` for deep copies:** No shallow spread on nested objects.
- [ ] **File size:** Each file ≤ 800 lines. Flag anything over 600.
- [ ] **Functions ≤ 40 lines:** Flag any function exceeding this.
- [ ] **No hardcoded secrets:** Env vars via `import.meta.env.VITE_*` only.
- [ ] **`VITE_` prefix only for browser-safe vars:** `SUPABASE_SERVICE_ROLE_KEY` must never be VITE_.
- [ ] **Reka UI components:** Dialogs, popovers, selects use Reka UI — no hand-rolled accessible components.
- [ ] **Icons:** `<icon-lucide-*>` via unplugin-icons. No raw SVG, no Unicode symbols.
- [ ] **`e.code` not `e.key`:** Any keyboard event handlers use `e.code`.

### 2. `data-test-id` Attributes

All interactive elements must have `data-test-id` attributes in kebab-case:

- [ ] LoginView: form inputs (`login-email-input`, `login-password-input`), submit button (`login-submit-button`), OAuth button (`login-google-button`)
- [ ] SignupView: similar pattern (`signup-*`)
- [ ] DashboardView and OnboardingView placeholders: at least a root container test-id
- [ ] App.vue loading gate: `app-loading-overlay` or similar
- [ ] Any nav links/buttons in router-rendered layouts

### 3. Auth Store (`src/stores/auth.ts`)

- [ ] Uses `defineStore` with Composition API setup (not options API)
- [ ] State: `user`, `session`, `profile`, `isLoading`, `error` — all typed with Supabase types
- [ ] `initialize()`: sets up `onAuthStateChange` listener, returns cleanup function
- [ ] `signIn(email, password)`: calls `supabase.auth.signInWithPassword`, handles error
- [ ] `signUp(email, password)`: calls `supabase.auth.signUp`, handles error
- [ ] `signOut()`: calls `supabase.auth.signOut`, uses `useRouter()` to redirect to `/login`
- [ ] No `async` store actions that throw without catching — all errors go to `state.error`
- [ ] `useRouter()` called inside function body (not at store setup time)

### 4. Supabase Client (`src/lib/supabase.ts` + `supabase-factory.ts`)

- [ ] Proxy-based lazy singleton pattern (factory separated for mock.module compatibility)
- [ ] Throws descriptive error if `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` missing
- [ ] `supabase-factory.ts` exports `createSupabaseClient()` — no module-level side effects
- [ ] `supabase.ts` exports `supabase` as default — tests can mock the factory

### 5. Router (`src/router.ts`)

- [ ] Exports `createAppRouter()` function (not a singleton, to enable test isolation)
- [ ] Routes: `/`, `/login`, `/signup`, `/onboarding`, `/dashboard`, `/editor/:canvasId`
- [ ] `beforeEach` guard implements: `requiresAuth → /login`, `publicOnly → /dashboard`, `requiresOnboarding → /onboarding`
- [ ] `RouteMeta` extended in `src/router.d.ts` with typed `requiresAuth`, `publicOnly`, `requiresOnboarding`
- [ ] Guard checks `auth.isLoading` before redirecting (avoids redirect-before-init race)
- [ ] Editor route (`/editor/:canvasId`) properly guarded as `requiresAuth`

### 6. DB Migration (`supabase/migrations/20260316_users.sql`)

- [ ] Creates `public.users` table with columns: `id` (UUID, FK to `auth.users`), `email`, `display_name`, `avatar_url`, `generations_used` (int, default 0), `generations_reset_at` (timestamp), `created_at`, `updated_at`
- [ ] RLS enabled on `users` table
- [ ] Policy: users can only SELECT/UPDATE their own row (`auth.uid() = id`)
- [ ] `handle_new_user()` trigger fires on `auth.users` INSERT to auto-create `public.users` row
- [ ] `updated_at` trigger updates on row modification
- [ ] Migration is idempotent (`CREATE TABLE IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`)

### 7. Auth Initialization (`src/main.ts` + `src/App.vue`)

- [ ] `main.ts`: `await auth.initialize()` (or `.finally()`) before `app.mount('#app')` — not fire-and-forget
- [ ] `App.vue`: loading gate shown while `auth.isLoading` is true
- [ ] Loading gate shows pulsing Kova logo (white background, light theme)
- [ ] `void` operator (or `.catch()`) on any floating promise to satisfy TypeScript strict mode
- [ ] Pinia installed before Router in `main.ts` (required for `useRouter()` inside store)

### 8. Views (LoginView, SignupView, DashboardView, OnboardingView)

- [ ] **Light theme everywhere** — white/light backgrounds, dark text, Kova blue (`#4F6EF7`) accents
- [ ] **NOT dark theme** — editor uses dark, all auth/onboarding/dashboard pages must be light
- [ ] Login/Signup forms: actual form elements with proper labels (not `<div>` buttons)
- [ ] Google OAuth button present in LoginView (even if not wired — placeholder acceptable for M1)
- [ ] SignupView redirects to `/onboarding` on successful signup
- [ ] LoginView redirects to `/dashboard` on successful login
- [ ] Error messages displayed inline (not console.log only)
- [ ] `APP_NAME` constant used in headings, not hardcoded string `"Kova"`

### 9. TDD Evidence

The router guards (Task 12) were supposed to be TDD — tests written before implementation:

- [ ] `tests/unit/router/guards.test.ts` exists
- [ ] Guard tests actually test the three redirect cases (requiresAuth, publicOnly, requiresOnboarding)
- [ ] Tests mock the auth store (not making real Supabase calls)
- [ ] Guard implementation in `router.ts` matches what the tests assert
- [ ] Supabase client tests (`supabase.test.ts`) cover missing-env-var error path
- [ ] Auth store tests (`auth.test.ts`) cover signIn, signUp, signOut, initialize

### 10. Rebranding Completeness

- [ ] No remaining "OpenPencil" text in user-visible strings (non-code strings only — package internals acceptable)
- [ ] `<title>` in `index.html` is "Kova" (not "OpenPencil" or "Pencil")
- [ ] PWA manifest name/short_name/description updated
- [ ] Package name in `package.json` updated
- [ ] `APP_NAME` constant used where appropriate (not hardcoded)
- [ ] `SHOW_DEV_FEATURES = false` hides: Code tab, Variables panel, ProviderSetup, model selector, Copy as JSX

---

## Severity Grading

**CRITICAL** — Blocks M2. Must fix before any new feature work:
- Security issues (exposed server-side keys, missing RLS)
- Wrong library used (Vuex, Zod, React)
- Broken authentication flow
- TypeScript errors that would fail `bun run check`

**HIGH** — Fix before claiming M1 complete:
- Missing `data-test-id` attributes
- `any` types or `!` assertions
- Files over 800 lines
- Dark theme on auth/dashboard pages
- Missing error handling in auth store

**MEDIUM** — Fix when possible, not a blocker:
- Functions over 40 lines
- Missing tests for edge cases
- Import alias violations (`../` instead of `@/`)

**LOW** — Nice to have:
- Minor naming inconsistencies
- Unused imports
- Comments that could be clearer

---

## Output Format

Write a report with this structure:

```
# M1 Audit Report
Date: [today]
Branch: prdv4execution
Auditor: Claude [model]

## Summary
[1-2 sentences: overall pass/fail and most critical findings]

## CRITICAL Issues
[numbered list with file:line references, or "None"]

## HIGH Issues
[numbered list with file:line references, or "None"]

## MEDIUM Issues
[numbered list, or "None"]

## LOW Issues
[numbered list, or "None"]

## Verdict
[ ] PASS — M1 complete. Safe to start M2.
[ ] PASS WITH FIXES — Address HIGH issues, then start M2.
[ ] FAIL — Address CRITICAL issues before M2.

## Recommended Fixes
[Specific, actionable fix for each CRITICAL and HIGH issue found]
```

Save the report to:
`kova-open-pencil-1/docs/superpowers/audits/2026-03-17-m1-audit-report.md`
