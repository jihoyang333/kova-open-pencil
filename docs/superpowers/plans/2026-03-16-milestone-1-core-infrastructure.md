# Milestone 1: Core Infrastructure — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the OpenPencil fork into a Kova-branded app with authentication, routing, and foundational multi-page SaaS architecture.

**Architecture:** Vue 3 SPA with Supabase auth, Pinia state management for user/session, and vue-router guards. The existing OpenPencil editor becomes one route (`/editor/:canvasId`) in a multi-page app with login, signup, dashboard, and onboarding views. Developer-facing features are hidden behind a `SHOW_DEV_FEATURES` constant.

**Tech Stack:** Vue 3 (Composition API + `<script setup>`), Pinia, Supabase JS SDK, Vue Router, Tailwind CSS 4, bun:test, Playwright

**Spec:** `docs/superpowers/specs/2026-03-16-milestone-1-core-infrastructure-design.md`

---

## File Map

### New Files
| File | Responsibility |
|------|---------------|
| `src/lib/supabase.ts` | Singleton Supabase client with env validation |
| `src/stores/auth.ts` | Pinia auth store: user, session, profile, sign in/up/out |
| `src/views/LoginView.vue` | Login page (light theme, email/password + Google OAuth) |
| `src/views/SignupView.vue` | Signup page (light theme, mirrors login layout) |
| `src/views/DashboardView.vue` | Placeholder dashboard (light theme) |
| `src/views/OnboardingView.vue` | Placeholder onboarding (light theme) |
| `supabase/migrations/20260316_users.sql` | Users table with RLS, triggers |
| `tests/unit/lib/supabase.test.ts` | Supabase client env validation tests |
| `tests/unit/stores/auth.test.ts` | Auth store unit tests |
| `tests/unit/router/guards.test.ts` | Navigation guard unit tests |

### Modified Files
| File | Changes |
|------|---------|
| `package.json` | Add pinia, @supabase/supabase-js |
| `src/main.ts` | Register Pinia, initialize auth before mount |
| `src/App.vue` | Loading gate, title "Kova", Suspense wrapper |
| `src/router.ts` | All routes, meta types, beforeEach guard |
| `src/router.d.ts` | Extended RouteMeta interface |
| `src/constants.ts` | `APP_NAME`, `SHOW_DEV_FEATURES`, updated `ACP_DESIGN_CONTEXT` |
| `index.html` | Title "Kova", light-safe loader |
| `vite.config.ts` | PWA manifest name/description → "Kova" |
| `src/views/EditorView.vue` | Alt text "OpenPencil" → "Kova" (line 144) |
| `src/components/AppMenu.vue` | Alt text "OpenPencil" → "Kova" (line 180) |
| `src/components/chat/ChatInput.vue` | Placeholder text → email-relevant; hide model selector bar with SHOW_DEV_FEATURES |
| `src/components/PropertiesPanel.vue` | Hide "Code" tab with SHOW_DEV_FEATURES |
| `src/components/DesignPanel.vue` | Hide VariablesSection + VariablesDialog with SHOW_DEV_FEATURES |
| `src/components/NodeContextMenuContent.vue` | Hide "Copy as JSX" with SHOW_DEV_FEATURES |
| `src/components/ChatPanel.vue` | Hide ProviderSetup with SHOW_DEV_FEATURES (always show empty state) |

---

## Chunk 1: Prerequisites + Phase 1.1 (Rebranding) + Phase 1.4 (Feature Hiding)

These are independent of auth and can all be done first.

### Task 0: Install Dependencies

**Files:**
- Modify: `package.json`
- Modify: `src/main.ts`

- [ ] **Step 0.1: Install Pinia and Supabase SDK**

```bash
cd kova-open-pencil-1 && bun add pinia @supabase/supabase-js
```

- [ ] **Step 0.2: Register Pinia in main.ts**

In `src/main.ts`, add Pinia import and registration. The current file (line 13) does:
```typescript
createApp(App).use(router).use(head).mount('#app')
```

Replace with:
```typescript
import { createPinia } from 'pinia'

// ... existing imports ...

const pinia = createPinia()
createApp(App).use(pinia).use(router).use(head).mount('#app')
```

Full file after edit:
```typescript
import { createPinia } from 'pinia'
import { createHead } from '@unhead/vue/client'
import { createApp } from 'vue'

import './app.css'
import { IS_TAURI } from '@/constants'
import { preloadFonts } from '@/engine/fonts'

import App from './App.vue'
import router from './router'

preloadFonts()
const pinia = createPinia()
const head = createHead()
createApp(App).use(pinia).use(router).use(head).mount('#app')

if (!IS_TAURI) {
  void import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({ immediate: true })
  })
}
```

- [ ] **Step 0.3: Delete old migration**

```bash
rm kova-open-pencil-1/supabase/migrations/20260312_kova_init.sql
```

Check if old tables exist in live Supabase and drop them via Supabase MCP if needed:
```sql
DROP TABLE IF EXISTS public.templates CASCADE;
DROP TABLE IF EXISTS public.emails CASCADE;
DROP TABLE IF EXISTS public.brand_profiles CASCADE;
DROP TABLE IF EXISTS public.clients CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
```

