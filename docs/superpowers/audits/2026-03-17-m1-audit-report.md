# M1 Audit Report

Date: 2026-03-17
Branch: prdv4execution
Auditor: Claude Opus 4.6

## Summary

M1 is **substantially complete and well-executed**. All 23 unit tests pass, lint/type check is clean, and the core authentication flow, routing, rebranding, and feature hiding work as specified. Two HIGH issues need fixing before M2: a missing `data-test-id` on the App.vue loading gate and the router guard not checking `isLoading` for defense-in-depth.

## CRITICAL Issues

None.

## HIGH Issues

1. **Missing `data-test-id` on App.vue loading gate** — `src/App.vue:22-30`: The loading div (`v-if="auth.isLoading"`) has no `data-test-id` attribute. The audit checklist requires `app-loading-overlay` or similar for E2E testability.

   ```vue
   <!-- Current -->
   <div v-if="auth.isLoading" class="flex min-h-screen items-center justify-center bg-white">

   <!-- Required -->
   <div v-if="auth.isLoading" data-test-id="app-loading-overlay" class="flex min-h-screen items-center justify-center bg-white">
   ```

2. **Router guard does not check `auth.isLoading`** — `src/router.ts:87-89`: The `beforeEach` guard reads auth state but never waits for or checks `isLoading`. The design spec (Phase 1.3.2) explicitly requires: "Wait for auth store to finish loading (`isLoading === false`)". Currently mitigated because `main.ts` defers `app.mount()` until `initialize()` resolves, but this is not defense-in-depth — a programmatic navigation during re-auth could produce wrong redirects.

   ```ts
   // Current
   _router.beforeEach((to) => {
     const auth = useAuthStore()
     return resolveGuard(to, auth)
   })

   // Should add isLoading check, e.g.:
   _router.beforeEach(async (to) => {
     const auth = useAuthStore()
     if (auth.isLoading) {
       await new Promise<void>((resolve) => {
         const stop = watch(() => auth.isLoading, (loading) => {
           if (!loading) { stop(); resolve() }
         }, { immediate: true })
       })
     }
     return resolveGuard(to, auth)
   })
   ```

## MEDIUM Issues

1. **DB migration not idempotent** — `supabase/migrations/20260316_users.sql:1`: `CREATE TABLE public.users` lacks `IF NOT EXISTS`. Functions use `CREATE OR REPLACE` but re-running the migration would fail on the table creation. Standard for one-shot migrations but the checklist specifies idempotency.

2. **Auth store missing `error` state ref** — `src/stores/auth.ts`: The audit checklist (section 3) expects `error` in state. The implementation returns errors as method return values instead (`{ error: AuthError | null }`). This follows the design spec ("All methods return errors as values, never throw") and is arguably better engineering, but deviates from the checklist. Views handle errors via local `ref('')` which works but means there's no centralized error state for the auth store.

3. **DB migration schema deviates from audit checklist** — `supabase/migrations/20260316_users.sql`: The checklist lists columns `email`, `display_name`, `avatar_url` but the migration has `onboarded`, `plan` instead. The **design spec** matches the implementation (not the audit checklist), so this is the audit prompt having stale column names. Implementation is correct per spec.

4. **Hardcoded `alt="Kova"` in EditorView** — `src/views/EditorView.vue:144`: Uses hardcoded string `"Kova"` for image alt text instead of the `APP_NAME` constant. `APP_NAME` is not imported in EditorView. Minor since alt text isn't a primary heading.

## LOW Issues

1. **GoogleIcon uses raw SVG** — `src/components/icons/GoogleIcon.vue`: Contains inline `<svg>` paths instead of using `<icon-lucide-*>`. Acceptable exception: Google's brand icon is not in Lucide, and brand accuracy requires the exact SVG paths.

2. **Unused destructured variable in GoogleIcon.vue** — `src/components/icons/GoogleIcon.vue:2`: `const { class: className }` destructures `className` but the template uses `$props.class` instead. Dead binding.

3. **Pre-existing `any` types in `global.d.ts`** — `src/global.d.ts:31,35`: `__OPEN_PENCIL_STORE__?: any` and `() => any` exist in global type declarations. These are pre-existing (not M1 changes) and in the OpenPencil base layer.

4. **Remaining "OpenPencil" in non-user-visible strings** — Several internal references remain:
   - `src/composables/use-chat.ts:131`: `'X-OpenRouter-Title': 'OpenPencil'` (HTTP header)
   - `src/ai/chat-debug.ts:213`: `'OPEN PENCIL AI DEBUG LOG'` (debug output)
   - `src/automation/vite-plugin.ts:23`: "Is another OpenPencil instance running?" (dev console)
   - `src/constants.ts:148`: `ACP_DESIGN_CONTEXT` mentions "built on OpenPencil" (AI prompt context)

   All are internal/developer-facing. The spec explicitly exempts `@open-pencil/core` imports and `TRYSTERO_APP_ID`. These remaining references are similarly non-user-visible.

5. **Hardcoded "Kova" in ChatInput placeholder** — `src/components/chat/ChatInput.vue:138`: `placeholder="Design an email with Kova AI..."` uses hardcoded string rather than `APP_NAME`. Acceptable since the full phrase is context-specific.

## Checklist Results

