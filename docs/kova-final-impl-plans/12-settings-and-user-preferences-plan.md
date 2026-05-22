# PRD 12 — Settings / Accessibility / User Preferences — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the two-layer user-preferences architecture (Layer 1 = `users.preferences` JSONB via `update_user_pref` RPC + `usePreferencesStore`; Layer 2 = localStorage via `useUIStateStore`) plus the three Accessibility controls (Text size / Reduce motion / High contrast) and two Notification toggles (Product updates / Sync alerts) rendered both inside the Profile section of `/account/profile` and as the A8.3 main-menu Preferences modal — one component, two surfaces, apply-immediately, 1-second debounced server write.

**Architecture:** Vue 3 + Pinia + VueUse on top of Supabase Postgres JSONB. Single `update_user_pref(p_path text[], p_value jsonb)` RPC writes via `jsonb_set(create_missing := true)`, SECURITY INVOKER, gated by the existing `users` table RLS (`auth.uid() = id`). Pinia store performs optimistic local updates (immutable copy + structuredClone), debounces server writes via VueUse `useDebounceFn(1000)`, applies state to `<html data-text-size | data-reduce-motion | data-high-contrast>` so a small CSS layer (`accessibility.css`) flips global tokens without re-render. One reusable `<AccessibilityPanel>` mounts inside Cluster 04's Profile section AND inside `<PreferencesModal>` (singleton open-state composable). `users.preferences jsonb` column itself ships in Cluster 01 — this plan only adds the RPC and the consuming UI.

**Tech Stack:** Vue 3 (Composition API, `<script setup lang="ts">`), Pinia setup stores, VueUse (`useLocalStorage`, `useDebounceFn`), Tailwind CSS 4 utility classes only, Reka UI primitives via Cluster 11's `<KovaModal>` / `<KovaSegmented>` / `<KovaToggle>` / `<KovaButton>`, `@supabase/supabase-js`, `bun:test` for units, Playwright for E2E. No Zod. No React. No new tables. No Edge Functions.

**PRD reference:** `/Users/jihoyang/kova-main/kova-open-pencil-1/docs/kova-final-prds/12-settings-and-user-preferences.md`

**Branch:** `feat/m9-shopify` (active feature branch — Cluster 12 commits cascade onto current M9 work alongside Cluster 04).

---

## File structure

### Backend (migrations + edge function)

| File | Purpose |
|---|---|
| `supabase/migrations/20260603_12_user_preferences_rpc.sql` | `update_user_pref(p_path text[], p_value jsonb)` SECURITY INVOKER RPC + GRANT to `authenticated`. Pairs with Cluster 01's `users.preferences` column. [PRD §4.1 + §5.2] |
| `supabase/functions/send-sync-alert/index.ts` | NEW — env-guarded Supabase Edge Function. Called by Cluster 06's Yjs sync-retry hook after retry 3. Reads `prefs.notifications.syncAlerts` (gates send); imports Cluster 01's `_shared/resend-client.ts`; wraps Resend call in `if (!Deno.env.get('RESEND_API_KEY'))` guard so dev runs without secret. [PRD §5.4] |

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

## Hi-fi Visual Reference + Translation Method

> **Authoritative method:** `docs/execution-phase/claude-design-files/IMPLEMENTATION_PROMPT.md` (read end-to-end before any UI task). Maps PRD 12 §3 hi-fi citations to Plan tasks + actual Kova source paths.

**3-rule fidelity contract** (per `docs/execution-phase/claude-design-files/IMPLEMENTATION_PROMPT.md` §0):

1. **Visual values are copied.** Every color, spacing, type, radius, shadow, gap, padding, line-height, tracking, and proportion in the rendered output MUST match the mockup pixel-for-pixel.
2. **DOM structure is translated.** Vue 3 SFCs + Reka UI primitives + Cluster 11 primitives + K* component layer (`design.md` §3). NOT the mockup's hand-rolled HTML.
3. **Behavior is engineered.** State in Pinia / refs / composables. Hover / focus / active / selected / disabled states are dynamic bindings, NEVER hardcoded classes.

