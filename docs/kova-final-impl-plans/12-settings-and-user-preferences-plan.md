# PRD 12 — Settings / Accessibility / User Preferences — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the two-layer user-preferences architecture (Layer 1 = `users.preferences` JSONB via `update_user_pref` RPC + `usePreferencesStore`; Layer 2 = localStorage via `useUIStateStore`) plus the three Accessibility controls (Text size / Reduce motion / High contrast) and two Notification toggles (Product updates / Sync alerts) rendered both inside the Profile section of `/account/profile` and as the A8.3 main-menu Preferences modal — one component, two surfaces, apply-immediately, 1-second debounced server write.

**Architecture:** Vue 3 + Pinia + VueUse on top of Supabase Postgres JSONB. Single `update_user_pref(p_path text[], p_value jsonb)` RPC writes via `jsonb_set(create_missing := true)`, SECURITY INVOKER, gated by the existing `users` table RLS (`auth.uid() = id`). Pinia store performs optimistic local updates (immutable copy + structuredClone), debounces server writes via VueUse `useDebounceFn(1000)`, applies state to `<html data-text-size | data-reduce-motion | data-high-contrast>` so a small CSS layer (`accessibility.css`) flips global tokens without re-render. One reusable `<AccessibilityPanel>` mounts inside Cluster 04's Profile section AND inside `<PreferencesModal>` (singleton open-state composable). `users.preferences jsonb` column itself ships in Cluster 01 — this plan only adds the RPC and the consuming UI.

**Tech Stack:** Vue 3 (Composition API, `<script setup lang="ts">`), Pinia setup stores, VueUse (`useLocalStorage`, `useDebounceFn`), Tailwind CSS 4 utility classes only, Reka UI primitives via Cluster 11's `<KovaModal>` / `<KovaSegmented>` / `<KovaToggle>` / `<KovaButton>`, `@supabase/supabase-js`, `bun:test` for units, Playwright for E2E. No Zod. No React. No new tables. No Edge Functions.

**PRD reference:** `/Users/jihoyang/kova-main/kova-open-pencil-1/docs/kova-final-prds/12-settings-and-user-preferences.md`

**Branch:** `feat/m9-shopify` (active feature branch — Cluster 12 commits cascade onto current M9 work alongside Cluster 04).

---

## File structure

### Backend (migrations only)

| File | Purpose |
|---|---|
| `supabase/migrations/20260603_12_user_preferences_rpc.sql` | `update_user_pref(p_path text[], p_value jsonb)` SECURITY INVOKER RPC + GRANT to `authenticated`. Pairs with Cluster 01's `users.preferences` column. [PRD §4.1 + §5.2] |

### Frontend — types

| File | Purpose |
|---|---|
| `src/types/preferences.ts` | NEW — `TextSize` type, `UserPreferences` interface, `DEFAULTS` constant, `mergeWithDefaults` defensive parser, per-group validators. Single source of truth on Layer 1 shape. [PRD Appendix A] |

### Frontend — stores

| File | Purpose |
|---|---|
| `src/stores/preferences.ts` | NEW — `usePreferencesStore` (Layer 1 server-synced). `load()`, `set(key, value)`, `setPath(path, value)`, debounced RPC write, `applyToDom`, `hasExplicitAccessibilityKey`. [PRD §6.2.1] |
| `src/stores/ui-state.ts` | NEW — `useUIStateStore` (Layer 2 device-local). 9 VueUse `useLocalStorage` slots + `pushRecentColor`, `dismissToast` helpers. [PRD §6.2.2] |

### Frontend — composables

| File | Purpose |
|---|---|
| `src/composables/use-preferences.ts` | NEW — `usePreference<K>(key)` + `usePreferencePath<T>(path)` writable computed wrappers around store. [PRD §6.3.1] |
| `src/composables/use-preferences-modal.ts` | NEW — `usePreferencesModal()` module-singleton open/close + mode state. [PRD §6.3.2] |
| `src/composables/use-reduced-motion-default.ts` | NEW — `applyReducedMotionDefault()` one-shot OS-cue tick on first load. [PRD §6.3.3] |

### Frontend — components

| File | Purpose |
|---|---|
| `src/components/settings/AccessibilityPanel.vue` | NEW — three controls (Text size segmented, Reduce motion toggle, High contrast toggle). Mounted both inside Profile section and inside `<PreferencesModal>`. [PRD §6.4.1] |
| `src/components/settings/NotificationsPanel.vue` | NEW — two toggles (Product updates, Sync alerts). Mounted only inside Profile section. [PRD §6.4.2] |
| `src/components/settings/PreferencesModal.vue` | NEW — A8.3 modal wrapping `<AccessibilityPanel>`. Singleton instance mounted in app shell. [PRD §6.4.3] |

### Frontend — styles + bootstrap

| File | Purpose |
|---|---|
| `src/styles/accessibility.css` | NEW — CSS layer with `[data-text-size]`, `[data-reduce-motion]`, `[data-high-contrast]` selectors driving `--text-base`, transition overrides, contrast overrides. [PRD §3.3] |
| `src/app.css` | MODIFY — `@import './styles/accessibility.css'`. |
| `src/main.ts` | MODIFY — call `usePreferencesStore().load()` after auth state resolves; mount `<PreferencesModal>` globally inside the app shell layout. [PRD §10 Phase A] |

### Tests

| File | Purpose |
|---|---|
| `tests/types/preferences.test.ts` | NEW — `mergeWithDefaults` matrix; validators. [PRD §9.1] |
| `tests/stores/preferences.test.ts` | NEW — load/set/setPath/debounce/applyToDom/hasExplicitAccessibilityKey. [PRD §9.1] |
| `tests/stores/ui-state.test.ts` | NEW — `pushRecentColor` dedupe + cap, `dismissToast` idempotent, key prefixes. [PRD §9.1] |
| `tests/composables/use-preferences.test.ts` | NEW — writable computed round-trip via store. [PRD §9.1] |
| `tests/composables/use-reduced-motion-default.test.ts` | NEW — OS cue applies only when no explicit key + matchMedia matches. [PRD §9.1] |
| `tests/integration/preferences-rpc.test.ts` | NEW — `update_user_pref` against local Supabase. RLS denies cross-user + anon. `create_missing := true` deep write. [PRD §9.2] |
| `tests/e2e/preferences.spec.ts` | NEW — Profile/Modal sync, reload persistence, cross-tab, OS reduce-motion first-boot tick. [PRD §9.3] |

### Docs

| File | Purpose |
|---|---|
| `docs/kova-final-prds/00-PRD_SCOPE_PLAN.md` | MODIFY — bump Cluster 12 row in §7 to `IN-DRAFT` / `IN-REVIEW` after PRD founder review. |
| `docs/kova-final-prds/00a-PRD_AUTHORING_GUIDE.md` | MODIFY — bump Cluster 12 tracker row with author + date. |
| `docs/legal/privacy-policy.md` | MODIFY — append one-line preference-storage disclosure (Cluster 01 owns file; this PRD ships the line). [PRD §5.5] |

---

## Pre-flight assumptions

Before Task 1, verify:

- `git status` clean on `feat/m9-shopify`, OR working changes are unrelated to the files in this plan.
- Cluster 01 migration `20260520_01_users_account_lifecycle.sql` is **merged or staged for the same release** — `users.preferences jsonb NOT NULL DEFAULT '{}'::jsonb` MUST exist before this plan's RPC migration runs. If not present locally, the plan still authors files but Task 1 step "run migration locally" will fail until Cluster 01 lands. Coordinate with Cluster 01 implementer.
- Cluster 11 primitives (`KovaModal`, `KovaSegmented`, `KovaToggle`, `KovaButton`, `useToast`) exist in `src/components/ui/` AND in `src/composables/use-toast.ts`. If not (Cluster 11 PRD still PENDING), Task 10–12 are blocked until they ship. Workaround: shim minimal versions in this plan as Task 10a / 11a / 12a; remove and import properly when Cluster 11 lands. Decision: defer Tasks 10–12 until Cluster 11 merges. Tasks 1–9 + 13–15 are unblocked.
- Bun + Vite + Playwright already installed (per `bun install` in `kova-open-pencil-1/`).

---

## Task 1: SQL migration — `update_user_pref` RPC

**Files:**
- Create: `supabase/migrations/20260603_12_user_preferences_rpc.sql`
- Test: `tests/integration/preferences-rpc.test.ts` (extended in Task 6 — initial smoke here)

- [ ] **Step 1: Write the migration file**

Create `supabase/migrations/20260603_12_user_preferences_rpc.sql`:

