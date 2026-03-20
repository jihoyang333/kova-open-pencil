# Milestone 1: Core Infrastructure — Design Spec

**Date:** 2026-03-16
**PRD Reference:** `KOVA_MVP_PRD_v4.md`, Milestone 1
**Branch:** `prdv4execution`
**Baseline:** `Starting-Now` (clean upstream merge, 161 commits)

---

## Goal

Transform the OpenPencil fork into a Kova-branded app with authentication, routing, and the foundational architecture for a multi-page consumer SaaS.

## Design Decisions

These decisions were made during brainstorming and override or clarify the PRD where noted:

1. **Light theme for non-editor pages.** Login, signup, onboarding, and dashboard use a white/light background — following Figma's convention where their homepage, auth pages, and file browser are all white/light while only the design editor is dark. Only the editor/canvas keeps the existing dark theme. This overrides PRD acceptance criteria for Task 1.2.3 ("matching the dark theme of the editor") and Task 1.2.4 ("Same visual style as login" — which it still does, just light instead of dark).

2. **Google OAuth button ships now.** The "Sign in with Google" button is built and wired to `supabase.auth.signInWithOAuth({ provider: 'google' })`. If it returns an error (e.g., OAuth provider not configured), the error is displayed inline below the button. No placeholder or "coming soon" state.

3. **Supabase migration replaces old schema.** The old `20260312_kova_init.sql` migration (from the dead v3 spec) is deleted. A new migration is written and applied to the live Supabase project via MCP. If tables from the old migration exist in the live DB, they are dropped first.

4. **Kova logo: geometric logomark.** An abstract geometric shape (forward-leaning prism/arrow evoking creativity) inside a rounded square. Brand color: blue range (~`#4F6EF7`). Generated as SVG, exported to all required icon sizes. "Kova" wordmark used in text contexts.

5. **Feature hiding via constant, not deletion.** All developer features are hidden using `v-if="SHOW_DEV_FEATURES"` with a constant in `src/constants.ts`. Files are never deleted — they can be restored by flipping the flag.

6. **AI chat will not function after M1.** After hiding the provider selection UI (Phase 1.4), the AI chat will not work because the user has no way to configure a provider. This is expected — the AI proxy (Milestone 5) will handle provider configuration server-side. Chat functionality is not a requirement for Milestone 1.

---

## Prerequisites (before any Phase)

### Install Dependencies

Before any implementation begins:

1. **Install Pinia:** `bun add pinia`
2. **Install Supabase SDK:** `bun add @supabase/supabase-js`
3. **Register Pinia in `src/main.ts`:** `app.use(createPinia())` before `app.use(router)`

**Files modified:** `package.json`, `bun.lockb`, `src/main.ts`

### Remove Old Migration

Delete `supabase/migrations/20260312_kova_init.sql` (from the dead v3 spec — wrong schema, no RLS, no triggers). If any of its tables exist in the live Supabase project, drop them via Supabase MCP before applying new migrations.

---

## Phase 1.1: Rebranding

### 1.1.1 Replace App Name and Metadata
**Files:** `index.html`, `package.json`, `vite.config.ts`, `src/constants.ts`

- `<title>` → "Kova"
- `package.json` `name` → `"kova"`
- PWA manifest `name` and `short_name` → "Kova"
- App constant `APP_NAME = 'Kova'` in `src/constants.ts`
- No user-visible occurrences of "OpenPencil" remain

### 1.1.2 Replace Favicon and PWA Icons
**Files:** `public/favicon.ico`, `public/favicon-32.png`, `public/favicon-32x32.png`, `public/favicon-128x128.png`, `public/pwa-192x192.png`, `public/pwa-512x512.png`, `public/maskable-icon-512x512.png`, `public/apple-touch-icon.png`

- Generate geometric Kova logomark as SVG
- Export to all required sizes: 16x16, 32x32, 128x128, 192x192, 512x512 (regular + maskable), apple-touch-icon (180x180)
- Abstract geometric "K" shape in rounded square, blue on dark background
- Must be legible at 16px (favicon size)
- **Also update** `favicon-32.png` (referenced by `EditorView.vue:144` and `AppMenu.vue:180`)