### 1. CLAUDE.md Conventions — Hard Constraints
- [x] Vue 3 `<script setup lang="ts">` everywhere
- [x] Tailwind CSS 4 only — no `<style>` blocks, no inline styles in new files
- [x] No `any` in new M1 code
- [x] No `!` non-null assertions in new M1 code
- [x] `@/` alias used in all new app imports
- [x] No `Math.random()` in new code
- [x] Pinia composition API stores
- [x] No Zod in new M1 code (valibot constraint for tool layer)
- [x] Immutable patterns used (error returns, no mutation)
- [x] File sizes well under limits (largest: 169 lines)
- [x] Functions well under 40 lines
- [x] No hardcoded secrets
- [x] `VITE_` prefix only for browser-safe vars
- [x] Reka UI used where applicable (ScrollArea in ChatPanel)
- [x] Icons via unplugin-icons (except GoogleIcon — brand exception)
- [x] `e.code` convention (no new keyboard handlers in M1)

### 2. `data-test-id` Attributes
- [x] LoginView: `login-view`, `login-google-button`, `login-email-input`, `login-password-input`, `login-submit-button`, `login-error`, `login-google-error`, `login-signup-link`
- [x] SignupView: `signup-view`, `signup-google-button`, `signup-email-input`, `signup-password-input`, `signup-confirm-input`, `signup-submit-button`, `signup-error`, `signup-google-error`, `signup-login-link`
- [x] DashboardView: `dashboard-view`
- [x] OnboardingView: `onboarding-view`
- [ ] **App.vue loading gate: MISSING** (HIGH #1)

### 3. Auth Store
- [x] Composition API `defineStore` setup
- [x] `user`, `session`, `profile`, `isLoading` typed
- [x] `initialize()` sets up `onAuthStateChange`, returns cleanup via `dispose()`
- [x] `signIn` / `signUp` / `signOut` / `signInWithGoogle` all implemented
- [x] Errors returned as values, never thrown
- [x] `getRouter()` called inside `signOut()` body (not at setup time)
- [x] `isUserProfile` type guard validates profile shape

### 4. Supabase Client
- [x] Proxy-based lazy singleton
- [x] Factory separated (`supabase-factory.ts`) for mock.module compatibility
- [x] Throws descriptive errors for missing env vars
- [x] No module-level side effects in factory

### 5. Router
- [x] `createAppRouter()` factory function (not singleton)
- [x] All required routes: `/`, `/login`, `/signup`, `/onboarding`, `/dashboard`, `/editor/:canvasId`, `/demo`
- [x] `resolveGuard` implements requiresAuth, publicOnly, requiresOnboarding, onboardingOnly, demo
- [x] `RouteMeta` extended in `router.d.ts`
- [x] `/share/:roomId` removed
- [ ] **Guard doesn't check `isLoading`** (HIGH #2)

### 6. DB Migration
- [x] RLS enabled
- [x] SELECT/UPDATE policies for own row
- [x] `handle_new_user()` trigger
- [x] `updated_at` trigger
- [x] `SECURITY DEFINER` on trigger function
- [x] Additional "Deny direct inserts" policy (defense in depth)
- [ ] **Not idempotent** — missing `IF NOT EXISTS` (MEDIUM #1)

### 7. Auth Initialization
- [x] Pinia installed before Router in `main.ts`
- [x] `auth.initialize().finally(() => app.mount())` — blocks mount
- [x] `void` operator on floating promise
- [x] Loading gate with pulsing Kova logo on white background

### 8. Views
- [x] Light theme everywhere (white backgrounds, dark text, blue accents)
- [x] NOT dark theme on auth/dashboard/onboarding
- [x] Proper `<form>` elements with `<label>` in Login/Signup
- [x] Google OAuth button wired (not placeholder)
- [x] SignupView redirects to `/onboarding`
- [x] LoginView redirects to `/dashboard`
- [x] Error messages displayed inline
- [x] `APP_NAME` constant used in headings

### 9. TDD Evidence
- [x] `tests/unit/router/guards.test.ts` exists (10 tests)
- [x] Tests cover all redirect cases
- [x] Tests mock auth state (pure function testing)
- [x] `tests/unit/lib/supabase.test.ts` covers missing-env-var paths (3 tests)
- [x] `tests/unit/stores/auth.test.ts` covers all auth operations (10 tests)
- [x] All 23 tests pass

### 10. Rebranding Completeness
- [x] No "OpenPencil" in user-visible strings
- [x] `<title>Kova</title>` in index.html
- [x] PWA manifest updated (name, short_name, description)
- [x] `package.json` name is `"kova"`
- [x] `APP_NAME` constant defined and used
- [x] `SHOW_DEV_FEATURES = false` hides: Code tab, Variables panel, ProviderSetup, model selector, Copy as JSX

## Verdict

- [ ] PASS — M1 complete. Safe to start M2.
- [x] PASS WITH FIXES — Address HIGH issues, then start M2.
- [ ] FAIL — Address CRITICAL issues before M2.

## Recommended Fixes

### HIGH #1: Add `data-test-id` to App.vue loading gate
**File:** `src/App.vue:22`
Add `data-test-id="app-loading-overlay"` to the loading div.

### HIGH #2: Add `isLoading` check to router guard
**File:** `src/router.ts:87-89`
Add a check that waits for `auth.isLoading` to become `false` before evaluating guard logic. Either:
- (a) Add an `await` that watches `isLoading` (as shown above), or
- (b) If `isLoading` is true, return `false` to cancel navigation and let the loading gate handle it

Option (b) is simpler since the loading gate already prevents user interaction while loading.

### MEDIUM #1: Make migration idempotent (optional)
**File:** `supabase/migrations/20260316_users.sql:1`
Change `CREATE TABLE` to `CREATE TABLE IF NOT EXISTS`. Low priority since Supabase migrations run once in order.