```sql
-- ============================================================
-- Migration 20260603_12_user_preferences_rpc
-- Cluster 12 Settings / Accessibility / User Preferences
-- Pairs with: 20260520_01_users_account_lifecycle.sql (ships users.preferences column)
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.update_user_pref(p_path text[], p_value jsonb)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  UPDATE public.users
     SET preferences = jsonb_set(preferences, p_path, p_value, true)
   WHERE id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.update_user_pref(text[], jsonb) TO authenticated;

COMMENT ON FUNCTION public.update_user_pref IS
  'Cluster 12 partial pref update. p_path = JSONB key sequence. p_value = JSON-encoded value. SECURITY INVOKER — RLS on users table enforces auth.uid() = id.';

COMMIT;
```

- [ ] **Step 2: Apply migration locally + verify it landed**

Run from `kova-open-pencil-1/`:

```bash
bunx supabase db reset --debug
# OR if no reset is desired:
bunx supabase migration up
```

Expected: migration runs without error. If Cluster 01 migration not yet applied, you'll see `column users.preferences does not exist` when the RPC is invoked — that's fine for now; the function itself creates because it only references `preferences` lazily (Postgres validates the body's column refs against catalog at call time for `LANGUAGE sql`, but check by calling — see Step 3).

- [ ] **Step 3: Smoke the RPC against the local DB**

Run a quick psql check against the local Supabase shadow DB to confirm the function exists and is grantable:

```bash
bunx supabase db dump --data-only=false --schema=public | grep -A2 "FUNCTION public.update_user_pref"
```

Expected: function definition appears in dump.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260603_12_user_preferences_rpc.sql
git commit -m "feat(prefs): add update_user_pref RPC for partial JSONB writes

Cluster 12. SECURITY INVOKER — relies on the users-table RLS
(auth.uid() = id) shipped in Cluster 01. Uses jsonb_set with
create_missing := true so deep first-writes succeed."
```

---

## Task 2: `UserPreferences` type + `DEFAULTS` + `mergeWithDefaults`

**Files:**
- Create: `src/types/preferences.ts`
- Test: `tests/types/preferences.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/types/preferences.test.ts`:

```typescript
import { describe, expect, test } from 'bun:test'
import { DEFAULTS, mergeWithDefaults, type UserPreferences } from '@/types/preferences'

describe('mergeWithDefaults', () => {
  test('empty input returns exact DEFAULTS clone', () => {
    const merged = mergeWithDefaults({}, DEFAULTS)
    expect(merged).toEqual(DEFAULTS)
    expect(merged).not.toBe(DEFAULTS)
    expect(merged.accessibility).not.toBe(DEFAULTS.accessibility)
  })

  test('null input returns DEFAULTS clone', () => {
    const merged = mergeWithDefaults(null, DEFAULTS)
    expect(merged).toEqual(DEFAULTS)
  })

  test('partial server blob honors set keys, defaults the rest', () => {
    const merged = mergeWithDefaults(
      { accessibility: { textSize: 'large' } },
      DEFAULTS,
    )
    expect(merged.accessibility.textSize).toBe('large')
    expect(merged.accessibility.reduceMotion).toBe(false)
    expect(merged.accessibility.highContrast).toBe(false)
    expect(merged.view).toEqual(DEFAULTS.view)
  })

  test('extra unknown top-level key is dropped', () => {
    const merged = mergeWithDefaults(
      { junk: { hostile: true }, accessibility: { textSize: 'small' } },
      DEFAULTS,
    )
    expect((merged as unknown as Record<string, unknown>).junk).toBeUndefined()
    expect(merged.accessibility.textSize).toBe('small')
  })

  test('type-mismatched value falls back to default for that key only', () => {
    const merged = mergeWithDefaults(
      { accessibility: { textSize: 42, reduceMotion: true } },
      DEFAULTS,
    )
    expect(merged.accessibility.textSize).toBe('medium')
    expect(merged.accessibility.reduceMotion).toBe(true)
  })

  test('textSize accepts only "small" | "medium" | "large"', () => {
    const merged = mergeWithDefaults(
      { accessibility: { textSize: 'normal' } },
      DEFAULTS,
    )
    expect(merged.accessibility.textSize).toBe('medium')
  })

  test('defaults.zoomLevel must be > 0', () => {
    const merged = mergeWithDefaults(
      { defaults: { zoomLevel: -5 } },
      DEFAULTS,
    )
    expect(merged.defaults.zoomLevel).toBe(1)
  })

  test('showLayoutGuide default is true (Figma-exact per Q24)', () => {
    expect(DEFAULTS.view.showLayoutGuide).toBe(true)
  })

  test('all notification defaults are true', () => {
    expect(DEFAULTS.notifications.productUpdates).toBe(true)
    expect(DEFAULTS.notifications.syncAlerts).toBe(true)
  })

  test('Layer 1 shape covers all 7 groups', () => {
    const groups: Array<keyof UserPreferences> = [
      'accessibility',
      'ai',
      'view',
      'snap',
      'defaults',
      'notifications',
    ]
    for (const g of groups) expect(DEFAULTS[g]).toBeDefined()
  })
})
```

- [ ] **Step 2: Run the test — expect FAIL**

```bash
bun run test:unit tests/types/preferences.test.ts
```

Expected: `Cannot find module '@/types/preferences'` or similar.

- [ ] **Step 3: Implement `src/types/preferences.ts`**

```typescript
export type TextSize = 'small' | 'medium' | 'large'

export interface UserPreferences {
  accessibility: {
    textSize: TextSize
    reduceMotion: boolean
    highContrast: boolean
  }
  ai: {
    showTextSuggestions: boolean
  }
  view: {
    showRuler: boolean
    showLayoutGuide: boolean
    showPixelGrid: boolean
    showFrameOutlines: boolean
    showSlices: boolean
    showMaskOutlines: boolean
  }
  snap: {
    snapToGrid: boolean
    snapToGuides: boolean
    snapToObjects: boolean
  }
  defaults: {
    zoomLevel: number
    fontFamily: string
  }
  notifications: {
    productUpdates: boolean
    syncAlerts: boolean
  }
}

export const DEFAULTS: UserPreferences = {
  accessibility: { textSize: 'medium', reduceMotion: false, highContrast: false },
  ai: { showTextSuggestions: true },
  view: {
    showRuler: false,
    showLayoutGuide: true,
    showPixelGrid: false,
    showFrameOutlines: false,
    showSlices: false,
    showMaskOutlines: false,
  },
  snap: { snapToGrid: true, snapToGuides: true, snapToObjects: true },
  defaults: { zoomLevel: 1, fontFamily: 'Inter' },
  notifications: { productUpdates: true, syncAlerts: true },
}

const TEXT_SIZES: ReadonlyArray<TextSize> = ['small', 'medium', 'large'] as const

function isAccessibilityValid(k: string, v: unknown): boolean {
  if (k === 'textSize') return typeof v === 'string' && (TEXT_SIZES as readonly string[]).includes(v)
  if (k === 'reduceMotion' || k === 'highContrast') return typeof v === 'boolean'
  return false
}
function isAIValid(k: string, v: unknown): boolean {
  return k === 'showTextSuggestions' && typeof v === 'boolean'
}
function isViewValid(_k: string, v: unknown): boolean {
  return typeof v === 'boolean'
}
function isSnapValid(_k: string, v: unknown): boolean {
  return typeof v === 'boolean'
}
function isDefaultsValid(k: string, v: unknown): boolean {
  if (k === 'zoomLevel') return typeof v === 'number' && v > 0
  if (k === 'fontFamily') return typeof v === 'string' && v.length > 0
  return false
}
function isNotificationsValid(_k: string, v: unknown): boolean {
  return typeof v === 'boolean'
}

function mergeGroup<T extends Record<string, unknown>>(
  raw: unknown,
  fallback: T,
  isValidKey: (k: string, v: unknown) => boolean,
): T {
  if (!raw || typeof raw !== 'object') return structuredClone(fallback)
  const out: Record<string, unknown> = structuredClone(fallback)
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (k in fallback && isValidKey(k, v)) out[k] = v
  }
  return out as T
}

export function mergeWithDefaults(
  partial: unknown,
  defaults: UserPreferences,
): UserPreferences {
  if (!partial || typeof partial !== 'object') return structuredClone(defaults)
  const p = partial as Record<string, unknown>
  return {
    accessibility: mergeGroup(p.accessibility, defaults.accessibility, isAccessibilityValid),
    ai: mergeGroup(p.ai, defaults.ai, isAIValid),
    view: mergeGroup(p.view, defaults.view, isViewValid),
    snap: mergeGroup(p.snap, defaults.snap, isSnapValid),
    defaults: mergeGroup(p.defaults, defaults.defaults, isDefaultsValid),
    notifications: mergeGroup(p.notifications, defaults.notifications, isNotificationsValid),
  }
}
```

- [ ] **Step 4: Run the test — expect PASS**

```bash
bun run test:unit tests/types/preferences.test.ts
```

Expected: 10 tests pass.

- [ ] **Step 5: Run lint + type-check**

```bash
bun run check
```

Expected: zero errors.

- [ ] **Step 6: Commit**

```bash
git add src/types/preferences.ts tests/types/preferences.test.ts
git commit -m "feat(prefs): UserPreferences shape + DEFAULTS + mergeWithDefaults