- [ ] **Step 0.4: Update test:unit script to include tests/unit/**

In `package.json`, the `test:unit` script currently runs `bun test ./tests/engine`. Update to also cover the new `tests/unit/` directory:

Change: `"test:unit": "bun test ./tests/engine"`
To: `"test:unit": "bun test ./tests/engine ./tests/unit"`

- [ ] **Step 0.5: Verify Supabase email confirmation is disabled**

In the Supabase project dashboard → Authentication → Settings → Email Auth, ensure "Confirm email" is **disabled**. The PRD explicitly excludes email verification. If confirmation is enabled, `signUp()` will not auto-sign-in the user, breaking the signup → onboarding redirect flow.

- [ ] **Step 0.6: Commit prerequisites**

```bash
git add package.json bun.lockb src/main.ts
git add -u supabase/migrations/20260312_kova_init.sql
git commit -m "chore: install pinia + supabase SDK, remove old migration, update test:unit"
```

---

### Task 1: Add App Constants (SHOW_DEV_FEATURES, APP_NAME)

**Files:**
- Modify: `src/constants.ts`

- [ ] **Step 1.1: Add SHOW_DEV_FEATURES and APP_NAME constants**

After the existing `ACP_PERMISSION_TIMEOUT_MS` line (line 143) and before `ACP_DESIGN_CONTEXT` (line 145), add:

```typescript
export const APP_NAME = 'Kova'
export const SHOW_DEV_FEATURES = false
```

- [ ] **Step 1.2: Update ACP_DESIGN_CONTEXT to reference Kova**

Replace lines 145-150 (`ACP_DESIGN_CONTEXT`):

Old:
```typescript
export const ACP_DESIGN_CONTEXT = `You are inside OpenPencil, an open-source design editor (like Figma). \
Use the open-pencil MCP tools to create and modify designs on the live canvas. \
Key tools: render (JSX to design), create_shape, set_fill, set_layout, find_nodes, get_page_tree, export_image. \
The render tool accepts JSX with components: Frame, Text, Rectangle, Ellipse, Icon, Group, Section. \
Props: w, h, bg, flex, gap, p, rounded, color, size, weight, items, justify, stroke, opacity, shadow. \
Do NOT write HTML files or use terminal commands — draw directly on the canvas using the MCP tools.`
```

New:
```typescript
export const ACP_DESIGN_CONTEXT = `You are inside Kova, an AI-powered email design editor built on OpenPencil. \
Use the open-pencil MCP tools to create and modify designs on the live canvas. \
Key tools: render (JSX to design), create_shape, set_fill, set_layout, find_nodes, get_page_tree, export_image. \
The render tool accepts JSX with components: Frame, Text, Rectangle, Ellipse, Icon, Group, Section. \
Props: w, h, bg, flex, gap, p, rounded, color, size, weight, items, justify, stroke, opacity, shadow. \
Do NOT write HTML files or use terminal commands — draw directly on the canvas using the MCP tools.`
```

- [ ] **Step 1.3: Commit**

```bash
git add src/constants.ts
git commit -m "feat: add APP_NAME, SHOW_DEV_FEATURES constants and update ACP_DESIGN_CONTEXT"
```

---

### Task 2: Rebrand Metadata (index.html, package.json, vite.config.ts)

**Files:**
- Modify: `index.html`
- Modify: `package.json`
- Modify: `vite.config.ts`

- [ ] **Step 2.1: Update index.html**

Change line 11 title:
```html
<title>Kova</title>
```

- [ ] **Step 2.2: Update package.json name**

Change `"name": "open-pencil-app"` to `"name": "kova"`.

- [ ] **Step 2.3: Update vite.config.ts PWA manifest**

In the VitePWA manifest section (lines 67-69), change:
```typescript
name: 'Kova',
short_name: 'Kova',
description: 'AI-powered email design editor',
```

- [ ] **Step 2.4: Commit**

```bash
git add index.html package.json vite.config.ts
git commit -m "feat: rebrand metadata to Kova (title, package name, PWA manifest)"
```

---

### Task 3: Rebrand In-App Text

**Files:**
- Modify: `src/App.vue`
- Modify: `src/views/EditorView.vue` (line 144)
- Modify: `src/components/AppMenu.vue` (line 180)
- Modify: `src/components/chat/ChatInput.vue` (line 137)

- [ ] **Step 3.1: Update App.vue titleTemplate**

Line 8 — change:
```typescript
useHead({ titleTemplate: (title) => (title ? `${title} — OpenPencil` : 'OpenPencil') })
```
To:
```typescript
useHead({ titleTemplate: (title) => (title ? `${title} — Kova` : 'Kova') })
```

- [ ] **Step 3.2: Update EditorView.vue alt text**

Line 144 — change `alt="OpenPencil"` to `alt="Kova"`.

- [ ] **Step 3.3: Update AppMenu.vue alt text**

Line 180 — change `alt="OpenPencil"` to `alt="Kova"`.

- [ ] **Step 3.4: Update ChatInput.vue placeholder**

Line 137 — change `placeholder="Describe a change…"` to `placeholder="Design an email with Kova AI..."`.

- [ ] **Step 3.5: Verify no remaining user-visible "OpenPencil" in src/**

Run grep for user-visible occurrences. Skip: `@open-pencil/core` imports, `TRYSTERO_APP_ID = 'openpencil'`, `openpencil` JSX format string, `__OPEN_PENCIL_*` window globals, `name: 'open-pencil-automation'` vite plugin name, `open-pencil` in error messages about MCP install.

The CodePanel.vue line 68 (`'OpenPencil'` in the JSX format toggle) is part of the Code tab which will be hidden by SHOW_DEV_FEATURES in Task 5. No change needed.

- [ ] **Step 3.6: Commit**

```bash
git add src/App.vue src/views/EditorView.vue src/components/AppMenu.vue src/components/chat/ChatInput.vue
git commit -m "feat: rebrand all user-visible text from OpenPencil to Kova"
```

---

### Task 4: Generate Kova Favicon and PWA Icons

**Files:**
- Modify/Replace: `public/favicon.ico`, `public/favicon-32.png`, `public/favicon-128.png`, `public/apple-touch-icon.png`, `public/pwa-192.png`, `public/pwa-512.png`, `public/pwa-maskable-512.png`

The current favicons are symlinks to `../desktop/icons/`. We need actual PNG files for the Kova brand.

- [ ] **Step 4.1: Generate Kova logo SVG**

Create a geometric "K" logomark SVG: abstract forward-leaning prism/arrow shape in a rounded square. Brand blue: `#4F6EF7`. White shape on blue background. Must be legible at 16px.

Use the `web-asset-generator` skill or generate programmatically with a Node script.

- [ ] **Step 4.2: Export to all required sizes**

Remove symlinks and replace with actual PNG files:
- `public/favicon-32.png` — 32x32
- `public/favicon-128.png` — 128x128
- `public/apple-touch-icon.png` — 180x180
- `public/pwa-192.png` — 192x192
- `public/pwa-512.png` — 512x512
- `public/pwa-maskable-512.png` — 512x512 with safe zone padding
- `public/favicon.ico` — multi-size ICO (16+32)

- [ ] **Step 4.3: Verify favicons render in dev server**

```bash
cd kova-open-pencil-1 && bun run dev
```
Check browser tab shows Kova icon, not OpenPencil pen.

- [ ] **Step 4.4: Commit**

```bash
git add public/favicon.ico public/favicon-32.png public/favicon-128.png public/apple-touch-icon.png public/pwa-192.png public/pwa-512.png public/pwa-maskable-512.png
git commit -m "feat: replace OpenPencil icons with Kova branded icons"
```

---

### Task 5: Hide Developer Features (Phase 1.4)

**Files:**
- Modify: `src/components/PropertiesPanel.vue`
- Modify: `src/components/DesignPanel.vue`
- Modify: `src/components/ChatPanel.vue`
- Modify: `src/components/NodeContextMenuContent.vue`

All hiding uses `v-if="SHOW_DEV_FEATURES"` with import from `@/constants`.

- [ ] **Step 5.1: Hide Code tab in PropertiesPanel.vue**

Import the constant:
```typescript
import { SHOW_DEV_FEATURES } from '@/constants'
```

Wrap the Code tab trigger (lines 30-37) with `v-if="SHOW_DEV_FEATURES"`:
```html
<TabsTrigger
  v-if="SHOW_DEV_FEATURES"
  value="code"
  data-test-id="properties-tab-code"
  class="flex items-center gap-1 rounded px-2.5 py-1 text-xs text-muted hover:text-surface data-[state=active]:font-semibold data-[state=active]:text-surface"
>
  <icon-lucide-code class="size-3" />
  Code
</TabsTrigger>
```

Also wrap the Code tab content (lines 64-70) with `v-if="SHOW_DEV_FEATURES"`:
```html
<TabsContent
  v-if="SHOW_DEV_FEATURES"
  value="code"
  class="flex min-h-0 flex-1 flex-col"
  :force-mount="true"
  :hidden="activeTab !== 'code'"
>
  <CodePanel />
</TabsContent>
```

- [ ] **Step 5.2: Hide VariablesSection and VariablesDialog in DesignPanel.vue**

Import the constant:
```typescript
import { SHOW_DEV_FEATURES } from '@/constants'
```

Wrap line 104 (`<VariablesSection>`) with `v-if="SHOW_DEV_FEATURES"`:
```html
<VariablesSection v-if="SHOW_DEV_FEATURES" @open-dialog="variablesOpen = true" />
```

Wrap line 107 (`<VariablesDialog>`) with `v-if="SHOW_DEV_FEATURES"`:
```html
<VariablesDialog v-if="SHOW_DEV_FEATURES" v-model:open="variablesOpen" />
```

- [ ] **Step 5.3: Hide ProviderSetup in ChatPanel.vue (show as always-unconfigured)**

The ChatPanel.vue at line 111 shows `<ProviderSetup v-if="!isConfigured" />`. When SHOW_DEV_FEATURES is false, we want the provider setup screen to never appear (since it asks users to enter API keys). Instead, show a Kova-branded empty state.

Import the constant:
```typescript
import { SHOW_DEV_FEATURES } from '@/constants'
```

Replace line 111:
```html
<ProviderSetup v-if="!isConfigured && SHOW_DEV_FEATURES" />
```

This means when `SHOW_DEV_FEATURES` is false and no provider is configured, the chat panel will fall through to the `<template v-else>` block which shows the normal chat UI with its empty state ("Describe what you want to create or change"). The chat input will be visible but non-functional since no provider is configured — this matches the spec requirement that AI chat is intentionally non-functional after M1.

- [ ] **Step 5.4: Hide model selector bar and ProviderSettings in ChatInput.vue**

Import the constant at the top of the script:
```typescript
import { SHOW_DEV_FEATURES } from '@/constants'
```

Wrap the model selector + settings toolbar (lines 67-129, the `<!-- Model selector & settings -->` div) with `v-if="SHOW_DEV_FEATURES"`:
```html
<!-- Model selector & settings — hidden when dev features disabled -->
<div v-if="SHOW_DEV_FEATURES" class="mb-1.5 flex items-center gap-1">
  <!-- ... existing model selector + ProviderSettings content ... -->
</div>
```

This hides: the ACP agent label, the model dropdown selector, and the ProviderSettings gear icon. The chat input field and send button remain visible (non-functional since no provider is configured — matches spec).

- [ ] **Step 5.5: Hide "Copy as JSX" in NodeContextMenuContent.vue**

**Note on spec 1.4.2 (Code Export):** The spec says to hide "Export as JSX" and "Export as HTML+Tailwind" from `AppMenu.vue`, but `AppMenu.vue` has no code export items — only "Export selection" which exports PNG. Code export lives in the `Code` tab (hidden in Step 5.1) and the context menu (hidden in this step). Spec 1.4.2 is satisfied by these two steps.

**Note on spec 1.4.3 (Prototyping Tab):** The spec mentions hiding a "Prototype" tab. No prototype tab exists in the current `PropertiesPanel.vue` (tabs are Design, Code, AI). The Code tab is hidden in Step 5.1. This spec requirement does not apply.

**Note on spec 1.4.4 (MCP/Automation References):** `AppMenu.vue` has no MCP, automation, or CLI references in its menu items. The automation/MCP code is in `EditorView.vue`'s `onMounted` but runs silently in the background with no UI entry point in the menus. No additional hiding needed.

Import the constant at the top of the script:
```typescript
import { SHOW_DEV_FEATURES } from '@/constants'
```

Wrap the JSX copy menu item (lines 325-331) with `v-if="SHOW_DEV_FEATURES"`:
```html
<ContextMenuItem
  v-if="SHOW_DEV_FEATURES"
  data-test-id="context-copy-as-jsx"
  :class="itemClass"
  @select="copyAsJSX"
>
  Copy as JSX
</ContextMenuItem>
```

- [ ] **Step 5.6: Verify build succeeds**

```bash
cd kova-open-pencil-1 && bun run build
```

- [ ] **Step 5.7: Commit**

```bash
git add src/components/PropertiesPanel.vue src/components/DesignPanel.vue src/components/ChatPanel.vue src/components/chat/ChatInput.vue src/components/NodeContextMenuContent.vue
git commit -m "feat: hide developer features behind SHOW_DEV_FEATURES flag"
```

---

## Chunk 2: Phase 1.2 (Authentication System)

### Task 6: Create Supabase Client with Env Validation (TDD)

**Files:**
- Create: `src/lib/supabase.ts`
- Create: `tests/unit/lib/supabase.test.ts`

- [ ] **Step 6.1: Write the failing tests**

Create `tests/unit/lib/supabase.test.ts`:

```typescript
import { describe, test, expect } from 'bun:test'

import { createSupabaseClient } from '@/lib/supabase'

describe('createSupabaseClient', () => {
  test('throws if VITE_SUPABASE_URL is missing', () => {
    expect(() => {
      createSupabaseClient({ url: '', key: 'test-key' })
    }).toThrow('Missing VITE_SUPABASE_URL')
  })

  test('throws if VITE_SUPABASE_ANON_KEY is missing', () => {
    expect(() => {
      createSupabaseClient({ url: 'https://test.supabase.co', key: '' })
    }).toThrow('Missing VITE_SUPABASE_ANON_KEY')
  })

  test('creates client with valid env vars', () => {
    const client = createSupabaseClient({
      url: 'https://test.supabase.co',
      key: 'test-anon-key'
    })
    expect(client).toBeDefined()
    expect(client.auth).toBeDefined()
  })
})
```

**Note:** The factory function accepts an explicit `{ url, key }` parameter for testability, avoiding `import.meta.env` / `process.env` issues in bun:test. The singleton `supabase` export reads from `import.meta.env` at module level for app use.

- [ ] **Step 6.2: Run tests — verify they fail**

```bash
cd kova-open-pencil-1 && bun test tests/unit/lib/supabase.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 6.3: Implement src/lib/supabase.ts**

The factory function accepts an explicit `{ url, key }` parameter for testability. The singleton reads from `import.meta.env` at module level.

```typescript
import { createClient } from '@supabase/supabase-js'

import type { SupabaseClient } from '@supabase/supabase-js'

interface SupabaseConfig {
  url: string
  key: string
}

export function createSupabaseClient(config?: SupabaseConfig): SupabaseClient {
  const url = config?.url ?? import.meta.env.VITE_SUPABASE_URL
  const key = config?.key ?? import.meta.env.VITE_SUPABASE_ANON_KEY

  if (!url) {
    throw new Error('Missing VITE_SUPABASE_URL. Add it to .env.local.')
  }
  if (!key) {
    throw new Error('Missing VITE_SUPABASE_ANON_KEY. Add it to .env.local.')
  }

  return createClient(url, key)
}

export const supabase = createSupabaseClient()
```

**Note:** The singleton `export const supabase` executes at import time and reads `import.meta.env`. Tests call `createSupabaseClient({ url, key })` with explicit values, never importing the singleton. If the singleton import throws during test module resolution, mock the module: `mock.module('@/lib/supabase', ...)` before importing any module that depends on it.

- [ ] **Step 6.4: Run tests — verify they pass**

```bash
cd kova-open-pencil-1 && bun test tests/unit/lib/supabase.test.ts
```
Expected: PASS

- [ ] **Step 6.5: Commit**

```bash
git add src/lib/supabase.ts tests/unit/lib/supabase.test.ts
git commit -m "feat: create Supabase client singleton with env validation"
```

---

### Task 7: Create Auth Store (TDD)

**Files:**
- Create: `src/stores/auth.ts`
- Create: `tests/unit/stores/auth.test.ts`

This is the most complex task. The auth store is a Pinia composition API setup store.

- [ ] **Step 7.1: Write failing tests**

Create `tests/unit/stores/auth.test.ts`:

```typescript
import { describe, test, expect, beforeEach, mock, spyOn } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'

// Mock vue-router before importing auth store
const mockPush = mock(() => Promise.resolve())
mock.module('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
  // re-export other vue-router APIs needed by Pinia
  createRouter: () => ({}),
  createMemoryHistory: () => ({})
}))

// Mock Supabase client before importing auth store
const mockGetSession = mock(() => Promise.resolve({ data: { session: null }, error: null }))
const mockSignInWithPassword = mock(() => Promise.resolve({ data: { user: null, session: null }, error: null }))
const mockSignUp = mock(() => Promise.resolve({ data: { user: null, session: null }, error: null }))
const mockSignInWithOAuth = mock(() => Promise.resolve({ data: {}, error: null }))
const mockSignOut = mock(() => Promise.resolve({ error: null }))
const mockOnAuthStateChange = mock(() => ({
  data: { subscription: { unsubscribe: mock(() => {}) } }
}))
const mockFrom = mock(() => ({
  select: mock(() => ({
    eq: mock(() => ({
      single: mock(() => Promise.resolve({ data: null, error: null }))
    }))
  }))
}))

mock.module('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
      signInWithPassword: mockSignInWithPassword,
      signUp: mockSignUp,
      signInWithOAuth: mockSignInWithOAuth,
      signOut: mockSignOut,
      onAuthStateChange: mockOnAuthStateChange
    },
    from: mockFrom
  }
}))

// Import after mock setup
const { useAuthStore } = await import('@/stores/auth')

describe('auth store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockPush.mockClear()
    mockGetSession.mockClear()
    mockSignInWithPassword.mockClear()
    mockSignUp.mockClear()
    mockSignInWithOAuth.mockClear()
    mockSignOut.mockClear()
    mockOnAuthStateChange.mockClear()
    mockFrom.mockClear()
  })

  test('starts with isLoading true', () => {
    const store = useAuthStore()
    expect(store.isLoading).toBe(true)
    expect(store.isAuthenticated).toBe(false)
  })

  test('sets isLoading to false after initialize completes', async () => {
    const store = useAuthStore()
    await store.initialize()
    expect(store.isLoading).toBe(false)
  })

  test('restores session from getSession on initialize', async () => {
    const mockUser = { id: 'user-1', email: 'test@test.com' }
    const mockSession = { user: mockUser, access_token: 'token' }
    mockGetSession.mockResolvedValueOnce({
      data: { session: mockSession },
      error: null
    })
    mockFrom.mockReturnValueOnce({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({
            data: { onboarded: true, plan: 'free' },
            error: null
          })
        })
      })
    })

    const store = useAuthStore()
    await store.initialize()

    expect(store.user).toEqual(mockUser)
    expect(store.session).toEqual(mockSession)
    expect(store.isAuthenticated).toBe(true)
    expect(store.isLoading).toBe(false)
  })

  test('sets isLoading to false if getSession fails', async () => {
    mockGetSession.mockResolvedValueOnce({
      data: { session: null },
      error: { message: 'Network error' }
    })

    const store = useAuthStore()
    await store.initialize()

    expect(store.isLoading).toBe(false)
    expect(store.isAuthenticated).toBe(false)
  })

  test('returns user after successful signIn', async () => {
    const mockUser = { id: 'user-1', email: 'test@test.com' }
    mockSignInWithPassword.mockResolvedValueOnce({
      data: { user: mockUser, session: { user: mockUser } },
      error: null
    })

    const store = useAuthStore()
    const result = await store.signIn('test@test.com', 'password123')

    expect(result.error).toBeNull()
    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'test@test.com',
      password: 'password123'
    })
  })

  test('returns error for invalid credentials', async () => {
    mockSignInWithPassword.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { message: 'Invalid credentials' }
    })

    const store = useAuthStore()
    const result = await store.signIn('test@test.com', 'wrong')

    expect(result.error).toBeTruthy()
    expect(result.error?.message).toBe('Invalid credentials')
  })

  test('signUp returns error for existing email', async () => {
    mockSignUp.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { message: 'User already registered' }
    })

    const store = useAuthStore()
    const result = await store.signUp('existing@test.com', 'password123')

    expect(result.error).toBeTruthy()
    expect(result.error?.message).toBe('User already registered')
  })

  test('fetches profile and exposes isOnboarded', async () => {
    const mockUser = { id: 'user-1', email: 'test@test.com' }
    const mockSession = { user: mockUser, access_token: 'token' }
    mockGetSession.mockResolvedValueOnce({
      data: { session: mockSession },
      error: null
    })
    mockFrom.mockReturnValueOnce({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({
            data: { onboarded: true, plan: 'free' },
            error: null
          })
        })
      })
    })

    const store = useAuthStore()
    await store.initialize()

    expect(store.isOnboarded).toBe(true)
    expect(store.profile).toEqual({ onboarded: true, plan: 'free' })
  })

  test('navigates to /login on signOut', async () => {
    const store = useAuthStore()
    await store.signOut()

    expect(mockSignOut).toHaveBeenCalled()
    expect(store.user).toBeNull()
    expect(store.session).toBeNull()
    expect(store.profile).toBeNull()
    expect(mockPush).toHaveBeenCalledWith('/login')
  })

  test('calls onAuthStateChange during initialize', async () => {
    const store = useAuthStore()
    await store.initialize()

    expect(mockOnAuthStateChange).toHaveBeenCalled()
  })
})
```

- [ ] **Step 7.2: Run tests — verify they fail**

```bash
cd kova-open-pencil-1 && bun test tests/unit/stores/auth.test.ts
```
Expected: FAIL — module `@/stores/auth` not found.

- [ ] **Step 7.3: Implement src/stores/auth.ts**

```typescript
import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { useRouter } from 'vue-router'

import { supabase } from '@/lib/supabase'

import type { Session, User, AuthError } from '@supabase/supabase-js'

interface UserProfile {
  onboarded: boolean
  plan: string
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const session = ref<Session | null>(null)
  const profile = ref<UserProfile | null>(null)
  const isLoading = ref(true)

  const isAuthenticated = computed(() => !!user.value)
  const isOnboarded = computed(() => profile.value?.onboarded ?? false)

  async function fetchProfile(): Promise<void> {
    if (!user.value) return

    const { data, error } = await supabase
      .from('users')
      .select('onboarded, plan')
      .eq('id', user.value.id)
      .single()

    if (error) {
      console.error('Failed to fetch user profile:', error.message)
      return
    }

    profile.value = data as UserProfile
  }

  async function initialize(): Promise<void> {
    try {
      const { data, error } = await supabase.auth.getSession()

      if (error) {
        console.error('Failed to get session:', error.message)
      } else if (data.session) {
        session.value = data.session
        user.value = data.session.user
        await fetchProfile()
      }
    } catch (err) {
      console.error('Auth initialization error:', err)
    } finally {
      isLoading.value = false
    }

    // Always register auth listener — even if getSession failed,
    // the network may recover and trigger a SIGNED_IN event
    supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        session.value = newSession
        user.value = newSession?.user ?? null
        if (newSession?.user) {
          void fetchProfile()
        }
      } else if (event === 'SIGNED_OUT') {
        session.value = null
        user.value = null
        profile.value = null
      }
    })
  }

  async function signIn(
    email: string,
    password: string
  ): Promise<{ error: AuthError | null }> {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  async function signUp(
    email: string,
    password: string
  ): Promise<{ error: AuthError | null }> {
    const { error } = await supabase.auth.signUp({ email, password })
    return { error }
  }

  async function signInWithGoogle(): Promise<{ error: AuthError | null }> {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    })
    return { error }
  }

  async function signOut(): Promise<void> {
    await supabase.auth.signOut()
    session.value = null
    user.value = null
    profile.value = null
    // Navigate to login — useRouter() works inside Pinia setup stores
    // because the router is installed before the store is created
    const router = useRouter()
    void router.push('/login')
  }

  return {
    user,
    session,
    profile,
    isLoading,
    isAuthenticated,
    isOnboarded,
    initialize,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    fetchProfile
  }
})
```

- [ ] **Step 7.4: Run tests — verify they pass**

```bash
cd kova-open-pencil-1 && bun test tests/unit/stores/auth.test.ts
```
Expected: PASS

- [ ] **Step 7.5: Commit**

```bash
git add src/stores/auth.ts tests/unit/stores/auth.test.ts
git commit -m "feat: create Pinia auth store with Supabase integration"
```

---

### Task 8: Create Users Table Migration

**Files:**
- Create: `supabase/migrations/20260316_users.sql`

- [ ] **Step 8.1: Drop old tables if they exist in live DB**

Via Supabase MCP `execute_sql`:
```sql
DROP TABLE IF EXISTS public.templates CASCADE;
DROP TABLE IF EXISTS public.emails CASCADE;
DROP TABLE IF EXISTS public.brand_profiles CASCADE;
DROP TABLE IF EXISTS public.clients CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at() CASCADE;
```

- [ ] **Step 8.2: Create migration file**

Create `supabase/migrations/20260316_users.sql`:

```sql
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

CREATE POLICY "Users can read own row" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own row" ON public.users
  FOR UPDATE USING (auth.uid() = id);

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

- [ ] **Step 8.3: Apply migration via Supabase MCP**

Use `mcp__supabase__apply_migration` or `mcp__supabase__execute_sql` to apply the SQL to the live project.

- [ ] **Step 8.4: Commit**

```bash
git add supabase/migrations/20260316_users.sql
git commit -m "feat: add users table with RLS, auto-create trigger, updated_at trigger"
```

---

### Task 9: Create Login Page

**Files:**
- Create: `src/views/LoginView.vue`

- [ ] **Step 9.1: Create LoginView.vue**

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

import { APP_NAME } from '@/constants'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

const email = ref('')
const password = ref('')
const error = ref('')
const googleError = ref('')
const isSubmitting = ref(false)

function validateForm(): string | null {
  if (!email.value.includes('@')) return 'Please enter a valid email address.'
  if (password.value.length < 6) return 'Password must be at least 6 characters.'
  return null
}

async function handleSubmit() {
  error.value = ''
  const validationError = validateForm()
  if (validationError) {
    error.value = validationError
    return
  }

  isSubmitting.value = true
  const { error: authError } = await auth.signIn(email.value, password.value)
  isSubmitting.value = false

  if (authError) {
    error.value = authError.message
    return
  }

  void router.push('/dashboard')
}

async function handleGoogleSignIn() {
  googleError.value = ''
  const { error: authError } = await auth.signInWithGoogle()
  if (authError) {
    googleError.value = authError.message
  }
}
</script>

<template>
  <div
    data-test-id="login-view"
    class="flex min-h-screen items-center justify-center bg-white px-4"
  >
    <div class="w-full max-w-sm">
      <!-- Logo + wordmark -->
      <div class="mb-8 flex flex-col items-center gap-3">
        <img src="/favicon-128.png" class="size-12 rounded-xl" :alt="APP_NAME" />
        <h1 class="text-2xl font-semibold tracking-tight text-gray-900">
          {{ APP_NAME }}
        </h1>
      </div>

      <!-- Google OAuth -->
      <button
        data-test-id="login-google-button"
        class="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        @click="handleGoogleSignIn"
      >
        <svg class="size-5" viewBox="0 0 24 24">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
        Continue with Google
      </button>
      <p
        v-if="googleError"
        data-test-id="login-google-error"
        class="mt-2 text-center text-xs text-red-600"
      >
        {{ googleError }}
      </p>

      <!-- Divider -->
      <div class="my-6 flex items-center gap-3">
        <div class="h-px flex-1 bg-gray-200" />
        <span class="text-xs text-gray-400">or</span>
        <div class="h-px flex-1 bg-gray-200" />
      </div>

      <!-- Email/password form -->
      <form class="flex flex-col gap-3" @submit.prevent="handleSubmit">
        <div>
          <label for="login-email" class="mb-1 block text-xs font-medium text-gray-700">
            Email
          </label>
          <input
            id="login-email"
            v-model="email"
            type="email"
            data-test-id="login-email-input"
            class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="you@company.com"
          />
        </div>
        <div>
          <label for="login-password" class="mb-1 block text-xs font-medium text-gray-700">
            Password
          </label>
          <input
            id="login-password"
            v-model="password"
            type="password"
            data-test-id="login-password-input"
            class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="••••••••"
          />
        </div>

        <p
          v-if="error"
          data-test-id="login-error"
          class="text-xs text-red-600"
        >
          {{ error }}
        </p>

        <button
          type="submit"
          data-test-id="login-submit-button"
          class="mt-1 w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          :disabled="isSubmitting"
        >
          {{ isSubmitting ? 'Signing in...' : 'Log in' }}
        </button>
      </form>

      <!-- Signup link -->
      <p class="mt-6 text-center text-sm text-gray-500">
        No account?
        <RouterLink
          to="/signup"
          data-test-id="login-signup-link"
          class="font-medium text-blue-600 hover:text-blue-700"
        >
          Create one
        </RouterLink>
      </p>
    </div>
  </div>
</template>
```

- [ ] **Step 9.2: Commit**

```bash
git add src/views/LoginView.vue
git commit -m "feat: create login page with email/password and Google OAuth"
```

---

### Task 10: Create Signup Page

**Files:**
- Create: `src/views/SignupView.vue`

- [ ] **Step 10.1: Create SignupView.vue**

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

import { APP_NAME } from '@/constants'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const error = ref('')
const googleError = ref('')
const isSubmitting = ref(false)

function validateForm(): string | null {
  if (!email.value.includes('@')) return 'Please enter a valid email address.'
  if (password.value.length < 6) return 'Password must be at least 6 characters.'
  if (password.value !== confirmPassword.value) return 'Passwords do not match.'
  return null
}

async function handleSubmit() {
  error.value = ''
  const validationError = validateForm()
  if (validationError) {
    error.value = validationError
    return
  }

  isSubmitting.value = true
  const { error: authError } = await auth.signUp(email.value, password.value)
  isSubmitting.value = false

  if (authError) {
    error.value = authError.message
    return
  }

  void router.push('/onboarding')
}

async function handleGoogleSignIn() {
  googleError.value = ''
  const { error: authError } = await auth.signInWithGoogle()
  if (authError) {
    googleError.value = authError.message
  }
}
</script>

<template>
  <div
    data-test-id="signup-view"
    class="flex min-h-screen items-center justify-center bg-white px-4"
  >
    <div class="w-full max-w-sm">
      <!-- Logo + wordmark -->
      <div class="mb-8 flex flex-col items-center gap-3">
        <img src="/favicon-128.png" class="size-12 rounded-xl" :alt="APP_NAME" />
        <h1 class="text-2xl font-semibold tracking-tight text-gray-900">
          Create your account
        </h1>
      </div>

      <!-- Google OAuth -->
      <button
        data-test-id="signup-google-button"
        class="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        @click="handleGoogleSignIn"
      >
        <svg class="size-5" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
        Continue with Google
      </button>
      <p
        v-if="googleError"
        data-test-id="signup-google-error"
        class="mt-2 text-center text-xs text-red-600"
      >
        {{ googleError }}
      </p>

      <!-- Divider -->
      <div class="my-6 flex items-center gap-3">
        <div class="h-px flex-1 bg-gray-200" />
        <span class="text-xs text-gray-400">or</span>
        <div class="h-px flex-1 bg-gray-200" />
      </div>

      <!-- Email/password form -->
      <form class="flex flex-col gap-3" @submit.prevent="handleSubmit">
        <div>
          <label for="signup-email" class="mb-1 block text-xs font-medium text-gray-700">
            Email
          </label>
          <input
            id="signup-email"
            v-model="email"
            type="email"
            data-test-id="signup-email-input"
            class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="you@company.com"
          />
        </div>
        <div>
          <label for="signup-password" class="mb-1 block text-xs font-medium text-gray-700">
            Password
          </label>
          <input
            id="signup-password"
            v-model="password"
            type="password"
            data-test-id="signup-password-input"
            class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="••••••••"
          />
        </div>
        <div>
          <label for="signup-confirm" class="mb-1 block text-xs font-medium text-gray-700">
            Confirm password
          </label>
          <input
            id="signup-confirm"
            v-model="confirmPassword"
            type="password"
            data-test-id="signup-confirm-input"
            class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="••••••••"
          />
        </div>

        <p
          v-if="error"
          data-test-id="signup-error"
          class="text-xs text-red-600"
        >
          {{ error }}
        </p>

        <button
          type="submit"
          data-test-id="signup-submit-button"
          class="mt-1 w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          :disabled="isSubmitting"
        >
          {{ isSubmitting ? 'Creating account...' : 'Create Account' }}
        </button>
      </form>

      <!-- Login link -->
      <p class="mt-6 text-center text-sm text-gray-500">
        Already have an account?
        <RouterLink
          to="/login"
          data-test-id="signup-login-link"
          class="font-medium text-blue-600 hover:text-blue-700"
        >
          Log in
        </RouterLink>
      </p>
    </div>
  </div>
</template>
```

- [ ] **Step 10.2: Commit**

```bash
git add src/views/SignupView.vue
git commit -m "feat: create signup page with email/password and Google OAuth"
```

---

### Task 11: Initialize Auth on App Load

**Files:**
- Modify: `src/main.ts`
- Modify: `src/App.vue`

- [ ] **Step 11.1: Update main.ts to initialize auth before mount**

The app needs to wait for auth initialization before rendering routes, to prevent flash of wrong content. We'll use an async init pattern:

Replace `src/main.ts` entirely:

```typescript
import { createPinia } from 'pinia'
import { createHead } from '@unhead/vue/client'
import { createApp } from 'vue'

import './app.css'
import { IS_TAURI } from '@/constants'
import { preloadFonts } from '@/engine/fonts'
import { useAuthStore } from '@/stores/auth'

import App from './App.vue'
import router from './router'

preloadFonts()

const pinia = createPinia()
const head = createHead()
const app = createApp(App)

app.use(pinia).use(router).use(head)

// Initialize auth store before mounting — prevents flash of unauthenticated content.
// Pinia must be installed via app.use(pinia) before calling useAuthStore().
const auth = useAuthStore()
auth.initialize().finally(() => {
  app.mount('#app')
})

if (!IS_TAURI) {
  void import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({ immediate: true })
  })
}
```

- [ ] **Step 11.2: Update App.vue with loading gate**

Replace `src/App.vue`:

```vue
<script setup lang="ts">
import { onMounted } from 'vue'
import { useHead } from '@unhead/vue'

import AppToast from '@/components/AppToast.vue'
import { APP_NAME } from '@/constants'
import { toast } from '@/composables/use-toast'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()

useHead({ titleTemplate: (title) => (title ? `${title} — ${APP_NAME}` : APP_NAME) })

onMounted(() => {
  toast.setupGlobalErrorHandler()
})
</script>

<template>
  <!-- Loading state: centered logo with pulse -->
  <div
    v-if="auth.isLoading"
    class="flex min-h-screen items-center justify-center bg-white"
  >
    <img
      src="/favicon-128.png"
      :alt="APP_NAME"
      class="size-12 animate-pulse rounded-xl"
    />
  </div>

  <!-- App ready -->
  <template v-else>
    <RouterView />
    <AppToast />
  </template>
</template>
```

- [ ] **Step 11.3: Commit**

```bash
git add src/main.ts src/App.vue
git commit -m "feat: initialize auth on app load with loading gate"
```

---

## Chunk 3: Phase 1.3 (Routing and Route Guards)

### Task 12: Define Route Structure and Guards (TDD)

**Files:**
- Modify: `src/router.ts`
- Modify: `src/router.d.ts`
- Create: `src/views/DashboardView.vue`
- Create: `src/views/OnboardingView.vue`
- Create: `tests/unit/router/guards.test.ts`

- [ ] **Step 12.1: Write failing guard tests**

Create `tests/unit/router/guards.test.ts`:

```typescript
import { describe, test, expect, beforeEach, mock } from 'bun:test'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'

// Mock auth store
let mockIsAuthenticated = false
let mockIsOnboarded = false
let mockIsLoading = false

mock.module('@/stores/auth', () => ({
  useAuthStore: () => ({
    isAuthenticated: mockIsAuthenticated,
    isOnboarded: mockIsOnboarded,
    isLoading: mockIsLoading
  })
}))

// Mock Supabase (to prevent import errors from auth store)
mock.module('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
    },
    from: () => ({ select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }) })
  }
}))

const { createAppRouter } = await import('@/router')

describe('navigation guards', () => {
  let router: ReturnType<typeof createRouter>

  beforeEach(() => {
    setActivePinia(createPinia())
    mockIsAuthenticated = false
    mockIsOnboarded = false
    mockIsLoading = false
    router = createAppRouter(createMemoryHistory())
  })

  test('redirects unauthenticated users to /login for protected routes', async () => {
    mockIsAuthenticated = false
    await router.push('/dashboard')
    expect(router.currentRoute.value.path).toBe('/login')
  })

  test('redirects authenticated users away from /login', async () => {
    mockIsAuthenticated = true
    mockIsOnboarded = true
    await router.push('/login')
    expect(router.currentRoute.value.path).toBe('/dashboard')
  })

  test('redirects authenticated users away from /signup', async () => {
    mockIsAuthenticated = true
    mockIsOnboarded = true
    await router.push('/signup')
    expect(router.currentRoute.value.path).toBe('/dashboard')
  })

  test('redirects non-onboarded users to /onboarding', async () => {
    mockIsAuthenticated = true
    mockIsOnboarded = false
    await router.push('/dashboard')
    expect(router.currentRoute.value.path).toBe('/onboarding')
  })

  test('redirects onboarded users away from /onboarding', async () => {
    mockIsAuthenticated = true
    mockIsOnboarded = true
    await router.push('/onboarding')
    expect(router.currentRoute.value.path).toBe('/dashboard')
  })

  test('allows access to /demo regardless of auth state', async () => {
    mockIsAuthenticated = false
    await router.push('/demo')
    expect(router.currentRoute.value.path).toBe('/demo')
  })

  test('redirects / to /dashboard for authenticated users', async () => {
    mockIsAuthenticated = true
    mockIsOnboarded = true
    await router.push('/')
    expect(router.currentRoute.value.path).toBe('/dashboard')
  })

  test('redirects / to /login for unauthenticated users', async () => {
    mockIsAuthenticated = false
    await router.push('/')
    expect(router.currentRoute.value.path).toBe('/login')
  })
})
```

- [ ] **Step 12.2: Run tests — verify they fail**

```bash
cd kova-open-pencil-1 && bun test tests/unit/router/guards.test.ts
```
Expected: FAIL — `createAppRouter` not exported.

- [ ] **Step 12.3: Update router.d.ts with extended RouteMeta**

Replace `src/router.d.ts`:

```typescript
import 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    demo?: boolean
    requiresAuth?: boolean
    publicOnly?: boolean
    requiresOnboarding?: boolean
  }
}
```

- [ ] **Step 12.4: Create placeholder views (parallel with guard implementation)**

Create `src/views/DashboardView.vue`:
```vue
<script setup lang="ts">
import { APP_NAME } from '@/constants'
</script>

<template>
  <div
    data-test-id="dashboard-view"
    class="flex min-h-screen items-center justify-center bg-white px-4"
  >
    <div class="text-center">
      <img src="/favicon-128.png" class="mx-auto mb-4 size-12 rounded-xl" :alt="APP_NAME" />
      <h1 class="text-xl font-semibold text-gray-900">Dashboard</h1>
      <p class="mt-2 text-sm text-gray-500">Coming in Milestone 2</p>
    </div>
  </div>
</template>
```

Create `src/views/OnboardingView.vue`:
```vue
<script setup lang="ts">
import { APP_NAME } from '@/constants'
</script>

<template>
  <div
    data-test-id="onboarding-view"
    class="flex min-h-screen items-center justify-center bg-white px-4"
  >
    <div class="text-center">
      <img src="/favicon-128.png" class="mx-auto mb-4 size-12 rounded-xl" :alt="APP_NAME" />
      <h1 class="text-xl font-semibold text-gray-900">Onboarding</h1>
      <p class="mt-2 text-sm text-gray-500">Coming in Milestone 3</p>
    </div>
  </div>
</template>
```

- [ ] **Step 12.5: Implement router.ts with guards**

Replace `src/router.ts`:

```typescript
import { createRouter, createWebHistory } from 'vue-router'

import { useAuthStore } from '@/stores/auth'

import type { Router, RouterHistory } from 'vue-router'

const LoginView = () => import('./views/LoginView.vue')
const SignupView = () => import('./views/SignupView.vue')
const DashboardView = () => import('./views/DashboardView.vue')
const OnboardingView = () => import('./views/OnboardingView.vue')
const EditorView = () => import('./views/EditorView.vue')

const routes = [
  {
    path: '/',
    redirect: () => {
      const auth = useAuthStore()
      return auth.isAuthenticated ? '/dashboard' : '/login'
    }
  },
  {
    path: '/login',
    component: LoginView,
    meta: { requiresAuth: false, publicOnly: true }
  },
  {
    path: '/signup',
    component: SignupView,
    meta: { requiresAuth: false, publicOnly: true }
  },
  {
    path: '/onboarding',
    component: OnboardingView,
    meta: { requiresAuth: true, requiresOnboarding: false }
  },
  {
    path: '/dashboard',
    component: DashboardView,
    meta: { requiresAuth: true, requiresOnboarding: true }
  },
  {
    path: '/editor/:canvasId',
    component: EditorView,
    meta: { requiresAuth: true, requiresOnboarding: true }
  },
  {
    path: '/demo',
    component: EditorView,
    meta: { demo: true, requiresAuth: false, publicOnly: false }
  }
]

export function createAppRouter(history?: RouterHistory): Router {
  const router = createRouter({
    history: history ?? createWebHistory(),
    routes
  })

  router.beforeEach((to) => {
    const auth = useAuthStore()

    // Allow demo route for everyone
    if (to.meta.demo) return true

    // Redirect authenticated users away from public-only pages
    if (to.meta.publicOnly && auth.isAuthenticated) {
      return '/dashboard'
    }

    // Redirect unauthenticated users to login
    if (to.meta.requiresAuth && !auth.isAuthenticated) {
      return '/login'
    }

    // Redirect non-onboarded users to onboarding
    if (to.meta.requiresOnboarding && !auth.isOnboarded) {
      return '/onboarding'
    }

    // Redirect onboarded users away from onboarding
    if (to.path === '/onboarding' && auth.isOnboarded) {
      return '/dashboard'
    }

    return true
  })

  return router
}

const router = createAppRouter()
export default router
```

- [ ] **Step 12.6: Run tests — verify they pass**

```bash
cd kova-open-pencil-1 && bun test tests/unit/router/guards.test.ts
```
Expected: PASS

- [ ] **Step 12.7: Commit**

```bash
git add src/router.ts src/router.d.ts src/views/DashboardView.vue src/views/OnboardingView.vue tests/unit/router/guards.test.ts
git commit -m "feat: add routes, navigation guards, and placeholder views"
```

---

## Chunk 4: Update index.html Loader + Build Verification + Final Commit

### Task 13: Update index.html Loader for Light Theme

**Files:**
- Modify: `index.html`

The current loader has a dark background (#1e1e1e). Since the first page users see is now login (light theme), the loader should be light too — to prevent a dark flash before the white login page.

- [ ] **Step 13.1: Update loader styles**

In `index.html`, change the loader background from dark to white:

Line 13: `body { margin: 0; background: #ffffff; }`
Line 21: `background: #ffffff;`

Change the loader icon and bar colors for light theme:
- SVG `style="color: white"` → `style="color: #4F6EF7"` (Kova blue)
- Bar background: `rgba(255,255,255,0.08)` → `rgba(0,0,0,0.06)`
- Bar fill: `rgba(255,255,255,0.25)` → `rgba(79,110,247,0.4)` (Kova blue tint)

Line 10: `<meta name="theme-color" content="#ffffff" />`

- [ ] **Step 13.2: Commit**

```bash
git add index.html
git commit -m "feat: update loader to light theme with Kova brand colors"
```

---

### Task 14: Build Verification

- [ ] **Step 14.1: Run type check and lint**

```bash
cd kova-open-pencil-1 && bun run check
```
Expected: No errors.

- [ ] **Step 14.2: Run all unit tests**

```bash
cd kova-open-pencil-1 && bun test tests/unit/
```
Expected: All pass.

- [ ] **Step 14.3: Run production build**

```bash
cd kova-open-pencil-1 && bun run build
```
Expected: Build succeeds.

- [ ] **Step 14.4: Visual smoke test**

```bash
cd kova-open-pencil-1 && bun run dev
```

Verify:
- Browser tab shows "Kova" title and Kova favicon
- Navigating to `/` redirects to `/login` (since not authenticated)
- Login page has white background, Kova logo, Google button, email/password form
- No "OpenPencil" text visible
- `/demo` still works (shows editor with demo shapes)
- Code tab hidden in properties panel
- Variables section hidden in design panel
- JSX copy hidden in context menu

- [ ] **Step 14.5: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address build verification issues"
```

---

## Summary of Parallelism

Tasks that can run in parallel (independent of each other):
- **Chunk 1:** Tasks 1-5 are all independent (constants, metadata, text, icons, feature hiding)
- **Chunk 2:** Tasks 9 + 10 (Login + Signup) are parallel after Task 7 (auth store)
- **Chunk 2:** Task 8 (migration) is independent of Tasks 9-11

Strict dependencies:
- Task 0 (prerequisites) → everything else
- Task 6 (supabase client) → Task 7 (auth store) → Tasks 9-11
- Task 7 (auth store) → Task 12 (router guards)
- Task 12 (router) → Task 13 (loader update)
- All tasks → Task 14 (verification)

```
Task 0 (prereqs)
├── Task 1 (constants) ──────────────────────────────┐
├── Task 2 (metadata) ──────────────────────────────┤
├── Task 3 (text rebrand) ──────────────────────────┤
├── Task 4 (icons) ─────────────────────────────────┤
├── Task 5 (feature hiding) ────────────────────────┤
├── Task 6 (supabase client) ──→ Task 7 (auth store)┤
│                                  ├── Task 9 (login)┤
│                                  ├── Task 10 (signup)
│                                  ├── Task 11 (app init)
│                                  └── Task 12 (router + guards + placeholders)
├── Task 8 (migration) ────────────────────────────┤
│                                                     │
│                                   Task 13 (loader) ┤
│                                                     │
└───────────────────────── Task 14 (verification) ───┘
```