### 1.1.3 Update In-App Branding Text
**Files:** `src/App.vue`, `src/components/AppMenu.vue`, `src/components/chat/ChatInput.vue`, `src/components/chat/ProviderSetup.vue`, `src/views/EditorView.vue`, `src/constants.ts` (for `ACP_DESIGN_CONTEXT`), and any other files found via grep

- Replace all user-visible "OpenPencil", "open-pencil", "Pencil" → "Kova"
- Update `ACP_DESIGN_CONTEXT` in `src/constants.ts` to reference "Kova" instead of "OpenPencil"
- Update `alt="OpenPencil"` in `EditorView.vue` and `AppMenu.vue` to `alt="Kova"`
- Chat input placeholder → email-relevant text (e.g., "Design an email with Kova AI...")
- Full codebase grep to catch all occurrences in `src/`

**Do NOT rename:**
- `@open-pencil/core` import paths — these are the internal package name from the read-only `packages/core/`. They are not user-visible.
- `TRYSTERO_APP_ID = 'openpencil'` — this is an internal protocol identifier for peer-to-peer. Changing it breaks WebRTC room matching.
- Any file or import under `packages/` — read-only per hard constraints.

---

## Phase 1.2: Authentication System

### 1.2.1 Initialize Supabase Client
**Files:** `src/lib/supabase.ts` (new), `package.json`

- Singleton Supabase client using `createClient()`
- Reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from env
- **Startup validation:** If either env var is missing or empty, throw a clear error (e.g., `'Missing VITE_SUPABASE_URL. Add it to .env.local.'`). Do not create a client with undefined values.
- Typed generically (no generated types yet)
- Single export: `supabase`

### 1.2.2 Create Auth Store
**Files:** `src/stores/auth.ts` (new)

Pinia composition API setup store exposing:
- `user` — `ref<User | null>`, reactive current Supabase auth user
- `session` — `ref<Session | null>`, reactive current session
- `profile` — `ref<{ onboarded: boolean; plan: string } | null>`, fetched from `public.users` table
- `isAuthenticated` — `computed(() => !!user.value)`
- `isOnboarded` — `computed(() => profile.value?.onboarded ?? false)`
- `isLoading` — `ref<boolean>`, true until initial auth check completes
- `signUp(email, password)` — returns `{ error }` or `{ data }`
- `signIn(email, password)` — returns `{ error }` or `{ data }`
- `signInWithGoogle()` — calls `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })`
- `signOut()` — clears session, navigates to `/login`
- `fetchProfile()` — queries `public.users` where `id = user.value.id`, updates `profile` ref
- `initialize()` — calls `getSession()`, if session exists calls `fetchProfile()`, sets up `onAuthStateChange` listener (handles `SIGNED_IN`, `SIGNED_OUT`, `TOKEN_REFRESHED` events), sets `isLoading = false` when complete

**Error handling in `initialize()`:** If `getSession()` fails (network error, Supabase down), set `isLoading` to false and treat user as unauthenticated (redirect to `/login`). Log the error to console. Do not block the app indefinitely.

All methods return errors as values, never throw.

### 1.2.3 Create Login Page
**Files:** `src/views/LoginView.vue` (new)