Cluster 12 Layer 1 type contract. Defensive parser falls back
key-by-key on type mismatch. Per-group validators enforce the
TextSize union + zoomLevel positivity."
```

---

## Task 3: `useUIStateStore` (Layer 2 — localStorage)

**Files:**
- Create: `src/stores/ui-state.ts`
- Test: `tests/stores/ui-state.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/stores/ui-state.test.ts`:

```typescript
import { beforeEach, describe, expect, test } from 'bun:test'
import { createPinia, setActivePinia } from 'pinia'
import { useUIStateStore } from '@/stores/ui-state'

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
})

describe('useUIStateStore', () => {
  test('defaults are correct', () => {
    const s = useUIStateStore()
    expect(s.pagesCollapsed).toBe(false)
    expect(s.layersCollapsed).toBe(false)
    expect(s.sidebarLeftWidth).toBe(240)
    expect(s.sidebarRightWidth).toBe(264)
    expect(s.recentColors).toEqual([])
    expect(s.lastActiveBrandId).toBeNull()
    expect(s.lastActiveCanvasId).toBeNull()
    expect(s.dismissedToasts).toEqual([])
  })

  test('pushRecentColor adds at head', () => {
    const s = useUIStateStore()
    s.pushRecentColor('#ff00aa')
    expect(s.recentColors).toEqual(['#ff00aa'])
  })

  test('pushRecentColor dedupes case-insensitively', () => {
    const s = useUIStateStore()
    s.pushRecentColor('#FF00AA')
    s.pushRecentColor('#ff00aa')
    expect(s.recentColors).toEqual(['#ff00aa'])
  })

  test('pushRecentColor caps at 24 with FIFO eviction', () => {
    const s = useUIStateStore()
    for (let i = 0; i < 30; i++) {
      s.pushRecentColor(`#${i.toString(16).padStart(6, '0')}`)
    }
    expect(s.recentColors.length).toBe(24)
    expect(s.recentColors[0]).toBe('#00001d')
    expect(s.recentColors[23]).toBe('#000006')
  })

  test('dismissToast is idempotent', () => {
    const s = useUIStateStore()
    s.dismissToast('confetti-2026')
    s.dismissToast('confetti-2026')
    expect(s.dismissedToasts).toEqual(['confetti-2026'])
  })

  test('all localStorage keys prefixed kova:ui:', () => {
    const s = useUIStateStore()
    s.pagesCollapsed = true
    s.pushRecentColor('#abc123')
    s.lastActiveBrandId = 'brand-1'
    const keys = Object.keys(localStorage)
    for (const k of keys) {
      expect(k.startsWith('kova:ui:')).toBe(true)
    }
  })
})
```

- [ ] **Step 2: Run the test — expect FAIL**

```bash
bun run test:unit tests/stores/ui-state.test.ts
```

Expected: `Cannot find module '@/stores/ui-state'`.

- [ ] **Step 3: Implement `src/stores/ui-state.ts`**

```typescript
import { defineStore } from 'pinia'
import { useLocalStorage } from '@vueuse/core'

export const useUIStateStore = defineStore('ui-state', () => {
  const pagesCollapsed = useLocalStorage<boolean>('kova:ui:pages-collapsed', false)
  const layersCollapsed = useLocalStorage<boolean>('kova:ui:layers-collapsed', false)
  const sidebarLeftWidth = useLocalStorage<number>('kova:ui:sidebar-left-width', 240)
  const sidebarRightWidth = useLocalStorage<number>('kova:ui:sidebar-right-width', 264)
  const recentColors = useLocalStorage<string[]>('kova:ui:recent-colors', [])
  const lastActiveBrandId = useLocalStorage<string | null>('kova:ui:last-brand', null)
  const lastActiveCanvasId = useLocalStorage<string | null>('kova:ui:last-canvas', null)
  const dismissedToasts = useLocalStorage<string[]>('kova:ui:dismissed-toasts', [])

  function pushRecentColor(hex: string): void {
    const next = hex.toLowerCase()
    const filtered = recentColors.value.filter((c) => c.toLowerCase() !== next)
    recentColors.value = [next, ...filtered].slice(0, 24)
  }

  function dismissToast(toastId: string): void {
    if (dismissedToasts.value.includes(toastId)) return
    dismissedToasts.value = [...dismissedToasts.value, toastId]
  }

  return {
    pagesCollapsed,
    layersCollapsed,
    sidebarLeftWidth,
    sidebarRightWidth,
    recentColors,
    lastActiveBrandId,
    lastActiveCanvasId,
    dismissedToasts,
    pushRecentColor,
    dismissToast,
  }
})
```

- [ ] **Step 4: Run the test — expect PASS**

```bash
bun run test:unit tests/stores/ui-state.test.ts
```

Expected: 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/stores/ui-state.ts tests/stores/ui-state.test.ts
git commit -m "feat(prefs): useUIStateStore Pinia for Layer 2 device-local prefs

8 VueUse useLocalStorage slots + pushRecentColor (case-insensitive
dedupe, FIFO cap 24) + idempotent dismissToast. All keys prefixed
kova:ui:."
```

---

## Task 4: `usePreferencesStore` (Layer 1 — server-synced)

**Files:**
- Create: `src/stores/preferences.ts`
- Test: `tests/stores/preferences.test.ts`

> **Pattern:** Pinia + VueUse `useDebounceFn` + Supabase client. Test uses a stub Supabase client (no live DB). Integration against the real RPC happens in Task 6.

- [ ] **Step 1: Write the failing test**

Create `tests/stores/preferences.test.ts`:

```typescript
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import { createPinia, setActivePinia } from 'pinia'
import { usePreferencesStore } from '@/stores/preferences'
import { DEFAULTS } from '@/types/preferences'

let rpcCalls: Array<{ name: string; args: unknown }> = []
let mockedRow: { preferences: unknown } | null = { preferences: {} }

mock.module('@/lib/supabase', () => ({
  supabase: {
    from: (_t: string) => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: mockedRow, error: null }),
        }),
      }),
    }),
    rpc: async (name: string, args: unknown) => {
      rpcCalls.push({ name, args })
      return { error: null }
    },
  },
}))

mock.module('@/stores/auth', () => ({
  useAuthStore: () => ({ userId: 'user-42' }),
}))

beforeEach(() => {
  setActivePinia(createPinia())
  rpcCalls = []
  mockedRow = { preferences: {} }
  document.documentElement.removeAttribute('data-text-size')
  document.documentElement.removeAttribute('data-reduce-motion')
  document.documentElement.removeAttribute('data-high-contrast')
})

afterEach(() => {
  mock.restore()
})

describe('usePreferencesStore', () => {
  test('load with empty server blob falls back to DEFAULTS', async () => {
    mockedRow = { preferences: {} }
    const store = usePreferencesStore()
    await store.load()
    expect(store.prefs).toEqual(DEFAULTS)
    expect(store.loaded).toBe(true)
  })

  test('load applies DOM data attributes', async () => {
    mockedRow = {
      preferences: {
        accessibility: { textSize: 'large', reduceMotion: true, highContrast: false },
      },
    }
    const store = usePreferencesStore()
    await store.load()
    expect(document.documentElement.dataset.textSize).toBe('large')
    expect(document.documentElement.dataset.reduceMotion).toBe('true')
    expect(document.documentElement.dataset.highContrast).toBe('false')
  })

  test('set produces immutable update', async () => {
    const store = usePreferencesStore()
    await store.load()
    const before = store.prefs
    store.set('accessibility', { textSize: 'large', reduceMotion: false, highContrast: false })
    expect(store.prefs).not.toBe(before)
    expect(store.prefs.accessibility.textSize).toBe('large')
  })

  test('set triggers exactly one RPC call within 1 s debounce window', async () => {
    const store = usePreferencesStore()
    await store.load()
    store.set('accessibility', { textSize: 'small', reduceMotion: false, highContrast: false })
    store.set('accessibility', { textSize: 'large', reduceMotion: false, highContrast: false })
    expect(rpcCalls.length).toBe(0)  // still in debounce window
    await new Promise((r) => setTimeout(r, 1100))
    expect(rpcCalls.length).toBe(1)
    expect(rpcCalls[0].args).toEqual({
      p_path: ['accessibility'],
      p_value: JSON.stringify({ textSize: 'large', reduceMotion: false, highContrast: false }),
    })
  })

  test('setPath writes the specific slice only', async () => {
    const store = usePreferencesStore()
    await store.load()
    store.setPath(['view', 'showRuler'], true)
    await new Promise((r) => setTimeout(r, 1100))
    expect(rpcCalls[0].args).toEqual({
      p_path: ['view', 'showRuler'],
      p_value: JSON.stringify(true),
    })
    expect(store.prefs.view.showRuler).toBe(true)
    expect(store.prefs.view.showLayoutGuide).toBe(true)  // untouched default
  })

  test('hasExplicitAccessibilityKey reports server-supplied keys', async () => {
    mockedRow = {
      preferences: {
        accessibility: { textSize: 'small' },
      },
    }
    const store = usePreferencesStore()
    await store.load()
    expect(store.hasExplicitAccessibilityKey('textSize')).toBe(true)
    expect(store.hasExplicitAccessibilityKey('reduceMotion')).toBe(false)
  })
})
```