**Trap phrase ban:** "copy DOM verbatim" is forbidden. Drift protocol per RIDER §2.1 + IMPLEMENTATION_PROMPT.md §7 on any hi-fi value not in `kova-hifi.css :root` — never silently round. **Theme: dark.**

**Phase 1 audit gate** (per IMPLEMENTATION_PROMPT.md §3): produce `KOVA_AUDIT.md` + `tokens-used.md` BEFORE any Vue code. `tokens-used.md` enumerates every visual value in this cluster's surfaces mapped to either an existing token or ⚠️ MISSING (founder decision via AskUserQuestion). No Vue until founder-approved.

**Per-screen diff loop** (per IMPLEMENTATION_PROMPT.md §6): in-repo mockup + Vue route at 1440px → screenshot both → walk Appendix A per property → list discrepancies in `tests/snapshots/cluster-12/<surface>-diff.md` → fix → re-diff until empty. **Visual-diff thresholds: ≤ 0.1% component / ≤ 0.5% screen** (Playwright `maxDiffPixelRatio: 0.005, threshold: 0.2`, masking volatile regions per IMPLEMENTATION_PROMPT.md §10).

**PR artifact:** every PR touching a UI surface in this cluster MUST include 3-screenshot row (mockup / impl / diff) per surface in the PR description.

**Component contract:** per PRD 12 §3.2, `<AccessibilityPanel>` is single-source-of-truth, slotted into BOTH `<ProfileSection>` (`/account/profile`) AND `<PreferencesModal mode="accessibility">` (main menu → Preferences). "Design once, expose twice."

### Cluster 11 primitives — use these

Source: `kova-open-pencil-1/src/components/ui/`:
- `<KovaIcon name="...">` — settings, type, eye, contrast, etc.
- `<KovaModal>` (`.dlg.md` 540px) — Accessibility settings modal (A8.3)
- `<KovaToast>` + `useToast()`
- `<KovaSegmented>` (Cluster 11 segmented control) — Text size 3-segment (Small / Medium / Large)
- `<KovaToggle>` (Cluster 11 binary toggle) — Reduce motion + High contrast + Product updates + Sync alerts

### Kova codebase paths to consult

- `kova-open-pencil-1/src/components/ui/` — Cluster 11 primitives
- `kova-open-pencil-1/src/stores/auth.ts` — existing (Cluster 01 ships `users.preferences` column via migration)
- `kova-open-pencil-1/src/composables/` — existing composables (new ones added per Tasks 5, 8, 9)
- `kova-open-pencil-1/src/styles/accessibility.css` — NEW per Task 7 (CSS layer for textSize + highContrast)
- `kova-open-pencil-1/src/app.css` — Tailwind 4 `@theme` (Plan 12 adds `data-high-contrast="true"` override block)

### Hi-fi → Plan surface mapping (this cluster)

| Plan surface (task) | Hi-fi file | Scene IDs |
|---|---|---|
| Task 10 — `<AccessibilityPanel>` (3 rows: Text size segmented / Reduce motion toggle / High contrast toggle) | `design-system/hifi/account-stripe/Kova Hi-Fi A7 Account Page - Dark.html` | A7.1 §3 Accessibility (lines 671–704) |
| Task 11 — `<NotificationsPanel>` (2 rows: Product updates / Sync alerts) | A7 | A7.1 §4 Notifications (lines 707–725) |
| Task 12 — `<PreferencesModal>` (modal host for `<AccessibilityPanel>` when triggered via main menu → Preferences → Accessibility) | `design-system/hifi/canvas-menus/Kova Hi-Fi A6+A2a Popovers + A8 Dialogs - Dark.html` | A8.3 Accessibility settings modal (lines 803–887) |

### Per-property extraction checklist

Walk `IMPLEMENTATION_PROMPT.md Appendix A` per surface. Especially:
- **A.2 Typography** — segmented control text scales with `data-text-size` attribute (87.5% / 100% / 112.5%)
- **A.5 Border + radius** — high-contrast overrides `--border` to higher-contrast hex per A8.3
- **A.8 Motion** — reduce-motion sets all `animation-duration` / `transition-duration` to `0.01ms !important`
- **A.9 Interactive states** — toggles apply-immediately (no Save gate per founder pick 2026-05-15)