- **Light/white theme** — white background, dark text
- Centered card layout (like Figma's login modal from reference screenshots)
- Kova logo + "Kova" wordmark at top
- "Continue with Google" button (full width, outlined, Google icon)
- "or" divider
- Email input (labeled)
- Password input (labeled)
- "Log in" button (full width, filled/primary)
- "No account? Create one" link → navigates to `/signup`
- Inline error messages below inputs
- If `signInWithGoogle()` returns an error, display inline below Google button
- Form validation: email format, password min 6 characters

### 1.2.4 Create Signup Page
**Files:** `src/views/SignupView.vue` (new)

- Same light/white visual style as login
- Kova logo + wordmark at top
- "Continue with Google" button
- "or" divider
- Email input
- Password input
- Confirm password input
- "Create Account" button (filled/primary)
- "Already have an account? Log in" link → navigates to `/login`
- If `signInWithGoogle()` returns an error, display inline below Google button
- Validation: email format, password min 6 chars, passwords match
- On success: auto-signs in, redirects to `/onboarding`

### 1.2.5 Initialize Auth on App Load
**Files:** `src/main.ts`, `src/App.vue`

- Ensure Pinia is registered: `app.use(createPinia())` before `app.use(router)` (if not done in prerequisites)
- Call `authStore.initialize()` before app renders
- Show a full-screen loading indicator until `isLoading` becomes false
- No flash of unauthenticated content
- Loading state: centered Kova logo with subtle pulse/spinner

### 1.2.6 Create Users Table and Auto-Create Trigger
**Files:** `supabase/migrations/20260316_users.sql` (new)

Full SQL including RLS and triggers:
```sql
-- Enable RLS
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  onboarded BOOLEAN DEFAULT false,
  generations_used INTEGER DEFAULT 0,
  generations_reset_at TIMESTAMPTZ DEFAULT now(),
  plan TEXT DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can read own row" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own row" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Auto-create user record on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at on row changes
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
```

Applied to live Supabase via MCP. Old migration `20260312_kova_init.sql` deleted.

---

## Phase 1.3: Routing and Route Guards

### 1.3.1 Define Route Structure
**Files:** `src/router.ts`

| Path | Component | Meta |
|------|-----------|------|
| `/login` | LoginView | `{ requiresAuth: false, publicOnly: true }` |
| `/signup` | SignupView | `{ requiresAuth: false, publicOnly: true }` |
| `/onboarding` | OnboardingView | `{ requiresAuth: true, requiresOnboarding: false }` |
| `/dashboard` | DashboardView | `{ requiresAuth: true, requiresOnboarding: true }` |
| `/editor/:canvasId` | EditorView | `{ requiresAuth: true, requiresOnboarding: true }` |
| `/` | Redirect | → `/dashboard` or `/login` |
| `/demo` | (existing) | `{ requiresAuth: false, publicOnly: false }` |

- `/demo` stays public and accessible to all users (auth or not) — it's a developer testing route
- Remove `/share/:roomId` route

### 1.3.2 Implement Navigation Guards
**Files:** `src/router.ts`

`router.beforeEach` logic:
1. Wait for auth store to finish loading (`isLoading === false`)
2. If route `requiresAuth` and not authenticated → redirect `/login`
3. If route `publicOnly` and authenticated → redirect `/dashboard`
4. If route `requiresOnboarding` and `!isOnboarded` → redirect `/onboarding`
5. If at `/onboarding` and `isOnboarded` → redirect `/dashboard`

Onboarded status comes from `authStore.isOnboarded` (fetched in `initialize()` and cached in `profile` ref).

### 1.3.3 Create Placeholder Views (parallel with 1.3.2)
**Files:** `src/views/DashboardView.vue` (new), `src/views/OnboardingView.vue` (new)

- Minimal components displaying the view name centered on screen
- Light/white theme (consistent with non-editor pages)
- Placeholder text: "Dashboard — Coming in Milestone 2" / "Onboarding — Coming in Milestone 3"
- No dependency on 1.3.2 — these are just Vue components

---

## Phase 1.4: Strip Developer Features

### Feature Flag
**File:** `src/constants.ts`

```typescript
export const SHOW_DEV_FEATURES = false
```

### 1.4.1 Hide Provider Selection UI
**Files:** `src/components/chat/ProviderSelect.vue`, `ProviderSettings.vue`, `ProviderSetup.vue`, and parent components

- Wrap with `v-if="SHOW_DEV_FEATURES"` in parent templates
- Provider dropdown, API key input, and setup wizard not rendered
- No file deletions — code remains for potential re-enabling
- Verify no build errors after hiding

### 1.4.2 Hide Code Export Options
**Files:** `src/components/AppMenu.vue`, any export-related components

- Hide "Export as JSX", "Export as HTML+Tailwind", and any code export options
- Image/PNG export remains visible
- Use `v-if="SHOW_DEV_FEATURES"` wrapping

### 1.4.3 Hide Prototyping Tab and Variables Panel
**Files:** `src/components/PropertiesPanel.vue` (or tab switcher parent), `src/components/VariablesDialog.vue`

- Hide "Prototype" tab in right panel
- Hide Variables dialog access
- Use `v-if="SHOW_DEV_FEATURES"` wrapping
- All other panels and tools remain visible

### 1.4.4 Hide MCP/Automation References
**Files:** `src/components/AppMenu.vue`, settings-related components

- Hide MCP server, automation API, CLI references in UI
- Underlying code remains — only UI entry points hidden
- Use `v-if="SHOW_DEV_FEATURES"` wrapping

---

## Dependencies and Execution Order

```
Prerequisites (install deps, remove old migration) ────────────┐
                                                                 │
Phase 1.1 (all 3 tasks parallel) ──────────────────────────────┤
                                                                 │
Phase 1.2:                                                       │
  1.2.1 (Supabase client) ──┬──→ 1.2.2 (Auth store) ──┬───────┤
  1.2.6 (Users migration)   │                           │       │
                             │    1.2.3 (Login)  ───────┤       │
                             │    1.2.4 (Signup) ───────┤       ├─→ Done
                             │                           │       │
                             └──→ 1.2.5 (App init) ─────┘       │
                                                                 │
Phase 1.3:                                                       │
  1.3.1 (Routes) ──┬──→ 1.3.2 (Guards)  ───────────────────────┤
                    └──→ 1.3.3 (Placeholders) ──────────────────┤
                                                                 │
Phase 1.4 (all 4 tasks parallel) ──────────────────────────────┘
```

- Phases 1.1 and 1.4 are independent — can run in parallel with everything
- Phase 1.2 is sequential internally (except 1.2.3 + 1.2.4 which are parallel)
- Phase 1.3 depends on Phase 1.2 (guards need auth store). Tasks 1.3.2 and 1.3.3 are parallel (both depend only on 1.3.1)

---

## Testing Strategy

### Unit Tests

**`tests/unit/stores/auth.spec.ts`:**
- "returns user after successful signIn"
- "returns error for invalid credentials"
- "navigates to /login on signOut"
- "restores session from getSession on initialize"
- "sets isLoading to false after initialize completes"
- "sets isLoading to false if getSession fails (network error)"
- "calls onAuthStateChange and updates user reactively"
- "fetches profile and exposes isOnboarded"
- "signUp returns error for existing email"

**`tests/unit/router/guards.spec.ts`:**
- "redirects unauthenticated users to /login for protected routes"
- "redirects authenticated users away from /login and /signup"
- "redirects non-onboarded users to /onboarding"
- "redirects onboarded users away from /onboarding"
- "allows access to /demo regardless of auth state"
- "redirects / to /dashboard for authenticated users"
- "redirects / to /login for unauthenticated users"

**Mock strategy:** Mock the Supabase client module (`src/lib/supabase.ts`) using `bun:test` mocking. Provide controlled responses for `getSession()`, `signInWithPassword()`, `signUp()`, `onAuthStateChange()`, and `from('users').select()`.

### Integration Tests

**`tests/unit/lib/supabase.spec.ts`:**
- "throws if VITE_SUPABASE_URL is missing"
- "throws if VITE_SUPABASE_ANON_KEY is missing"
- "creates client with valid env vars"

### E2E Tests

**`tests/e2e/auth.spec.ts`:**
- Login flow (email/password)
- Signup flow (email/password)
- Route protection (unauthenticated access to /dashboard redirects to /login)
- Feature flag hiding (provider UI, code exports, prototype tab, variables panel, MCP references all hidden)

### Visual Verification

- Favicon visible in browser tab
- PWA icons at all sizes
- No "OpenPencil" text visible anywhere in the running app
- Branding text correctly shows "Kova"

---

## Out of Scope

- Dashboard UI (Milestone 2)
- Onboarding flow (Milestone 3)
- Brand profiles (Milestone 3/4)
- AI proxy (Milestone 5)
- AI chat functionality (intentionally non-functional after provider UI hiding — restored in M5)
- Password reset flow (post-MVP)
- Email verification (explicitly excluded per PRD)