- [ ] **Step 2: Run the test — expect FAIL**

```bash
bun run test:unit tests/stores/preferences.test.ts
```

Expected: missing module errors.

- [ ] **Step 3: Implement `src/stores/preferences.ts`**

```typescript
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { DEFAULTS, mergeWithDefaults, type UserPreferences } from '@/types/preferences'

export const usePreferencesStore = defineStore('preferences', () => {
  const prefs = ref<UserPreferences>(structuredClone(DEFAULTS))
  const loaded = ref(false)
  const loadError = ref<Error | null>(null)
  const explicitAccessibilityKeys = ref<Set<string>>(new Set())

  async function load(): Promise<void> {
    const auth = useAuthStore()
    if (!auth.userId) {
      prefs.value = structuredClone(DEFAULTS)
      loaded.value = true
      applyToDom(prefs.value)
      return
    }
    const { data, error } = await supabase
      .from('users')
      .select('preferences')
      .eq('id', auth.userId)
      .single()
    if (error) {
      loadError.value = error as unknown as Error
      loaded.value = true
      applyToDom(prefs.value)
      return
    }
    const raw = (data?.preferences ?? {}) as Record<string, unknown>
    const rawAccessibility = (raw.accessibility ?? {}) as Record<string, unknown>
    explicitAccessibilityKeys.value = new Set(Object.keys(rawAccessibility))
    prefs.value = mergeWithDefaults(raw, DEFAULTS)
    loaded.value = true
    applyToDom(prefs.value)
  }

  const debouncedWrite = useDebounceFn(
    async (path: string[], value: unknown): Promise<void> => {
      const { error } = await supabase.rpc('update_user_pref', {
        p_path: path,
        p_value: JSON.stringify(value),
      })
      if (error) loadError.value = error as unknown as Error
    },
    1000,
  )

  function set<K extends keyof UserPreferences>(key: K, value: UserPreferences[K]): void {
    prefs.value = { ...prefs.value, [key]: structuredClone(value) }
    applyToDom(prefs.value)
    debouncedWrite([key as string], value)
  }

  function setPath(path: string[], value: unknown): void {
    prefs.value = setIn(prefs.value, path, value) as UserPreferences
    applyToDom(prefs.value)
    debouncedWrite(path, value)
  }

  function hasExplicitAccessibilityKey(key: string): boolean {
    return explicitAccessibilityKeys.value.has(key)
  }

  function applyToDom(p: UserPreferences): void {
    if (typeof document === 'undefined') return
    const html = document.documentElement
    html.dataset.textSize = p.accessibility.textSize
    html.dataset.reduceMotion = String(p.accessibility.reduceMotion)
    html.dataset.highContrast = String(p.accessibility.highContrast)
  }

  const accessibility = computed(() => prefs.value.accessibility)
  const view = computed(() => prefs.value.view)
  const notifications = computed(() => prefs.value.notifications)
  const ai = computed(() => prefs.value.ai)
  const snap = computed(() => prefs.value.snap)
  const defaults = computed(() => prefs.value.defaults)

  return {
    prefs,
    loaded,
    loadError,
    accessibility,
    view,
    notifications,
    ai,
    snap,
    defaults,
    load,
    set,
    setPath,
    hasExplicitAccessibilityKey,
  }
})

function setIn<T>(obj: T, path: string[], value: unknown): T {
  if (path.length === 0) return value as T
  const [head, ...rest] = path
  const current = ((obj as Record<string, unknown>)[head] ?? {}) as Record<string, unknown>
  return {
    ...(obj as Record<string, unknown>),
    [head]: setIn(current, rest, value),
  } as T
}
```

- [ ] **Step 4: Run the test — expect PASS**

```bash
bun run test:unit tests/stores/preferences.test.ts
```

Expected: 6 tests pass.

- [ ] **Step 5: Run lint + type-check**

```bash
bun run check
```

Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/stores/preferences.ts tests/stores/preferences.test.ts
git commit -m "feat(prefs): usePreferencesStore with debounced RPC writes

Cluster 12 Layer 1. load() merges server blob with DEFAULTS,
records explicit-key set for OS-cue logic. set + setPath perform
optimistic immutable updates and queue a 1-second debounced RPC.
applyToDom mirrors accessibility state to <html data-*> for the
CSS layer."
```

---

## Task 5: `use-preferences` composable (writable computed wrappers)

**Files:**
- Create: `src/composables/use-preferences.ts`
- Test: `tests/composables/use-preferences.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/composables/use-preferences.test.ts`:

```typescript
import { beforeEach, describe, expect, mock, test } from 'bun:test'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { usePreferencesStore } from '@/stores/preferences'
import { usePreference, usePreferencePath } from '@/composables/use-preferences'

mock.module('@/lib/supabase', () => ({
  supabase: {
    from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { preferences: {} }, error: null }) }) }) }),
    rpc: async () => ({ error: null }),
  },
}))
mock.module('@/stores/auth', () => ({ useAuthStore: () => ({ userId: 'u1' }) }))

beforeEach(() => setActivePinia(createPinia()))

describe('usePreference / usePreferencePath', () => {
  test('top-level: get reads store, set writes via store.set', async () => {
    const store = usePreferencesStore()
    await store.load()
    const accessibility = usePreference('accessibility')
    expect(accessibility.value.textSize).toBe('medium')
    accessibility.value = { textSize: 'large', reduceMotion: true, highContrast: false }
    await nextTick()
    expect(store.prefs.accessibility.textSize).toBe('large')
    expect(store.prefs.accessibility.reduceMotion).toBe(true)
  })

  test('path: round-trip on nested boolean', async () => {
    const store = usePreferencesStore()
    await store.load()
    const showRuler = usePreferencePath<boolean>(['view', 'showRuler'])
    expect(showRuler.value).toBe(false)
    showRuler.value = true
    await nextTick()
    expect(store.prefs.view.showRuler).toBe(true)
  })

  test('path: round-trip on TextSize enum', async () => {
    const store = usePreferencesStore()
    await store.load()
    const textSize = usePreferencePath<'small' | 'medium' | 'large'>(['accessibility', 'textSize'])
    textSize.value = 'small'
    await nextTick()
    expect(store.prefs.accessibility.textSize).toBe('small')
  })
})
```

- [ ] **Step 2: Run the test — expect FAIL**

```bash
bun run test:unit tests/composables/use-preferences.test.ts
```

Expected: missing module.

- [ ] **Step 3: Implement `src/composables/use-preferences.ts`**

```typescript
import { computed, type WritableComputedRef } from 'vue'
import { usePreferencesStore } from '@/stores/preferences'
import type { UserPreferences } from '@/types/preferences'

export function usePreference<K extends keyof UserPreferences>(
  key: K,
): WritableComputedRef<UserPreferences[K]> {
  const store = usePreferencesStore()
  return computed<UserPreferences[K]>({
    get: () => store.prefs[key],
    set: (next) => store.set(key, next),
  })
}

export function usePreferencePath<T>(path: readonly string[]): WritableComputedRef<T> {
  const store = usePreferencesStore()
  return computed<T>({
    get: () =>
      path.reduce<unknown>(
        (acc, k) => (acc as Record<string, unknown> | undefined)?.[k],
        store.prefs,
      ) as T,
    set: (next) => store.setPath([...path], next),
  })
}
```

- [ ] **Step 4: Run the test — expect PASS**

```bash
bun run test:unit tests/composables/use-preferences.test.ts
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/composables/use-preferences.ts tests/composables/use-preferences.test.ts
git commit -m "feat(prefs): usePreference + usePreferencePath writable computeds