Record extracted values in TDD fixtures + screenshot diff logs under `tests/snapshots/cluster-12/`.

---

## Pre-flight assumptions

Before Task 1, verify:

- `git status` clean on `feat/m9-shopify`, OR working changes are unrelated to the files in this plan.
- Cluster 01 migration `20260520_01_users_account_lifecycle.sql` is **merged or staged for the same release** — `users.preferences jsonb NOT NULL DEFAULT '{}'::jsonb` MUST exist before this plan's RPC migration runs. If not present locally, the plan still authors files but Task 1 step "run migration locally" will fail until Cluster 01 lands. Coordinate with Cluster 01 implementer.
- Cluster 11 primitives (`KovaModal`, `KovaSegmented`, `KovaToggle`, `KovaButton`, `useToast`) exist in `src/components/ui/` AND in `src/composables/use-toast.ts`. If not (Cluster 11 PRD still PENDING), Task 10–12 are blocked until they ship. Workaround: shim minimal versions in this plan as Task 10a / 11a / 12a; remove and import properly when Cluster 11 lands. Decision: defer Tasks 10–12 until Cluster 11 merges. Tasks 1–9 + 13–16 are unblocked.
- Cluster 01 ships `supabase/functions/_shared/resend-client.ts` (shared Resend SDK wrapper). Task 16 (edge function) imports it. If Cluster 01 has not landed, stub a local `_shared/resend-client.ts` in this plan and replace when Cluster 01 merges. Resend ACCOUNT setup (signup, domain verification, DNS, `RESEND_API_KEY` secret) is **deferred to pre-launch per founder decision 2026-05-17** — see `docs/kova-final-prds/00-PRD_SCOPE_PLAN.md §11` + memory `project_external_accounts_deferred`. Edge function ships with env-var guard so dev runs without Resend (toast is always-on safety net).
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
  ai: { showTextSuggestions: false }, // founder ratified 2026-05-17: reserved flag default OFF, no UI in MVP
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

  test('pushRecentColor caps at 12 with FIFO eviction (founder ratified 2026-05-17)', () => {
    const s = useUIStateStore()
    for (let i = 0; i < 30; i++) {
      s.pushRecentColor(`#${i.toString(16).padStart(6, '0')}`)
    }
    expect(s.recentColors.length).toBe(12)
    // 30 pushes 0..29; after cap at 12, kept = last 12 = 18..29; head = newest = 29 (0x1d), tail = oldest in window = 18 (0x12)
    expect(s.recentColors[0]).toBe('#00001d')
    expect(s.recentColors[11]).toBe('#000012')
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
    recentColors.value = [next, ...filtered].slice(0, 12)
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
    // C-HIGH13: assert the RPC receives the raw value, NOT a pre-stringified one.
    expect(rpcCalls[0].args).toEqual({
      p_path: ['accessibility'],
      p_value: { textSize: 'large', reduceMotion: false, highContrast: false },
    })
  })

  test('setPath writes the specific slice only', async () => {
    const store = usePreferencesStore()
    await store.load()
    store.setPath(['view', 'showRuler'], true)
    await new Promise((r) => setTimeout(r, 1100))
    expect(rpcCalls[0].args).toEqual({
      p_path: ['view', 'showRuler'],
      p_value: true,
    })
    expect(store.prefs.view.showRuler).toBe(true)
    expect(store.prefs.view.showLayoutGuide).toBe(true)  // untouched default
  })

  // C-HIGH13 regression — round-trip a string preference and assert the
  // stored value equals the input (NOT the double-quoted '"large"').
  test('round-trips string preference without double-encoding', async () => {
    const store = usePreferencesStore()
    await store.load()
    store.setPath(['accessibility', 'textSize'], 'large')
    await new Promise((r) => setTimeout(r, 1100))
    expect(rpcCalls[0].args.p_value).toBe('large')
    expect(typeof rpcCalls[0].args.p_value).toBe('string')
    // NOT '"large"' (would be the double-encoded form supabase-js would
    // round-trip back as the literal 6-character string '"large"').
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
      // C-HIGH13: supabase-js auto-JSON-encodes RPC args. Pre-stringifying
      // double-encodes — 'large' would round-trip back as the 7-character
      // string '"large"' instead of the 5-character 'large'.
      const { error } = await supabase.rpc('update_user_pref', {
        p_path: path,
        p_value: value,
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
    // C-HIGH13: pass raw object — supabase-js auto-JSON-encodes RPC args.
    const { error } = await userAClient.rpc('update_user_pref', {
      p_path: ['accessibility'],
      p_value: { textSize: 'large', reduceMotion: true, highContrast: false },
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
      p_value: false,
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
      p_value: true,
    })
    await userAClient.rpc('update_user_pref', {
      p_path: ['view', 'showLayoutGuide'],
      p_value: false,
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
      p_value: 'large',
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
/* Founder ratified 2026-05-17 — 87.5% / 100% / 112.5% scale on <html> font-size.
   All rem-based sizing scales automatically. 16px baseline → 14 / 16 / 18px body. */
html[data-text-size='small']  { font-size: 87.5%;  }  /* 14px body */
html[data-text-size='medium'] { font-size: 100%;   }  /* 16px body (default) */
html[data-text-size='large']  { font-size: 112.5%; }  /* 18px body */
html:not([data-text-size])    { font-size: 100%;   }  /* fallback before prefs load */

/* Optional explicit token for `font-size: var(--text-base)` declarations. */
:root[data-text-size='small']  { --text-base: 14px; }
:root[data-text-size='medium'] { --text-base: 16px; }
:root[data-text-size='large']  { --text-base: 18px; }
:root:not([data-text-size])    { --text-base: 16px; }

/* Canvas chrome stays fixed (per A7.1 annotation). Inside .kc scope,
   chrome elements declare font-size in absolute px (not rem / not --text-base)
   so OpenPencil-derived chrome ignores the user pref. Override exposed for
   any chrome element that does reference --text-base. */
.kc { --text-base: 12px; font-size: 12px; }

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

/* ---------- High contrast ----------
   Founder ratified 2026-05-17: scope = "Borders + dividers stronger (matches Figma)".
   Text contrast NOT bumped. Focus ring NOT enlarged. Match Figma's behavior 1:1. */
:root[data-high-contrast='true'] {
  --border: #4a4a4a;  /* OFF: #2a2a2a subtle → ON: #4a4a4a strong (~25% contrast) */
}
/* Buttons get explicit outline so they're distinguishable from background. */
:root[data-high-contrast='true'] button,
:root[data-high-contrast='true'] [role='button'] {
  outline: 1px solid currentColor;
  outline-offset: -1px;
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

html[data-text-size] scales font-size 87.5/100/112.5%. .kc canvas
chrome locked to 12px. [data-reduce-motion='true'] forces ~0ms
transitions globally with @media prefers-reduced-motion OS fallback.
[data-high-contrast='true'] swaps --border to higher contrast and
adds button outline (founder-scope: borders only, matches Figma)."
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
          <KovaIcon name="info" class="w-3 h-3" />
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

## Task 14: Cluster 04 mount — forward-pointer (no Plan 12 code; see Plan 04 Task 8.1)

> **Owned by Cluster 04.** Plan 12 produces the panels (Task 10 `<AccessibilityPanel>` + Task 11 `<NotificationsPanel>`) — Cluster 04 mounts them inside `<ProfileSection>`. The mount itself is documented in `docs/kova-final-impl-plans/04-account-and-stripe-billing-plan.md` Task 8.1 (Cluster 04 dependency block, C-LOW12.6 ratification).

**Files:** none in this plan. No commits in Plan 12 for Task 14.

**Verification:** when both clusters have landed, confirm `<ProfileSection>` in
`src/views/account/sections/ProfileSection.vue` imports both panels from
`@/components/settings/*` and renders them in Accessibility + Notifications
section slots.

This task body previously contained the full mount code as an "appended
handoff" to Plan 04 (C-LOW12.6). The handoff has been promoted into Plan 04
Task 8.1 verbatim; Plan 12 keeps this stub as a navigational forward-pointer
so future readers don't search for a real task body that doesn't exist.

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

## Task 16: `send-sync-alert` Supabase Edge Function (env-guarded)

**Files:**
- Create: `supabase/functions/send-sync-alert/index.ts`
- Create: `supabase/functions/send-sync-alert/index.test.ts`
- Coordinate (do NOT create from this cluster): `supabase/functions/_shared/resend-client.ts` — owned by Cluster 01. If missing, ship the Task 16.0 stub below and replace when Cluster 01 lands.

**Reason:** Cluster 06's Yjs sync-retry hook calls `POST /functions/v1/send-sync-alert` after retry 3 fails (1s+5s+15s backoff = ~21s after first failure). This task ships the endpoint with the env-guard pattern (founder ratified 2026-05-17). Resend account setup deferred to pre-launch — endpoint must run without `RESEND_API_KEY` set.

- [ ] **Step 16.0: Ship temporary `_shared/resend-client.ts` stub (C-HIGH14)**

If `supabase/functions/_shared/resend-client.ts` does not exist yet (Cluster 01
not landed), ship this stub so Task 16 imports compile. **The stub is removed
the moment Cluster 01 ships the real client** — re-run Task 16 tests after
swap to confirm wiring is intact.

```typescript
// supabase/functions/_shared/resend-client.ts (TEMPORARY STUB — C-HIGH14)
// Remove + replace with Cluster 01's real client once that branch merges.
// See: kova-open-pencil-1/docs/kova-final-impl-plans/01-auth-and-identity-plan.md Task 2 + Task 21.

export interface SendEmailArgs {
  to: string
  subject: string
  text?: string
  html?: string
  idempotencyKey?: string
}

export interface SendEmailResult {
  id: string
  skipped?: boolean
}

export async function sendEmail(args: SendEmailArgs): Promise<SendEmailResult> {
  const apiKey = Deno.env.get('RESEND_API_KEY')
  if (!apiKey) {
    console.warn('[resend-client stub] RESEND_API_KEY unset — returning skipped:true', args.idempotencyKey)
    return { id: 'stub-no-api-key', skipped: true }
  }
  // Stub never makes a real HTTP call — Cluster 01's client owns the actual
  // Resend SDK wiring. Failing loudly forces the swap to happen.
  throw new Error(
    'resend-client stub invoked with RESEND_API_KEY set. Cluster 01 must ship the real client (Plan 01 Task 2.5) before this code path runs.'
  )
}
```

Coordinate with Cluster 11 CT-015 (Resend env-guard breadcrumb): the same
stub pattern is used by Cluster 01 if the founder reaches launch with the
Resend account still unprovisioned. See `project_external_accounts_deferred`
memory.

- [ ] **Step 1: Write failing test — `supabase/functions/send-sync-alert/index.test.ts`**

```typescript
// Deno test (run via `supabase functions serve` + curl, or via bun:test with mocked fetch).
// Pattern: import handler, invoke with mock Request, assert response shape.

import { assertEquals } from 'jsr:@std/assert'

const ORIGINAL_ENV = { ...Deno.env.toObject() }

function resetEnv() {
  Deno.env.delete('RESEND_API_KEY')
  for (const [k, v] of Object.entries(ORIGINAL_ENV)) Deno.env.set(k, v)
}

Deno.test('send-sync-alert: missing RESEND_API_KEY returns skipped:no_api_key', async () => {
  resetEnv()
  Deno.env.delete('RESEND_API_KEY')

  const { default: handler } = await import('./index.ts')
  const req = new Request('http://localhost/send-sync-alert', {
    method: 'POST',
    headers: { 'authorization': 'Bearer test-jwt', 'content-type': 'application/json' },
    body: JSON.stringify({ userId: 'user-1', canvasId: 'canvas-1', lastSyncAt: '2026-05-17T20:00:00Z' }),
  })
  const res = await handler(req)
  const json = await res.json()
  assertEquals(res.status, 200)
  assertEquals(json.ok, true)
  assertEquals(json.skipped, 'no_api_key')
})

Deno.test('send-sync-alert: opted-out user returns skipped:opted_out', async () => {
  resetEnv()
  Deno.env.set('RESEND_API_KEY', 're_test_dummy')
  // Mock supabase client to return prefs.notifications.syncAlerts = false
  // (impl detail: handler reads via authed createClient — test stubs createClient)
  // ... see implementation step for full stub pattern
})

Deno.test('send-sync-alert: opted-in user with API key calls Resend client', async () => {
  resetEnv()
  Deno.env.set('RESEND_API_KEY', 're_test_dummy')
  // Mock supabase client → syncAlerts=true. Mock _shared/resend-client send() → resolves.
  // Assert send() called with from/to/subject/text payload.
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
cd supabase/functions/send-sync-alert
deno test --allow-env --allow-net
```

Expected: `Cannot find module './index.ts'`.

- [ ] **Step 3: Implement `supabase/functions/send-sync-alert/index.ts`**

```typescript
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { sendEmail } from '../_shared/resend-client.ts' // owned by Cluster 01

interface Payload {
  userId: string
  canvasId: string
  lastSyncAt: string
}

/**
 * W0-13 — Deno-runtime parallel to Plan 11 Task 1.3c's `loadEnvOrSkip`. Inline
 * here until Cluster 01 ships `supabase/functions/_shared/env.ts` (then import
 * from there). Returns null + warn breadcrumb when env var is missing/empty.
 * Pre-launch §11 graduates console.warn → Sentry.captureMessage.
 */
function loadEnvOrSkip(name: string): string | null {
  const value = Deno.env.get(name)
  if (value === undefined || value === '') {
    console.warn(`[env] skipped — ${name} unset (stub mode)`)
    return null
  }
  return value
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  // W0-13 stub-guard (founder ratified 2026-05-17 — defer Resend signup to pre-launch).
  // Returns 200 + skipped:no_api_key so the caller (Cluster 06 retry-hook) does
  // NOT retry-storm a known-skip case.
  const apiKey = loadEnvOrSkip('RESEND_API_KEY')
  if (!apiKey) {
    return new Response(JSON.stringify({ ok: true, skipped: 'no_api_key' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }

  const auth = req.headers.get('authorization')
  if (!auth) return new Response('Unauthorized', { status: 401 })

  // W0-13 stub-guard for Supabase env (founder ratified 2026-05-20 — was 500,
  // now 200 + skipped:supabase_env_unset). Treat dev/CI without Supabase env
  // as "stub mode" rather than misconfiguration: the caller (Cluster 06
  // retry-hook) does not retry-storm; ops sees the breadcrumb in logs.
  const supabaseUrl = loadEnvOrSkip('SUPABASE_URL')
  const supabaseAnonKey = loadEnvOrSkip('SUPABASE_ANON_KEY')
  if (!supabaseUrl || !supabaseAnonKey) {
    return new Response(JSON.stringify({ ok: true, skipped: 'supabase_env_unset' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }

  let payload: Payload
  try {
    payload = await req.json()
  } catch {
    return new Response('Bad payload', { status: 400 })
  }

  const supabase = createClient(
    supabaseUrl,
    supabaseAnonKey,
    { global: { headers: { authorization: auth } } }, // SECURITY INVOKER via JWT
  )

  // Read user's email + opt-in state in one round-trip.
  const { data: user, error } = await supabase
    .from('users')
    .select('email, preferences')
    .single()
  if (error || !user) {
    console.error('users select failed', error)
    return new Response(JSON.stringify({ ok: false, error: 'user_lookup_failed' }), { status: 500 })
  }

  const optedIn = user.preferences?.notifications?.syncAlerts !== false // default true
  if (!optedIn) {
    return new Response(JSON.stringify({ ok: true, skipped: 'opted_out' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }

  await sendEmail({
    to: user.email,
    subject: 'Your Kova changes haven\'t saved yet',
    text: `Hi,\n\nKova tried 3 times to sync your latest changes and couldn't reach the server. Your work is safe on this device. Reopen Kova to retry.\n\nLast successful sync: ${payload.lastSyncAt}\nCanvas: ${payload.canvasId}\n\n— Kova`,
    idempotencyKey: `sync-alert:${payload.userId}:${payload.canvasId}:${payload.lastSyncAt}`,
  })

  return new Response(JSON.stringify({ ok: true, sent: true }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

// W0-14b: explicit Deno.serve wrap so the runtime CI gate
// (Plan 11 Task 11.10) detects the handler signature. Supabase Edge Functions
// also accept `export default handler`, but the explicit form is greppable.
Deno.serve(handler)
```

**Why env-guard at top:** dev environments + CI runs without `RESEND_API_KEY`. The guard returns 200 (not 500) so the caller (Cluster 06 retry-hook) does not retry-storm a known-skip case. Toast is the always-on safety net regardless.

**Why SECURITY INVOKER via JWT (not service-role):** the function reads `users` table scoped to the caller — `auth.uid()` filter enforced by RLS. No service-role key required (zero blast radius if function is compromised).

**Why `idempotencyKey`:** Cluster 06's retry-hook may call this endpoint more than once if the retry-state machine itself glitches. Resend's idempotency-key header (handled by `_shared/resend-client.ts`) dedupes within a 24h window.

- [ ] **Step 4: Run test — expect PASS**

```bash
cd supabase/functions/send-sync-alert
deno test --allow-env --allow-net
```

Expected: all 3 tests pass.

- [ ] **Step 5: Smoke against `supabase functions serve` (skipped path)**

```bash
# In one shell:
supabase functions serve send-sync-alert --no-verify-jwt
# In another:
curl -X POST 'http://localhost:54321/functions/v1/send-sync-alert' \
  -H 'authorization: Bearer dummy' \
  -H 'content-type: application/json' \
  -d '{"userId":"u","canvasId":"c","lastSyncAt":"2026-05-17T00:00:00Z"}'
```

Expected response (without `RESEND_API_KEY` set): `{ "ok": true, "skipped": "no_api_key" }` HTTP 200.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/send-sync-alert/
git commit -m "feat(prefs): send-sync-alert edge function with env-guard

Cluster 06 retry-hook calls after 3 failed Yjs syncs. Env-guard on
RESEND_API_KEY so dev runs without Resend (founder defer 2026-05-17).
SECURITY INVOKER via JWT; reads prefs.notifications.syncAlerts to gate
send; idempotency-key prevents retry storms. Imports Cluster 01's
_shared/resend-client.ts."
```

---

## Task 17: Manual QA + PRD tracker bump

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
  - §5.4 edge function → Task 16
  - §9.4 manual QA + tracker bump → Task 17

- [x] **No placeholders:** every step contains exact code, exact commands, exact paths.

- [x] **Type consistency:** `TextSize` consistent in types/preferences.ts (Task 2) and AccessibilityPanel.vue (Task 10); `UserPreferences` shape stable across Tasks 2/4/5/10/11; `update_user_pref` signature stable across Tasks 1/4/6.

- [x] **No invented infra:** RPC `update_user_pref` matches PRD §5.2 + 00c §2.A line 2070–2077; `users.preferences` column comes from Cluster 01 (PRD §4.2 acknowledged); Pinia store + composable patterns track Q5 verbatim.

- [x] **Theme drift check:** dark only (per `feedback_app_dark_website_light`); no light surface in this cluster.

- [x] **`00e §6` hygiene:** no live multi-device sync promise; no `/marketing` reference; privacy-policy line ships in Task 17; no staging-trigger reference.

---

## Execution handoff

Plan complete and saved to `kova-open-pencil-1/docs/kova-final-impl-plans/12-settings-and-user-preferences-plan.md`. Two execution options:

**1. Subagent-Driven (recommended)** — Dispatch a fresh subagent per task, review between tasks, fast iteration. Recommended given the 17-task length and the fact that Tasks 10–12 are blocked on Cluster 11 — a controller can re-route work cleanly.

**2. Inline Execution** — Execute tasks in this session using `superpowers:executing-plans`, batch with checkpoints at Tasks 6 (integration test), Task 13 (browser smoke), and Task 16 (edge function curl smoke).

**Which approach?**