v-model-friendly wrappers over usePreferencesStore. Top-level
helper for whole-group updates, path helper for nested fields."
```

---

## Task 6: Integration test — `update_user_pref` against local Supabase

**Files:**
- Create: `tests/integration/preferences-rpc.test.ts`

> **Prereq:** local Supabase running (`bunx supabase start`); Cluster 01 migration AND Task 1 migration applied.

- [ ] **Step 1: Write the test**

Create `tests/integration/preferences-rpc.test.ts`:

```typescript
import { beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321'
const ANON = process.env.SUPABASE_ANON_KEY ?? ''
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

let serviceClient: SupabaseClient
let userAId = ''
let userAClient: SupabaseClient

beforeAll(async () => {
  serviceClient = createClient(URL, SERVICE, { auth: { persistSession: false } })

  const emailA = `user-a-${Date.now()}@test.local`
  const { data: createA, error: errA } = await serviceClient.auth.admin.createUser({
    email: emailA,
    password: 'pw-prefs-test-1',
    email_confirm: true,
  })
  if (errA || !createA.user) throw errA ?? new Error('User A not created')
  userAId = createA.user.id

  userAClient = createClient(URL, ANON, { auth: { persistSession: false } })
  const { error: signInErr } = await userAClient.auth.signInWithPassword({
    email: emailA,
    password: 'pw-prefs-test-1',
  })
  if (signInErr) throw signInErr
})

beforeEach(async () => {
  await serviceClient.from('users').update({ preferences: {} }).eq('id', userAId)
})

describe('update_user_pref RPC', () => {
  test('writes a top-level slice', async () => {
    const { error } = await userAClient.rpc('update_user_pref', {
      p_path: ['accessibility'],
      p_value: JSON.stringify({ textSize: 'large', reduceMotion: true, highContrast: false }),
    })
    expect(error).toBeNull()

    const { data } = await serviceClient
      .from('users')
      .select('preferences')
      .eq('id', userAId)
      .single()
    expect((data?.preferences as Record<string, unknown>).accessibility).toEqual({
      textSize: 'large',
      reduceMotion: true,
      highContrast: false,
    })
  })

  test('create_missing := true allows deep first-write', async () => {
    const { error } = await userAClient.rpc('update_user_pref', {
      p_path: ['notifications', 'productUpdates'],
      p_value: JSON.stringify(false),
    })
    expect(error).toBeNull()

    const { data } = await serviceClient
      .from('users')
      .select('preferences')
      .eq('id', userAId)
      .single()
    expect((data?.preferences as Record<string, unknown>).notifications).toEqual({
      productUpdates: false,
    })
  })

  test('writes to disjoint paths preserve siblings', async () => {
    await userAClient.rpc('update_user_pref', {
      p_path: ['view', 'showRuler'],
      p_value: JSON.stringify(true),
    })
    await userAClient.rpc('update_user_pref', {
      p_path: ['view', 'showLayoutGuide'],
      p_value: JSON.stringify(false),
    })
    const { data } = await serviceClient
      .from('users')
      .select('preferences')
      .eq('id', userAId)
      .single()
    expect((data?.preferences as Record<string, unknown>).view).toEqual({
      showRuler: true,
      showLayoutGuide: false,
    })
  })

  test('anon caller is denied', async () => {
    const anonClient = createClient(URL, ANON, { auth: { persistSession: false } })
    const { error } = await anonClient.rpc('update_user_pref', {
      p_path: ['accessibility', 'textSize'],
      p_value: JSON.stringify('large'),
    })
    expect(error).not.toBeNull()
  })
})
```

- [ ] **Step 2: Start local Supabase**

```bash
bunx supabase start
```

Expected: services up, env printed.

- [ ] **Step 3: Apply migrations**

```bash
bunx supabase db reset
```

Expected: Cluster 01 + Task 1 migrations applied.

- [ ] **Step 4: Run the test**

```bash
SUPABASE_URL=$(bunx supabase status --output json | jq -r .API_URL) \
SUPABASE_ANON_KEY=$(bunx supabase status --output json | jq -r .ANON_KEY) \
SUPABASE_SERVICE_ROLE_KEY=$(bunx supabase status --output json | jq -r .SERVICE_ROLE_KEY) \
bun run test:unit tests/integration/preferences-rpc.test.ts
```

Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add tests/integration/preferences-rpc.test.ts
git commit -m "test(prefs): integration tests for update_user_pref RPC

Top-level slice write; create_missing deep write; disjoint sibling
preservation; anon denial."
```

---

## Task 7: CSS layer — `accessibility.css`

**Files:**
- Create: `src/styles/accessibility.css`
- Modify: `src/app.css`

- [ ] **Step 1: Create the CSS layer**

Create `src/styles/accessibility.css`:

```css
/* ============================================================
   Accessibility CSS layer (Cluster 12).
   Driven by <html data-text-size | data-reduce-motion | data-high-contrast>.
   ============================================================ */

/* ---------- Text size ---------- */
:root[data-text-size='small']  { --text-base: 13px; }
:root[data-text-size='medium'] { --text-base: 14.5px; }
:root[data-text-size='large']  { --text-base: 16.5px; }
:root:not([data-text-size])    { --text-base: 14.5px; }

/* Canvas chrome stays fixed (per A7.1 annotation). Override --text-base
   inside .kc scope so OpenPencil-derived chrome ignores the user pref. */
.kc { --text-base: 12.5px; }

body { font-size: var(--text-base); }

/* ---------- Reduce motion ---------- */
:root[data-reduce-motion='true'] *,
:root[data-reduce-motion='true'] *::before,
:root[data-reduce-motion='true'] *::after {
  animation-duration: 0.01ms !important;
  animation-iteration-count: 1 !important;
  transition-duration: 0.01ms !important;
  scroll-behavior: auto !important;
}

/* OS fallback before usePreferencesStore.load() resolves. */
@media (prefers-reduced-motion: reduce) {
  :root:not([data-reduce-motion='false']) *,
  :root:not([data-reduce-motion='false']) *::before,
  :root:not([data-reduce-motion='false']) *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}

/* ---------- High contrast ---------- */
:root[data-high-contrast='true'] {
  --ink-2: #d8d8dd;
  --ink-3: #b6b6bd;
  --border: #6e6e73;
  --ring: #ffffff;
}
:root[data-high-contrast='true'] *:focus-visible {
  outline: 2px solid var(--ring) !important;
  outline-offset: 2px !important;
}
```

- [ ] **Step 2: Import in `src/app.css`**

Add to `src/app.css` (near the top, after any `@import` of Tailwind / OpenPencil base):

```css
@import './styles/accessibility.css';
```

(If `app.css` doesn't exist yet — Cluster 11 owns first creation — coordinate; create with just the import for now if needed.)

- [ ] **Step 3: Smoke against dev server**

Run:

```bash
bun run dev
```

Open `http://localhost:1420`, in DevTools console run:

```js
document.documentElement.dataset.textSize = 'large'
document.documentElement.dataset.highContrast = 'true'
document.documentElement.dataset.reduceMotion = 'true'
```

Expected: body text grows; borders strengthen; CSS transitions become near-instant. Canvas `.kc` chrome stays fixed.

- [ ] **Step 4: Commit**

```bash
git add src/styles/accessibility.css src/app.css
git commit -m "feat(prefs): accessibility CSS layer

[data-text-size] -> --text-base; .kc scope keeps canvas chrome
fixed. [data-reduce-motion='true'] forces ~0ms transitions globally
with @media prefers-reduced-motion OS fallback. [data-high-contrast='true']
overrides --ink-2/--ink-3/--border/--ring + focus-visible outline."
```

---

## Task 8: `use-reduced-motion-default` composable

**Files:**
- Create: `src/composables/use-reduced-motion-default.ts`
- Test: `tests/composables/use-reduced-motion-default.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/composables/use-reduced-motion-default.test.ts`:

```typescript
import { beforeEach, describe, expect, mock, test } from 'bun:test'
import { createPinia, setActivePinia } from 'pinia'
import { usePreferencesStore } from '@/stores/preferences'
import { applyReducedMotionDefault } from '@/composables/use-reduced-motion-default'

let mockedRow: { preferences: unknown } | null = { preferences: {} }
mock.module('@/lib/supabase', () => ({
  supabase: {
    from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: mockedRow, error: null }) }) }) }),
    rpc: async () => ({ error: null }),
  },
}))
mock.module('@/stores/auth', () => ({ useAuthStore: () => ({ userId: 'u1' }) }))

function setMatchMedia(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (_q: string) => ({
      matches,
      media: '(prefers-reduced-motion: reduce)',
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
      onchange: null,
    }),
  })
}

beforeEach(() => {
  setActivePinia(createPinia())
  mockedRow = { preferences: {} }
})

describe('applyReducedMotionDefault', () => {
  test('no-op when explicit key already set', async () => {
    mockedRow = { preferences: { accessibility: { reduceMotion: false } } }
    setMatchMedia(true)
    const store = usePreferencesStore()
    await store.load()
    applyReducedMotionDefault()
    expect(store.prefs.accessibility.reduceMotion).toBe(false)
  })

  test('writes true when no explicit key and OS prefers reduce', async () => {
    mockedRow = { preferences: {} }
    setMatchMedia(true)
    const store = usePreferencesStore()
    await store.load()
    applyReducedMotionDefault()
    expect(store.prefs.accessibility.reduceMotion).toBe(true)
  })

  test('no-op when no explicit key and OS does not prefer reduce', async () => {
    mockedRow = { preferences: {} }
    setMatchMedia(false)
    const store = usePreferencesStore()
    await store.load()
    applyReducedMotionDefault()
    expect(store.prefs.accessibility.reduceMotion).toBe(false)
  })
})
```

- [ ] **Step 2: Run the test — expect FAIL**

```bash
bun run test:unit tests/composables/use-reduced-motion-default.test.ts
```

- [ ] **Step 3: Implement `src/composables/use-reduced-motion-default.ts`**

```typescript
import { usePreferencesStore } from '@/stores/preferences'

export function applyReducedMotionDefault(): void {
  const store = usePreferencesStore()
  if (!store.loaded) return
  if (store.hasExplicitAccessibilityKey('reduceMotion')) return
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    store.setPath(['accessibility', 'reduceMotion'], true)
  }
}
```

- [ ] **Step 4: Run the test — expect PASS**

```bash
bun run test:unit tests/composables/use-reduced-motion-default.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/composables/use-reduced-motion-default.ts tests/composables/use-reduced-motion-default.test.ts
git commit -m "feat(prefs): applyReducedMotionDefault one-shot OS cue

Writes accessibility.reduceMotion=true on first ever load only when
the user hasn't set the key explicitly and the OS media query reports
prefers-reduced-motion: reduce. Subsequent loads honor the user choice."
```

---

## Task 9: `usePreferencesModal` composable

**Files:**
- Create: `src/composables/use-preferences-modal.ts`
- Test: inline smoke (no separate test file — singleton state is trivial; covered by Task 12 component test)

- [ ] **Step 1: Implement**

Create `src/composables/use-preferences-modal.ts`:

```typescript
import { readonly, ref, type Ref } from 'vue'

type PreferencesMode = 'accessibility'

const isOpen = ref(false)
const mode = ref<PreferencesMode>('accessibility')

export function usePreferencesModal() {
  function open(m: PreferencesMode = 'accessibility'): void {
    mode.value = m
    isOpen.value = true
  }
  function close(): void {
    isOpen.value = false
  }
  return {
    isOpen: readonly(isOpen) as Readonly<Ref<boolean>>,
    mode: readonly(mode) as Readonly<Ref<PreferencesMode>>,
    open,
    close,
  }
}
```

- [ ] **Step 2: Type-check**

```bash
bun run check
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/composables/use-preferences-modal.ts
git commit -m "feat(prefs): usePreferencesModal singleton open/close composable

Module-level refs let main-menu trigger (Cluster 08) and the modal
component reach the same open state without prop drilling."
```

---

## Task 10: `<AccessibilityPanel>` component

> **Blocked by:** Cluster 11 ships `<KovaSegmented>` + `<KovaToggle>`. If both not yet present, stub them as minimal components OR pause this task until Cluster 11 lands. Subsequent tasks (11, 12) also depend on `<KovaModal>` + `<KovaButton>`.

**Files:**
- Create: `src/components/settings/AccessibilityPanel.vue`
- Test: `tests/components/AccessibilityPanel.test.ts`

- [ ] **Step 1: Write the failing component test**

Create `tests/components/AccessibilityPanel.test.ts`:

```typescript
import { beforeEach, describe, expect, mock, test } from 'bun:test'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import AccessibilityPanel from '@/components/settings/AccessibilityPanel.vue'
import { usePreferencesStore } from '@/stores/preferences'

mock.module('@/lib/supabase', () => ({
  supabase: {
    from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { preferences: {} }, error: null }) }) }) }),
    rpc: async () => ({ error: null }),
  },
}))
mock.module('@/stores/auth', () => ({ useAuthStore: () => ({ userId: 'u1' }) }))

beforeEach(() => setActivePinia(createPinia()))

describe('<AccessibilityPanel>', () => {
  test('renders three rows with default values', async () => {
    const store = usePreferencesStore()
    await store.load()
    const wrapper = mount(AccessibilityPanel, { global: { stubs: { KovaSegmented: true, KovaToggle: true } } })
    expect(wrapper.text()).toContain('Text size')
    expect(wrapper.text()).toContain('Reduce motion')
    expect(wrapper.text()).toContain('High contrast')
  })

  test('toggling reduce motion updates the store', async () => {
    const store = usePreferencesStore()
    await store.load()
    const wrapper = mount(AccessibilityPanel)
    const toggles = wrapper.findAllComponents({ name: 'KovaToggle' })
    expect(toggles.length).toBeGreaterThanOrEqual(2)
    await toggles[0].vm.$emit('update:modelValue', true)
    await nextTick()
    expect(store.prefs.accessibility.reduceMotion).toBe(true)
  })
})
```

- [ ] **Step 2: Run the test — expect FAIL**

```bash
bun run test:unit tests/components/AccessibilityPanel.test.ts
```

- [ ] **Step 3: Implement `src/components/settings/AccessibilityPanel.vue`**

```vue
<script setup lang="ts">
import { usePreferencePath } from '@/composables/use-preferences'
import KovaSegmented from '@/components/ui/KovaSegmented.vue'
import KovaToggle from '@/components/ui/KovaToggle.vue'
import type { TextSize } from '@/types/preferences'

const textSize = usePreferencePath<TextSize>(['accessibility', 'textSize'])
const reduceMotion = usePreferencePath<boolean>(['accessibility', 'reduceMotion'])
const highContrast = usePreferencePath<boolean>(['accessibility', 'highContrast'])

const textSizeOptions = [
  { value: 'small' as TextSize, label: 'Small' },
  { value: 'medium' as TextSize, label: 'Medium' },
  { value: 'large' as TextSize, label: 'Large' },
] as const
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="row">
      <div class="lbl">
        Text size
        <span class="sub">Affects body, list, and dialog text. Tools and canvas chrome stay fixed.</span>
      </div>
      <div class="val">
        <KovaSegmented v-model="textSize" :options="textSizeOptions" aria-label="Text size" />
      </div>
    </div>

    <div class="row">
      <div class="lbl">
        Reduce motion
        <span class="sub">Disables panel slide-ins, hover transitions, and AI streaming animations.</span>
      </div>
      <div class="val">
        <KovaToggle v-model="reduceMotion" aria-label="Reduce motion" />
      </div>
    </div>

    <div class="row">
      <div class="lbl">
        High contrast
        <span class="sub">Strengthens borders, ink, and focus rings.</span>
      </div>
      <div class="val">
        <KovaToggle v-model="highContrast" aria-label="High contrast" />
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 4: Run the test — expect PASS**

```bash
bun run test:unit tests/components/AccessibilityPanel.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/components/settings/AccessibilityPanel.vue tests/components/AccessibilityPanel.test.ts
git commit -m "feat(prefs): AccessibilityPanel component (A7.1 + A8.3 body)

Three controls bound to usePreferencePath; reused inside Profile
section and inside <PreferencesModal>. Apply-immediately contract
(no save bar). Labels + sub-copy match A7.1 hi-fi 1:1."
```

---

## Task 11: `<NotificationsPanel>` component

**Files:**
- Create: `src/components/settings/NotificationsPanel.vue`
- Test: `tests/components/NotificationsPanel.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/components/NotificationsPanel.test.ts`:

```typescript
import { beforeEach, describe, expect, mock, test } from 'bun:test'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import NotificationsPanel from '@/components/settings/NotificationsPanel.vue'
import { usePreferencesStore } from '@/stores/preferences'

mock.module('@/lib/supabase', () => ({
  supabase: {
    from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { preferences: {} }, error: null }) }) }) }),
    rpc: async () => ({ error: null }),
  },
}))
mock.module('@/stores/auth', () => ({ useAuthStore: () => ({ userId: 'u1' }) }))

beforeEach(() => setActivePinia(createPinia()))

describe('<NotificationsPanel>', () => {
  test('renders both rows defaulting ON', async () => {
    const store = usePreferencesStore()
    await store.load()
    const wrapper = mount(NotificationsPanel)
    expect(wrapper.text()).toContain('Product updates')
    expect(wrapper.text()).toContain('Sync alerts')
    expect(store.prefs.notifications.productUpdates).toBe(true)
    expect(store.prefs.notifications.syncAlerts).toBe(true)
  })

  test('toggling syncAlerts updates the store', async () => {
    const store = usePreferencesStore()
    await store.load()
    const wrapper = mount(NotificationsPanel)
    const toggles = wrapper.findAllComponents({ name: 'KovaToggle' })
    await toggles[1].vm.$emit('update:modelValue', false)
    await nextTick()
    expect(store.prefs.notifications.syncAlerts).toBe(false)
  })
})
```

- [ ] **Step 2: Run the test — expect FAIL**

```bash
bun run test:unit tests/components/NotificationsPanel.test.ts
```

- [ ] **Step 3: Implement `src/components/settings/NotificationsPanel.vue`**

```vue
<script setup lang="ts">
import { usePreferencePath } from '@/composables/use-preferences'
import KovaToggle from '@/components/ui/KovaToggle.vue'

const productUpdates = usePreferencePath<boolean>(['notifications', 'productUpdates'])
const syncAlerts = usePreferencePath<boolean>(['notifications', 'syncAlerts'])
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="row">
      <div class="lbl">
        Product updates
        <span class="sub">New features and changelog highlights.</span>
      </div>
      <div class="val flex items-center gap-3">
        <span class="text-meta">Email · monthly</span>
        <KovaToggle v-model="productUpdates" aria-label="Product updates" />
      </div>
    </div>

    <div class="row">
      <div class="lbl">
        Sync alerts
        <span class="sub">Shopify or generation failures that need attention.</span>
      </div>
      <div class="val flex items-center gap-3">
        <span class="text-meta">Email · immediate</span>
        <KovaToggle v-model="syncAlerts" aria-label="Sync alerts" />
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 4: Run the test — expect PASS**

```bash
bun run test:unit tests/components/NotificationsPanel.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/components/settings/NotificationsPanel.vue tests/components/NotificationsPanel.test.ts
git commit -m "feat(prefs): NotificationsPanel component (A7.1 §4)

Two toggles bound to usePreferencePath. Defaults both ON. Channel
meta text 'Email · monthly' / 'Email · immediate' tracks A7.1 hi-fi."
```

---

## Task 12: `<PreferencesModal>` component

**Files:**
- Create: `src/components/settings/PreferencesModal.vue`
- Test: `tests/components/PreferencesModal.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/components/PreferencesModal.test.ts`:

```typescript
import { beforeEach, describe, expect, mock, test } from 'bun:test'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import PreferencesModal from '@/components/settings/PreferencesModal.vue'
import { usePreferencesModal } from '@/composables/use-preferences-modal'

mock.module('@/lib/supabase', () => ({
  supabase: {
    from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { preferences: {} }, error: null }) }) }) }),
    rpc: async () => ({ error: null }),
  },
}))
mock.module('@/stores/auth', () => ({ useAuthStore: () => ({ userId: 'u1' }) }))

beforeEach(() => setActivePinia(createPinia()))

describe('<PreferencesModal>', () => {
  test('hidden by default', () => {
    const wrapper = mount(PreferencesModal, { global: { stubs: { KovaModal: true } } })
    expect(wrapper.html()).not.toContain('Accessibility')
  })

  test('renders AccessibilityPanel when open mode=accessibility', async () => {
    const { open } = usePreferencesModal()
    open('accessibility')
    await nextTick()
    const wrapper = mount(PreferencesModal)
    await nextTick()
    expect(wrapper.text()).toContain('Accessibility')
    expect(wrapper.text()).toContain('Visual and motion preferences')
  })

  test('Cancel + Save both close the modal', async () => {
    const { open, isOpen } = usePreferencesModal()
    open('accessibility')
    await nextTick()
    const wrapper = mount(PreferencesModal)
    await nextTick()
    const buttons = wrapper.findAll('button')
    const cancelBtn = buttons.find((b) => b.text() === 'Cancel')
    expect(cancelBtn).toBeTruthy()
    await cancelBtn!.trigger('click')
    expect(isOpen.value).toBe(false)
  })
})
```

- [ ] **Step 2: Run the test — expect FAIL**

```bash
bun run test:unit tests/components/PreferencesModal.test.ts
```

- [ ] **Step 3: Implement `src/components/settings/PreferencesModal.vue`**

```vue
<script setup lang="ts">
import { usePreferencesModal } from '@/composables/use-preferences-modal'
import KovaModal from '@/components/ui/KovaModal.vue'
import AccessibilityPanel from './AccessibilityPanel.vue'

const { isOpen, mode, close } = usePreferencesModal()
</script>

<template>
  <KovaModal :open="isOpen" size="md" @close="close">
    <template #header>
      <h3>Accessibility</h3>
      <p class="sub">Visual and motion preferences. Apply across every brand and canvas.</p>
    </template>

    <template #body>
      <AccessibilityPanel v-if="mode === 'accessibility'" />
    </template>

    <template #footer>
      <div class="dlg-foot flex items-center justify-between">
        <div class="l flex items-center gap-2">
          <icon-lucide-info class="w-3 h-3" />
          <span>Saved to your account · syncs across devices.</span>
        </div>
        <div class="r flex items-center gap-2">
          <button type="button" class="btn" @click="close">Cancel</button>
          <button type="button" class="btn primary" @click="close">Save</button>
        </div>
      </div>
    </template>
  </KovaModal>
</template>
```

- [ ] **Step 4: Run the test — expect PASS**

```bash
bun run test:unit tests/components/PreferencesModal.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/components/settings/PreferencesModal.vue tests/components/PreferencesModal.test.ts
git commit -m "feat(prefs): PreferencesModal component (A8.3)

Wraps AccessibilityPanel inside KovaModal. Cancel + Save both close
(apply-immediately contract per founder pick). Footer carries 'Saved
to your account · syncs across devices' meta text per A8.3 hi-fi."
```

---

## Task 13: Wire global mount + load-on-auth

**Files:**
- Modify: `src/main.ts`
- Modify: `src/App.vue` (or whichever shell layout exists)

- [ ] **Step 1: Identify the auth-state watcher**

Locate the auth-state-changed hook. Run:

```bash
grep -rn "onAuthStateChange\|signedIn\|userId" src/stores/auth.ts src/main.ts src/App.vue
```

Expected: find the place where `useAuthStore` initializes (likely `main.ts` calls `await authStore.init()` or similar). If `init()` doesn't exist, add it during this task; otherwise hook into it.

- [ ] **Step 2: Add load-on-auth + OS cue + global modal mount**

Modify `src/main.ts` to add (after Pinia is installed and auth initializes):

```typescript
import { usePreferencesStore } from '@/stores/preferences'
import { applyReducedMotionDefault } from '@/composables/use-reduced-motion-default'

async function bootstrapPreferences(): Promise<void> {
  const prefs = usePreferencesStore()
  await prefs.load()
  applyReducedMotionDefault()
}

// Call after auth init resolves
await bootstrapPreferences()
```

Modify the app shell (`src/App.vue` or the first-level layout) to mount the modal once globally:

```vue
<script setup lang="ts">
// existing imports
import PreferencesModal from '@/components/settings/PreferencesModal.vue'
</script>

<template>
  <!-- existing layout -->
  <PreferencesModal />
</template>
```

- [ ] **Step 3: Browser smoke**

```bash
bun run dev
```

Open `http://localhost:1420`, sign in:

1. DevTools console: `document.documentElement.dataset.textSize` → expect `'medium'` (or value from server)
2. From console: `document.documentElement.dataset.highContrast` → expect `'false'`
3. From console: `(await import('/src/composables/use-preferences-modal.ts')).usePreferencesModal().open()` → modal opens

(For Cluster 08's main-menu trigger, the wiring of the menu item that calls `open('accessibility')` is owned by that PRD. Until 08 ships, the modal is reachable only via Profile section's "Open in modal" affordance — Task 14 — OR via DevTools as above.)

- [ ] **Step 4: Commit**

```bash
git add src/main.ts src/App.vue
git commit -m "feat(prefs): bootstrap preferences on app boot + mount modal globally

Calls usePreferencesStore.load() after auth init resolves; then
applyReducedMotionDefault() one-shots the OS cue. PreferencesModal
mounted once in the app shell so usePreferencesModal().open() works
from any context (Profile, main menu, etc)."
```

---

## Task 14: Cluster 04 integration handoff (Profile section mount)

> **Coordination, not implementation.** Cluster 04 mounts `<AccessibilityPanel>` + `<NotificationsPanel>` inside its Profile section component. This task is a stub PR-comment / handoff note when Cluster 04's plan reaches its Profile-section task.

**Files:**
- (no new files — coordinate via PRD 04 plan)

- [ ] **Step 1: Add a handoff note to PRD 04 plan**

Open `kova-open-pencil-1/docs/kova-final-impl-plans/04-account-and-stripe-billing-plan.md` and append at the Profile-section task:

```markdown
**Cluster 12 dependency:** import + slot `<AccessibilityPanel>` and `<NotificationsPanel>`:

\`\`\`vue
<script setup lang="ts">
import AccessibilityPanel from '@/components/settings/AccessibilityPanel.vue'
import NotificationsPanel from '@/components/settings/NotificationsPanel.vue'
</script>

<template>
  <!-- existing Identity rows -->
  <section class="s-section">
    <h2>Accessibility</h2>
    <p class="desc">Saved to your user preferences. Same controls also reachable from main menu → Preferences → Accessibility (A8.3).</p>
    <AccessibilityPanel />
  </section>
  <section class="s-section">
    <h2>Notifications</h2>
    <NotificationsPanel />
  </section>
\`\`\`

The Profile save-bar governs Identity fields only — Accessibility + Notifications rows apply immediately via their own store, bypassing the save-bar.
```

- [ ] **Step 2: Commit**

```bash
git add ../kova-open-pencil-1/docs/kova-final-impl-plans/04-account-and-stripe-billing-plan.md
git commit -m "docs(prefs): hand off AccessibilityPanel + NotificationsPanel mount to PRD 04 plan

Profile section in /account/profile imports both panels. Save-bar
scopes to Identity fields; Accessibility + Notifications apply
immediately."
```

---

## Task 15: E2E test — Playwright

**Files:**
- Create: `tests/e2e/preferences.spec.ts`

> **Prereq:** dev server runs (`bun run dev`); a seeded test user exists.

- [ ] **Step 1: Write the E2E spec**

Create `tests/e2e/preferences.spec.ts`:

```typescript
import { test, expect } from '@playwright/test'

test.describe('preferences', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.fill('[data-test="email"]', process.env.E2E_USER_EMAIL ?? 'e2e@test.local')
    await page.fill('[data-test="password"]', process.env.E2E_USER_PASSWORD ?? 'pw-prefs-test-1')
    await page.click('button[type="submit"]')
    await page.waitForURL((u) => !u.toString().includes('/login'))
  })

  test('Text size toggles persist across reload', async ({ page }) => {
    await page.goto('/account/profile')
    await page.getByRole('radio', { name: 'Large' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-text-size', 'large')
    await page.waitForTimeout(1500)
    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(page.locator('html')).toHaveAttribute('data-text-size', 'large')
  })

  test('Profile <-> Modal share state', async ({ page }) => {
    await page.goto('/account/profile')
    await page.getByLabel('High contrast').click()
    await expect(page.locator('html')).toHaveAttribute('data-high-contrast', 'true')

    await page.evaluate(async () => {
      const mod = await import('/src/composables/use-preferences-modal.ts')
      mod.usePreferencesModal().open('accessibility')
    })
    const modalToggle = page.getByLabel('High contrast').last()
    await expect(modalToggle).toHaveAttribute('aria-pressed', 'true')
  })

  test('Notifications opt-out persists', async ({ page }) => {
    await page.goto('/account/profile')
    await page.getByLabel('Product updates').click()
    await page.waitForTimeout(1500)
    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(page.getByLabel('Product updates')).toHaveAttribute('aria-pressed', 'false')
  })
})
```

- [ ] **Step 2: Run the spec**

```bash
bunx playwright test tests/e2e/preferences.spec.ts
```

Expected: 3 tests pass.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/preferences.spec.ts
git commit -m "test(prefs): Playwright E2E for cross-surface + reload persistence

Text size reload-survival; Profile/Modal shared state; Notifications
opt-out persistence."
```

---

## Task 16: Manual QA + PRD tracker bump

**Files:**
- Modify: `docs/kova-final-prds/00-PRD_SCOPE_PLAN.md`
- Modify: `docs/kova-final-prds/00a-PRD_AUTHORING_GUIDE.md`
- Modify: `docs/legal/privacy-policy.md` (Cluster 01-owned; append one line)

- [ ] **Step 1: Founder browser smoke**

Run the manual QA checklist from PRD §9.4. Walk Jiho through:

1. Profile → Accessibility → cycle text sizes (body text changes; canvas chrome doesn't)
2. Toggle high contrast (visual delta)
3. Toggle reduce motion (animations cut)
4. Main menu → Preferences → A8.3 modal opens; reflects same state
5. Sign in on a second browser/incognito → values arrive within ~1 s
6. Clear localStorage on browser 1 → reload → recent colors / panel collapse reset; Layer 1 prefs intact
7. On a machine with OS reduce-motion ON, fresh sign-in auto-ticks reduce motion

- [ ] **Step 2: Update PRD scope plan tracker**

In `docs/kova-final-prds/00-PRD_SCOPE_PLAN.md`, find Cluster 12 in the dependencies/tracker table; bump status to `APPROVED` (after founder review) or `IN-IMPLEMENTATION`.

- [ ] **Step 3: Update PRD authoring guide tracker**

In `docs/kova-final-prds/00a-PRD_AUTHORING_GUIDE.md §7`, change the Cluster 12 row from `PENDING / — / —` to:

```
| **3** | 12 | Settings + User Prefs | `12-settings-and-user-preferences.md` | APPROVED | Claude (Opus 4.7) | 2026-05-15 |
```

- [ ] **Step 4: Append privacy-policy line**

Append to `docs/legal/privacy-policy.md` under the "Account data" section (or equivalent):

```markdown
- **Preferences (accessibility, view, notifications)** — stored on your account row and synced across your devices when you sign in.
```

(If `docs/legal/privacy-policy.md` doesn't exist yet — Cluster 01 owns first creation — coordinate; do not create the file from Cluster 12.)

- [ ] **Step 5: Commit**

```bash
git add docs/kova-final-prds/00-PRD_SCOPE_PLAN.md docs/kova-final-prds/00a-PRD_AUTHORING_GUIDE.md docs/legal/privacy-policy.md
git commit -m "docs(prefs): bump PRD 12 tracker to APPROVED + privacy disclosure

Updated 00-PRD_SCOPE_PLAN.md + 00a-PRD_AUTHORING_GUIDE.md tracker
rows; added preference-storage disclosure line to privacy policy."
```

---

## Self-review checklist

- [x] **Spec coverage:** every PRD §-section has a task:
  - §4.1 schema migration → Task 1
  - §5.2 RPC → Task 1
  - §6.2.1 usePreferencesStore → Task 4
  - §6.2.2 useUIStateStore → Task 3
  - §6.2.3 per-pref allocation → encoded in DEFAULTS (Task 2)
  - §6.3.1 use-preferences → Task 5
  - §6.3.2 use-preferences-modal → Task 9
  - §6.3.3 use-reduced-motion-default → Task 8
  - §6.4.1 AccessibilityPanel → Task 10
  - §6.4.2 NotificationsPanel → Task 11
  - §6.4.3 PreferencesModal → Task 12
  - §3.3 CSS layer → Task 7
  - §10 Phase A bootstrap → Task 13
  - §11 Cluster 04 handoff → Task 14
  - §9.1 unit tests → Tasks 2, 3, 4, 5, 8
  - §9.2 integration → Task 6
  - §9.3 E2E → Task 15
  - §9.4 manual QA + tracker bump → Task 16

- [x] **No placeholders:** every step contains exact code, exact commands, exact paths.

- [x] **Type consistency:** `TextSize` consistent in types/preferences.ts (Task 2) and AccessibilityPanel.vue (Task 10); `UserPreferences` shape stable across Tasks 2/4/5/10/11; `update_user_pref` signature stable across Tasks 1/4/6.

- [x] **No invented infra:** RPC `update_user_pref` matches PRD §5.2 + 00c §2.A line 2070–2077; `users.preferences` column comes from Cluster 01 (PRD §4.2 acknowledged); Pinia store + composable patterns track Q5 verbatim.

- [x] **Theme drift check:** dark only (per `feedback_app_dark_website_light`); no light surface in this cluster.

- [x] **`00e §6` hygiene:** no live multi-device sync promise; no `/marketing` reference; privacy-policy line ships in Task 16; no staging-trigger reference.

---

## Execution handoff

Plan complete and saved to `kova-open-pencil-1/docs/kova-final-impl-plans/12-settings-and-user-preferences-plan.md`. Two execution options:

**1. Subagent-Driven (recommended)** — Dispatch a fresh subagent per task, review between tasks, fast iteration. Recommended given the 16-task length and the fact that Tasks 10–12 are blocked on Cluster 11 — a controller can re-route work cleanly.

**2. Inline Execution** — Execute tasks in this session using `superpowers:executing-plans`, batch with checkpoints at Tasks 6 (integration test) and Task 13 (browser smoke).

**Which approach?**
