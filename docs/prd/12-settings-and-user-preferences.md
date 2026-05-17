# PRD 12 — Settings / Accessibility / User Preferences

## 0. Status & ownership

| Field | Value |
|---|---|
| **Status** | `DRAFT` 2026-05-15 |
| **Wave** | 3 (with Cluster 04) |
| **Author** | Claude (Opus 4.7) |
| **Reviewer** | Jiho Yang (founder) |
| **Last updated** | 2026-05-15 |
| **Depends on PRDs** | 01 Auth & Identity (ships `users.preferences` JSONB), 04 Account & Stripe (hosts Profile route), 11 Shared UI (`<KovaModal>`, `<KovaSegmented>`, `<KovaToggle>`, `useToast()`) |
| **Blocks PRDs** | 06 Canvas Editor Core Chrome (panel-collapse + view-toggle prefs), 08 Canvas Menus/Popovers/Shortcuts (recent-colors, ruler/guide/grid persistence, main-menu Preferences entry), 07b Canvas Engine Inspector + Overlays (Effects/Boolean view toggles persistence) |
| **Source artifacts** | Hi-fi: 2 files (A7 Account · A7.1 Profile section; A6+A2a Popovers + A8 Dialogs · A8.3 Accessibility modal). 03-doc: §2.9 (3 rows) + §3C #3 user-preferences storage + cross-cuts §2.4 / §2.7 / §2.8 / §2.10. Q-decisions: Q5 (corrected 2026-04-25 — two-layer architecture). Audit §2.A Cluster 12 (lines 2058–2128). |

---

## 1. Problem & outcome

### 1.1 Plain language (for founder)

Every other cluster has prefs to remember — Accessibility (text size / reduced motion / high contrast), AI toggles, View toggles (show ruler / layout guide / pixel grid / frame outlines / slice outlines / mask outlines), recent colors, panel-collapse states, last-active brand/canvas, dismissed toasts, notification opt-ins. Without a unified storage decision, every consumer reinvents persistence and prefs drift across devices.

This PRD ships the **two-layer preferences architecture** that Q5 ratified (better than Figma — Figma stores prefs local-only per its own forum, Kova syncs across devices for workflow prefs):

- **Layer 1 — `users.preferences` JSONB** (cross-device sync). Owned by the `usePreferencesStore` Pinia store. Reads on app boot, writes via a debounced `update_user_pref` RPC. Holds: accessibility, AI toggles, View toggles, default zoom + font, snap toggles (deferred-but-ready), notification opt-ins.
- **Layer 2 — `localStorage` via VueUse `useLocalStorage`** (per-device). Owned by the `useUIStateStore` Pinia store. Holds: panel-collapse states, sidebar widths, recent colors (24-color ring buffer), last-active brand + canvas (session resumption), dismissed-toast acknowledgments.

The same three Accessibility controls (text size, reduce motion, high contrast) render in **two places** using one component shell — embedded inside `/account/profile` (Cluster 04 hosts the route) and as the A8.3 modal reachable from main menu → Preferences → Accessibility (Cluster 08 owns main-menu wiring; this PRD ships the modal body). All toggles apply immediately (debounced server-write); no save-bar.

OS-level `prefers-reduced-motion: reduce` is respected as a default cue (auto-tick the toggle on first session if the OS says reduce); the user can override either way.

### 1.2 Caveman summary (per CLAUDE.md communication style)

User want preferences. Two buckets. **Layer 1 = server bucket** (sync across devices) — accessibility, AI toggle, view toggles, notifications. **Layer 2 = browser bucket** (per device) — recent colors, panel collapse, last-active brand. JSONB column on `users` table store layer 1. localStorage store layer 2. Pinia store wrap both. One RPC `update_user_pref` write debounced 1 second after toggle. Three accessibility controls (text size, motion, contrast) live in Profile page + same controls in popup modal — one component, two surfaces. Save instantly. No save button. OS says reduce motion → default to ON.

### 1.3 Outcome (acceptance gate)

User can: (1) toggle Text size / Reduce motion / High contrast inside Profile page OR via main menu → Preferences → Accessibility modal — same control, same value, syncs across devices within 1 second of last toggle; (2) toggle View prefs (showRuler / showLayoutGuide / showPixelGrid / showFrameOutlines / showSlices / showMaskOutlines) via canvas right-click → these stick across devices; (3) collapse Pages/Layers sections, drag sidebar widths, accumulate recent colors — these stay per-device; (4) opt in/out of product-update + sync-alert emails (Resend integration owned by Cluster 01) via Profile → Notifications; (5) on first boot, defaults load synchronously from `DEFAULTS` constant if server data hasn't arrived yet — no flash-of-unset-prefs.

A11y target: every control reachable via keyboard, screen-reader landmark + aria-label audit pass against WCAG 2.1 AA at the Profile section + A8.3 modal (other surfaces audited by their owning clusters).

---

## 2. Scope

### 2.1 In scope (this PRD)

**Storage layer:**
- `update_user_pref` SECURITY INVOKER RPC against existing `users.preferences` JSONB column (column itself ships in Cluster 01 migration `20260520_01_users_account_lifecycle.sql`)
- `usePreferencesStore` Pinia store — load on app boot, debounced 1000 ms server write, optimistic local update, default-merge on partial JSON
- `useUIStateStore` Pinia store — VueUse `useLocalStorage` wrappers for per-device prefs
- `use-preferences.ts` composable — type-safe getter/setter convenience over the store, scoped to a pref path
- `UserPreferences` TypeScript interface + `DEFAULTS` constant (single source of truth on shape — Q5)
- Per-pref allocation table (companion to this PRD §6.2.3) — which prefs go Layer 1 vs Layer 2

**Accessibility UI (Q5 + A7.1 + A8.3 hi-fi):**
- `<AccessibilityPanel>` reusable component — three controls (Text size segmented Small/Medium/Large, Reduce motion toggle, High contrast toggle)
- Rendering host 1: embedded as a subsection of `/account/profile` (Cluster 04 mounts; this PRD ships the panel)
- Rendering host 2: `<PreferencesModal>` wrapping `<AccessibilityPanel>` as the A8.3 dialog (main-menu Preferences → Accessibility — Cluster 08 wires the menu item; this PRD ships the modal)
- Apply-immediately semantics (no save-bar); a small "Saved · syncs across devices" toast on first toggle per session
- OS `prefers-reduced-motion: reduce` defaulting: on first ever boot, if OS says reduce, set `reduceMotion=true` (one-time auto-tick, user can override either way)

**Notifications UI (per A7.1 hi-fi + founder ratification 2026-05-15):**
- `<NotificationsPanel>` reusable component — `productUpdates` (Email · monthly) toggle + `syncAlerts` (Email · immediate) toggle
- `prefs.notifications: { productUpdates: boolean, syncAlerts: boolean }` Layer 1 JSONB block
- Rendering host: subsection of `/account/profile` (below Accessibility)
- Email-fan-out wiring is out of scope (Resend integration lives in Cluster 01 §5.4); this PRD only persists the user's preference

**View prefs receivers (storage only — overlays + UI live in other clusters):**
- `prefs.view: { showRuler, showLayoutGuide, showPixelGrid, showFrameOutlines, showSlices, showMaskOutlines }` Layer 1 JSONB block — Cluster 07b + Cluster 08 read these
- `prefs.ai: { showTextSuggestions }` Layer 1 JSONB block — Phase 2 deferred per `03-doc §2.7`, but the slot ships so 07b can flip it without a re-migration
- `prefs.snap: { snapToGrid, snapToGuides, snapToObjects }` Layer 1 JSONB block — UI deferred per `03-doc §2.10`, slot ships ready
- `prefs.defaults: { zoomLevel, fontFamily }` Layer 1 — engineering-ready slot; UI deferred

**Per-device receivers (storage):**
- `pagesCollapsed`, `layersCollapsed` booleans — Cluster 06 consumes
- `sidebarLeftWidth`, `sidebarRightWidth` numbers — Cluster 06 consumes
- `recentColors` string[] (24-color ring buffer) — Cluster 08 consumes
- `lastActiveBrandId` string | null — Cluster 02 (Dashboard) and Cluster 06 (Canvas) consume for session resumption
- `lastActiveCanvasId` string | null — Cluster 06 consumes
- `dismissedToasts` string[] — Cluster 11 consumes for "Don't show again"

**Test + smoke:**
- Unit tests against store merge logic + debounce + default fallback
- Integration tests against `update_user_pref` RPC (real Supabase test DB)
- E2E test: toggle in Profile, see modal updated, reload, persistence holds
- Manual QA smoke: cross-device sync within 1s; OS `prefers-reduced-motion` first-boot tick; CSS layer reflects high-contrast + textSize live

### 2.2 Out of scope (handed to other clusters)

| Item | Owning PRD |
|---|---|
| Schema migration adding `users.preferences` JSONB column | **01** Auth & Identity (ships `20260520_01_users_account_lifecycle.sql`) |
| `/account` route + Profile section route shell + sidebar nav | **04** Account & Stripe Billing |
| Main-menu `Preferences ›` submenu entry that opens A8.3 modal | **08** Canvas Menus, Popovers & Shortcuts |
| Canvas right-click items that flip `showRuler` / `showLayoutGuide` / `showPixelGrid` | **08** |
| The overlay extensions that READ `prefs.view.*` and render frame/slice/mask outlines / ruler / pixel grid | **07b** Canvas Engine Inspector + Overlays |
| Email fan-out for `notifications.productUpdates` / `notifications.syncAlerts` (Resend wiring) | **01** (Resend integration foundation) |
| `useConfirm()`, `useToast()`, `<KovaModal>`, `<KovaToggle>`, `<KovaSegmented>` primitives | **11** Shared UI Infrastructure |
| Recent-colors UI in color picker popover | **06** Canvas Editor Core Chrome |
| Pages/Layers section collapse interaction handlers | **06** |
| `useTextSuggestion()` (Phase 2 — AI inline suggestion popover that reads `prefs.ai.showTextSuggestions`) | **07b** when AI text suggestions un-defer |

### 2.3 Deferred to Phase 2

| Item | Why deferred | Slot ready? |
|---|---|---|
| Snap toggle re-introduction UI (Snap to grid / guides / objects) | Per Q24 + scope-plan §3 Cluster 08 — snap behavior always-on in MVP, no public toggle. UI returns post-MVP. | Yes — `prefs.snap.{snapToGrid, snapToGuides, snapToObjects}` slot ships, defaults all `true` |
| Custom keybindings UI | Per Q25 — registry-ready in Cluster 08 but binding-editor UI not in MVP. | Yes — `prefs.keybindings: Record<actionId, string>` slot reserved (empty default; overrides registry default) |
| AI text suggestions toggle UI | Per `03-doc §2.7` row — feature itself Phase 2. | Yes — `prefs.ai.showTextSuggestions` slot ships (default `true`) |
| Default zoom level / default font family UI | Engineering-ready; no hi-fi for the picker yet. | Yes — `prefs.defaults.{zoomLevel, fontFamily}` slot ships |
| Language / locale picker | Not in any hi-fi; MVP is en-US-only. | No slot — adds in a later migration if/when needed |
| Notifications channel beyond email (push, in-app banner) | A7.1 hi-fi only shows Email channel. | No slot — schema is `boolean` not `{ email: bool, push: bool }`; revisit when channels expand |
| Cross-device "active sessions" view | Out of MVP per Cluster 01 §2.3. | N/A |
| Theme toggle (light/dark/auto) | Per `feedback_app_dark_website_light` memory — dark inside app, light on auth/marketing, no toggle. | N/A — explicit non-feature |

### 2.4 Cross-cut acknowledgments (foreign owners)

- **Cluster 01** already ships `users.preferences jsonb NOT NULL DEFAULT '{}'::jsonb` (PRD 01 §4.1 line 170). This PRD CONSUMES — does not re-add the column.
- **Cluster 04** mounts `<AccessibilityPanel>` and `<NotificationsPanel>` inside its `/account/profile` Vue Router section. This PRD ships the panels as props-driven components; Cluster 04 imports + slots them in.
- **Cluster 08** wires the main-menu `Preferences ›` submenu entry that calls `usePreferencesModal().open()`. This PRD ships `<PreferencesModal>` + the open/close composable.
- **Cluster 11** ships `<KovaModal>`, `<KovaToggle>`, `<KovaSegmented>`, `<KovaButton>`, `useToast()` — this PRD consumes them by name only.
- **Cluster 06** consumes `useUIStateStore.pagesCollapsed`, `layersCollapsed`, `sidebarLeftWidth`, `sidebarRightWidth`, `lastActiveCanvasId`. Read-only contract from Cluster 06's side.
- **Cluster 07b** + **Cluster 08** consume `usePreferencesStore.prefs.view.*` (read-only) for the overlay extensions.
- **Cluster 02** + **Cluster 06** consume `useUIStateStore.lastActiveBrandId` for resume-on-load.

---

## 3. Visual spec

### 3.1 Surfaces

All surfaces use **dark theme** per `feedback_app_dark_website_light` (inside authenticated app).

| Surface | Route / Trigger | Hi-fi file | Scene ID | Notes |
|---|---|---|---|---|
| Accessibility subsection (embedded in Profile) | `/account/profile` — scrolls into view inside the Profile section, between Identity and Notifications | `main-main-kova-scope/batch-a/dark/Kova Hi-Fi A7 Account Page - Dark.html` | **A7.1 · §3 Accessibility** (lines 671–704) | Three rows: Text size segmented (Small / Medium / Large; default Medium), Reduce motion toggle (default Off — but auto-tick if OS `prefers-reduced-motion: reduce` on first boot), High contrast toggle (default Off). Save-bar at A7.1 bottom governs Identity fields only; Accessibility rows apply-immediately. |
| Notifications subsection (embedded in Profile) | `/account/profile` — below Accessibility | same | **A7.1 · §4 Notifications** (lines 707–725) | Two rows: Product updates (Email · monthly; default On), Sync alerts (Email · immediate; default On). Same apply-immediately contract. |
| Accessibility settings modal (A8.3) | Main menu → Preferences → Accessibility (Cluster 08 wires; opens `<PreferencesModal mode="accessibility">`) | `main-main-kova-scope/batch-a/dark/Kova Hi-Fi A6+A2a Popovers + A8 Dialogs - Dark.html` | **A8.3 Accessibility settings modal** (lines 803–887) | Same three controls as A7.1 §3 (Text size segmented, Reduce motion toggle, High contrast toggle). Footer carries `Saved to your account · syncs across devices` meta-text. Cancel + Save buttons present in hi-fi; per founder pick 2026-05-15 they are **decorative confirmations**, not gates — toggles apply on change, both buttons close the modal. Cancel reverts the in-modal optimistic update only when the debounced write hasn't fired yet (rare; <1 s). |

### 3.2 Component contract (one shell, two surfaces)

Per A7.1 + A8.3 hi-fi annotations ("design once, expose twice"), `<AccessibilityPanel>` is the **single source of truth** for the three controls. Both hosts render the same DOM contract:

```
<AccessibilityPanel /> ─────────┬───── slotted into <ProfileSection> in /account/profile
                                └───── slotted into <PreferencesModal mode="accessibility">
```

`<NotificationsPanel>` is single-host (only A7.1 mounts it) but built the same way for symmetry + future Phase-2 modal reuse.

### 3.3 CSS layer integration (textSize + highContrast)

Three Accessibility controls **drive global CSS state**, not Pinia-only state:

- **Text size:** set `data-text-size="small" | "medium" | "large"` on `<html>`. Tailwind 4 `@theme` block in `app.css` defines `--text-base: 14px | 15px | 17px` per attribute. Body / list / dialog text inherits via Tailwind's `text-base`. **Canvas chrome stays fixed** (per A7.1 annotation — "Tools and canvas chrome stay fixed"); apply via `:not(.kc)` scope or omit `--text-base` reference inside `.kc` block.
- **High contrast:** set `data-high-contrast="true" | "false"` on `<html>`. CSS layer in `app.css` overrides `--border`, `--ink-3`, `--ring` to higher-contrast hex values per design system file (`main-main-kova-scope/design-system/kova-hifi.css` `:root` block plus a `data-high-contrast="true"` override block to add).
- **Reduce motion:** set `data-reduce-motion="true" | "false"` on `<html>`. Tailwind `@theme` and global transition utilities respect via `[data-reduce-motion="true"] *, [data-reduce-motion="true"] *::before, [data-reduce-motion="true"] *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }` — same trick `@media (prefers-reduced-motion: reduce)` uses. Also respect OS via the media query for users on first boot before the server pref loads.

The CSS layer file lives at `kova-open-pencil-1/src/styles/accessibility.css` (NEW) imported in `app.css`. Engineers translate the design-system tokens into Tailwind `@theme` per `main-main-kova-scope/design-system/TOKEN_CANONICAL.md` (short-name token block); add high-contrast hex overrides to a `[data-high-contrast="true"]` selector at the top of the layer.

### 3.4 Design system references

- `main-main-kova-scope/design-system/design.md` — segmented control + toggle + dialog component contracts
- `main-main-kova-scope/design-system/kova-hifi.css` — canonical dark CSS. `.seg`, `.seg .o`, `.seg .o.on` (segmented control); `.toggle`, `.toggle.on` (binary toggle); `.dlg`, `.dlg-head`, `.dlg-body`, `.dlg-foot` (modal shell); `.row`, `.row-stack`, `.s-section` (form layout). Engineers translate each class into the equivalent `<KovaSegmented>` / `<KovaToggle>` / `<KovaModal>` Vue component rendering the same markup contract.
- `main-main-kova-scope/design-system/TOKEN_CANONICAL.md` — token vocabulary (use short-names: `--ink-2`, `--accent`, `--ring`, etc.)

No light surfaces in this cluster. Skip `kova-hifi-light.css`.

### 3.5 Figma reference (per "Figma Is the Reference" rule)

Verified against Figma's Accessibility settings docs (fetched 2026-05-15):
- **Menu path:** F6/Ctrl-F6 → Main menu → Preferences → Accessibility settings — opens a modal with toggles. Source: [help.figma.com/hc/en-us/articles/35063862380311](https://help.figma.com/hc/en-us/articles/35063862380311). **Matches Kova's main-menu → Preferences → Accessibility (A8.3 modal) path 1:1.**
- **Apply contract:** Figma toggles are flipped via Enter; apply on change. **Matches Kova's apply-immediately contract.**
- **Cross-device sync:** Figma stores prefs local-only per [Figma forum](https://forum.figma.com/suggest-a-feature-11/user-preferences-to-be-saved-on-account-level-in-software-4758) (cited in Q5). **Kova goes better — Layer 1 prefs sync across devices.**
- **Pref vocabulary:** Figma exposes "Adapt content to screen readers / Simplify focus navigation / Toggle enhanced contrast / Ignore Figma shortcuts in text fields / Auto-follow collaborator on spotlight." Kova MVP ships a **narrower set** (Text size / Reduce motion / High contrast) per founder hi-fi. Figma's screen-reader + ignore-shortcuts toggles are tracked for Phase 2 in §12 below. Kova's "High contrast" maps to Figma's "Toggle enhanced contrast for the Figma UI."

---

## 4. Data model

### 4.1 Schema migrations

**No new column.** The `users.preferences jsonb NOT NULL DEFAULT '{}'::jsonb` column ships in Cluster 01 migration `20260520_01_users_account_lifecycle.sql` (PRD 01 §4.1 lines 168–170).

This PRD ships **one additional migration** for the partial-update RPC:

File: `kova-open-pencil-1/supabase/migrations/20260603_12_user_preferences_rpc.sql`

```sql
-- ============================================================
-- Migration 20260603_12_user_preferences_rpc
-- Cluster 12 Settings / Accessibility / User Preferences
-- Pairs with: 20260520_01_users_account_lifecycle.sql (which ships users.preferences column)
-- ============================================================

BEGIN;

-- ---- update_user_pref: partial JSONB update via path-array ----
--
-- Caller passes a path like ['accessibility', 'textSize'] and a JSON value.
-- RPC writes via jsonb_set(create_missing := true), scoped to auth.uid().
-- SECURITY INVOKER + RLS on users table is the auth gate (must already exist from Cluster 01).
--
-- Why path-based: avoids "read-modify-write" pattern from the client. Each toggle
-- writes only its own slice; concurrent toggles to different slices never collide.

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
  'Cluster 12 partial pref update. p_path = JSONB key sequence (e.g. ARRAY[''accessibility'',''textSize'']). p_value = JSON-encoded new value. SECURITY INVOKER — RLS on users table enforces auth.uid() = id.';

COMMIT;
```

**Notes:**

1. **Idempotent** (`CREATE OR REPLACE`). Safe to re-run on staging snapshots.
2. **SECURITY INVOKER** (not DEFINER) because the `users` table's existing RLS policy already restricts writes to `id = auth.uid()` (Cluster 01 confirms this). DEFINER would bypass RLS unnecessarily; INVOKER is the tighter posture.
3. **`p_value jsonb` not `text`:** caller is responsible for `JSON.stringify` on the JS side (the Pinia store does this — see §6.2.1). Postgres accepts JSON-encoded literals directly.
4. **`create_missing := true` in `jsonb_set`:** path can target a key that doesn't exist yet (e.g., first-time write to `notifications.productUpdates`). Without it, `jsonb_set` is a no-op on missing paths — silent data loss.
5. **No `DELETE` variant in MVP:** caller never needs to unset a pref — `update_user_pref(['accessibility','reduceMotion'], 'false'::jsonb)` is sufficient. If a Phase-2 use-case emerges, add `delete_user_pref(p_path text[])` then.
6. **No row-level write log:** prefs are intentionally low-stakes (not audit-required). If a future compliance ask emerges, layer in a `pref_audit` table; not now.

### 4.2 RLS policies

**No new policy.** `users.preferences` is governed by the **existing** RLS policy on the `public.users` table (`users_self` policy, written in earlier migration `20260316_users.sql`, confirmed extended by Cluster 01 migration). The `update_user_pref` RPC runs SECURITY INVOKER so it inherits that policy.

Verification check during implementation: confirm the `users` table policy on `UPDATE` already covers `auth.uid() = id` (per Cluster 01 spec — should). If anything is missing, fix upstream in Cluster 01, not here.

### 4.3 Storage buckets

**None.** Preferences are JSONB; no file storage.

---

## 5. Backend

### 5.1 Edge Functions

**None.** Preferences write goes direct to Supabase Postgres via the `update_user_pref` RPC. No Edge Function shim required (latency-sensitive; round-trip should be Edge → DB direct).

### 5.2 RPCs (database functions)

| Name | Args | Return | Transaction boundary | Security | Notes |
|---|---|---|---|---|---|
| `update_user_pref` | `p_path text[]`, `p_value jsonb` | `void` | Single `UPDATE` — implicit transaction | INVOKER (relies on `users` RLS) | Partial-update via `jsonb_set(create_missing := true)`. Scoped to `auth.uid()`. |

Defined in §4.1 migration above.

### 5.3 Cron jobs

**None.** Preferences don't age out or need GC.

### 5.4 External integrations

**None directly.** `prefs.notifications.{productUpdates, syncAlerts}` are READ by Cluster 01's Resend integration when fan-out occurs; this PRD only persists the user's choice.

### 5.5 Compliance + docs deliverables

- Update `docs/legal/privacy-policy.md` (owned by Cluster 01) with a one-line addendum: "Preferences (accessibility, view, notifications) are stored on your account row and synced across your devices when you sign in." Already covered by the broader "We store user-supplied account data" clause; this is clarification, not a new disclosure category.

---

## 6. Frontend

### 6.1 Routes

**No new routes.** All UI mounts inside routes owned by other clusters.

| Surface | Mounting route | Owning PRD |
|---|---|---|
| Accessibility subsection | `/account/profile` (slotted into the Profile section component) | 04 |
| Notifications subsection | `/account/profile` (slotted below Accessibility) | 04 |
| A8.3 Accessibility modal | Overlay — no route. Opened via `usePreferencesModal().open('accessibility')` from main-menu Preferences (Cluster 08) | 08 wires the trigger; this PRD owns the modal body |

### 6.2 Pinia stores

#### 6.2.1 `usePreferencesStore` (Layer 1 — server-synced)

File: `kova-open-pencil-1/src/stores/preferences.ts` (NEW)

```typescript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import type { UserPreferences } from '@/types/preferences'
import { DEFAULTS, mergeWithDefaults } from '@/types/preferences'

export const usePreferencesStore = defineStore('preferences', () => {
  const prefs = ref<UserPreferences>(structuredClone(DEFAULTS))
  const loaded = ref(false)
  const loadError = ref<Error | null>(null)

  async function load(): Promise<void> {
    const auth = useAuthStore()
    if (!auth.userId) {
      prefs.value = structuredClone(DEFAULTS)
      loaded.value = true
      return
    }
    const { data, error } = await supabase
      .from('users')
      .select('preferences')
      .eq('id', auth.userId)
      .single()
    if (error) {
      loadError.value = error
      loaded.value = true
      return
    }
    prefs.value = mergeWithDefaults(data?.preferences ?? {}, DEFAULTS)
    loaded.value = true
    applyToDom(prefs.value)
  }

  const debouncedWrite = useDebounceFn(
    async (path: string[], value: unknown): Promise<void> => {
      const { error } = await supabase.rpc('update_user_pref', {
        p_path: path,
        p_value: JSON.stringify(value),
      })
      if (error) {
        loadError.value = error as Error
      }
    },
    1000,
  )

  function set<K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K],
  ): void {
    prefs.value = { ...prefs.value, [key]: structuredClone(value) }
    applyToDom(prefs.value)
    debouncedWrite([key as string], value)
  }

  function setPath(path: string[], value: unknown): void {
    prefs.value = setIn(prefs.value, path, value) as UserPreferences
    applyToDom(prefs.value)
    debouncedWrite(path, value)
  }

  function applyToDom(p: UserPreferences): void {
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
  }
})

function setIn<T>(obj: T, path: string[], value: unknown): T {
  if (path.length === 0) return value as T
  const [head, ...rest] = path
  const current = (obj as Record<string, unknown>)[head] ?? {}
  return {
    ...obj,
    [head]: setIn(current, rest, value),
  } as T
}
```

**Contract:**

- `load()` called once on `useAuthStore.signedIn` watch — populates `prefs` from server or falls back to `DEFAULTS`.
- `set(key, value)` performs an optimistic local update (immutable copy via spread + `structuredClone`) and queues a debounced server write 1 second later. Subsequent `set` calls within the window collapse to a single write per path.
- `setPath(path, value)` for nested writes (e.g., `setPath(['view', 'showRuler'], true)`).
- `applyToDom(prefs)` writes data attributes on `<html>` so CSS layer responds without re-render. Called on every local mutation + after `load`.
- Errors surface via `loadError` ref; consumer optionally toasts. No retry loop in MVP (next user action retries naturally).
- Immutable updates everywhere per `coding-style.md` rules.

#### 6.2.2 `useUIStateStore` (Layer 2 — device-local)

File: `kova-open-pencil-1/src/stores/ui-state.ts` (NEW)

```typescript
import { defineStore } from 'pinia'
import { useLocalStorage } from '@vueuse/core'

export const useUIStateStore = defineStore('ui-state', () => {
  // Panel-collapse — Cluster 06 consumer
  const pagesCollapsed = useLocalStorage('kova:ui:pages-collapsed', false)
  const layersCollapsed = useLocalStorage('kova:ui:layers-collapsed', false)

  // Sidebar widths — Cluster 06 consumer
  const sidebarLeftWidth = useLocalStorage<number>('kova:ui:sidebar-left-width', 240)
  const sidebarRightWidth = useLocalStorage<number>('kova:ui:sidebar-right-width', 264)

  // Recent colors (24-color ring buffer, FIFO) — Cluster 08 consumer
  const recentColors = useLocalStorage<string[]>('kova:ui:recent-colors', [])

  // Last-active brand + canvas — Cluster 02 + 06 consumers
  const lastActiveBrandId = useLocalStorage<string | null>('kova:ui:last-brand', null)
  const lastActiveCanvasId = useLocalStorage<string | null>('kova:ui:last-canvas', null)

  // "Don't show again" toast acknowledgments — Cluster 11 consumer
  const dismissedToasts = useLocalStorage<string[]>('kova:ui:dismissed-toasts', [])

  function pushRecentColor(hex: string): void {
    const current = recentColors.value
    const filtered = current.filter((c) => c.toLowerCase() !== hex.toLowerCase())
    const next = [hex, ...filtered].slice(0, 24)
    recentColors.value = next
  }

  function dismissToast(toastId: string): void {
    const current = dismissedToasts.value
    if (!current.includes(toastId)) {
      dismissedToasts.value = [...current, toastId]
    }
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

**Contract:**

- All keys prefixed `kova:ui:` so they don't collide with OpenPencil's own localStorage (`openpencil:*`) or Y.IndexedDB.
- VueUse `useLocalStorage` is the single source; reads + writes auto-serialize JSON.
- Immutable update helpers (`pushRecentColor`, `dismissToast`) follow `coding-style.md` rule — return new array, never `.push()`.

#### 6.2.3 Per-pref allocation (Q5 ratified — Layer 1 vs Layer 2)

Per founder 2026-05-15 pick (view toggles stay Layer 1 per Q5 — cross-device sticky workflow):

| Pref | Layer | Default | Consumer cluster |
|---|---|---|---|
| `accessibility.textSize` | 1 | `'medium'` | this PRD (CSS layer) |
| `accessibility.reduceMotion` | 1 | `false` (or `true` if OS `prefers-reduced-motion`) | this PRD (CSS layer) |
| `accessibility.highContrast` | 1 | `false` | this PRD (CSS layer) |
| `notifications.productUpdates` | 1 | `true` | 01 (Resend fan-out) |
| `notifications.syncAlerts` | 1 | `true` | 01 (Resend fan-out) |
| `view.showRuler` | 1 | `false` | 07b + 08 |
| `view.showLayoutGuide` | 1 | `true` (Figma-exact default-ON per Q24) | 07b |
| `view.showPixelGrid` | 1 | `false` (auto-shows at zoom > 800%) | 07b |
| `view.showFrameOutlines` | 1 | `false` | 07b |
| `view.showSlices` | 1 | `false` | 07b |
| `view.showMaskOutlines` | 1 | `false` | 07b |
| `ai.showTextSuggestions` | 1 | `true` (slot ships, UI Phase 2) | 07b |
| `snap.snapToGrid` | 1 | `true` (slot ships, UI deferred) | 06 (always-on behavior) |
| `snap.snapToGuides` | 1 | `true` (slot ships, UI deferred) | 06 (always-on behavior) |
| `snap.snapToObjects` | 1 | `true` (slot ships, UI deferred) | 06 (always-on behavior) |
| `defaults.zoomLevel` | 1 | `1` (slot, UI deferred) | 06 |
| `defaults.fontFamily` | 1 | `'Inter'` (slot, UI deferred) | 06 |
| `pagesCollapsed` | 2 | `false` | 06 |
| `layersCollapsed` | 2 | `false` | 06 |
| `sidebarLeftWidth` | 2 | `240` | 06 |
| `sidebarRightWidth` | 2 | `264` | 06 |
| `recentColors` | 2 | `[]` | 08 |
| `lastActiveBrandId` | 2 | `null` | 02 + 06 |
| `lastActiveCanvasId` | 2 | `null` | 06 |
| `dismissedToasts` | 2 | `[]` | 11 |

### 6.3 Composables

#### 6.3.1 `use-preferences.ts` (convenience wrapper)

File: `kova-open-pencil-1/src/composables/use-preferences.ts` (NEW)

```typescript
import { computed, type ComputedRef, type WritableComputedRef } from 'vue'
import { usePreferencesStore } from '@/stores/preferences'

/**
 * Returns a writable computed for a top-level preferences key.
 * Reads come from the store, writes route through store.set() (debounced).
 */
export function usePreference<K extends keyof UserPreferences>(
  key: K,
): WritableComputedRef<UserPreferences[K]> {
  const store = usePreferencesStore()
  return computed<UserPreferences[K]>({
    get: () => store.prefs[key],
    set: (next) => store.set(key, next),
  })
}

/**
 * Returns a writable computed for a deep path like ['view', 'showRuler'].
 * Use when nested field changes shouldn't replace the whole top-level group.
 */
export function usePreferencePath<T>(
  path: readonly string[],
): WritableComputedRef<T> {
  const store = usePreferencesStore()
  return computed<T>({
    get: () => path.reduce<unknown>((acc, k) => (acc as Record<string, unknown>)?.[k], store.prefs) as T,
    set: (next) => store.setPath([...path], next),
  })
}
```

Usage:

```vue
<script setup lang="ts">
const reduceMotion = usePreferencePath<boolean>(['accessibility', 'reduceMotion'])
</script>

<template>
  <KovaToggle v-model="reduceMotion" />
</template>
```

#### 6.3.2 `usePreferencesModal()` (A8.3 modal opener)

File: `kova-open-pencil-1/src/composables/use-preferences-modal.ts` (NEW)

```typescript
import { ref, readonly, type Ref } from 'vue'

type PreferencesMode = 'accessibility'  // narrow: only Accessibility ships in MVP

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

Singleton state (module-level refs) — both the main-menu trigger (Cluster 08) and the modal component (this PRD) reach the same state without prop drilling.

#### 6.3.3 `useReducedMotionDefault()` (one-time OS-cue tick)

File: `kova-open-pencil-1/src/composables/use-reduced-motion-default.ts` (NEW)

```typescript
import { usePreferencesStore } from '@/stores/preferences'

/**
 * On first ever load (no `accessibility.reduceMotion` key in the loaded prefs),
 * default reduceMotion = true if the OS media query says reduce. One-shot — does
 * not re-apply on subsequent loads, so the user can override either way.
 */
export function applyReducedMotionDefault(): void {
  const store = usePreferencesStore()
  if (!store.loaded) return
  // We can tell "first ever" by checking whether the server's prefs blob included an explicit key.
  // The store starts from DEFAULTS so we can't introspect after merge — instead, check raw row before merge.
  // Pattern: store.load() exposes `rawAccessibilityKeys` set; consumer checks set.has('reduceMotion').
  // (Implementation detail handled inside store.load() — see store unit test.)
  if (store.hasExplicitAccessibilityKey('reduceMotion')) return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    store.setPath(['accessibility', 'reduceMotion'], true)
  }
}
```

**Note** — the `hasExplicitAccessibilityKey` helper is added to the store as part of this PRD (introspects the pre-merge raw row from `load()`). Implementation: store keeps a small `Set<string>` of keys observed on the latest `load()`, populated before defaults are merged.

### 6.4 Components

All components live under `kova-open-pencil-1/src/components/settings/`.

#### 6.4.1 `<AccessibilityPanel>` — shared (A7.1 §3 + A8.3 body)

File: `src/components/settings/AccessibilityPanel.vue` (NEW)

Props: `none`. Emits: `none`. Slots: `none`.

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

Markup tracks A7.1 hi-fi (lines 671–704). `.row`, `.lbl`, `.sub`, `.val` are Tailwind utility class compositions per the design-system spec (translate the kova-hifi.css class definitions). `KovaSegmented` + `KovaToggle` are Cluster 11 primitives.

#### 6.4.2 `<NotificationsPanel>` — A7.1 §4 only

File: `src/components/settings/NotificationsPanel.vue` (NEW)

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

#### 6.4.3 `<PreferencesModal>` — A8.3 modal

File: `src/components/settings/PreferencesModal.vue` (NEW)

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
      <div class="dlg-foot">
        <div class="l flex items-center gap-2">
          <icon-lucide-info class="w-3 h-3" />
          <span>Saved to your account · syncs across devices.</span>
        </div>
        <div class="r flex items-center gap-2">
          <button class="btn" @click="close">Cancel</button>
          <button class="btn primary" @click="close">Save</button>
        </div>
      </div>
    </template>
  </KovaModal>
</template>
```

**Cancel + Save are both close** (per founder pick 2026-05-15 — apply-immediately contract). The two buttons are present per A8.3 hi-fi but they do not gate the write — toggles already wrote through the store before the user clicked. If a Phase-2 ask emerges to truly stage changes, swap the contract here without changing the panel.

`<PreferencesModal>` is mounted **once globally** (e.g., inside the app shell layout) so the singleton state in `usePreferencesModal()` controls it from anywhere.

#### 6.4.4 Component shells reserved for Phase 2 (no MVP work)

- `<AISettingsPanel>` — empty placeholder. When AI text suggestions un-defer (07b), this panel renders a single toggle bound to `prefs.ai.showTextSuggestions`. Slot ships ready in the store.
- `<ViewPrefsPanel>` — empty placeholder. Reserved if a future "View ⋮" UI surface needs a panel beyond the canvas right-click items (which live in Cluster 08).

These are NOT shipped in MVP (per `2.3`). Listed here so future PRDs know the file paths are reserved.

### 6.5 Drag-and-drop handlers

**N/A** — preferences don't participate in DnD.

---

## 7. Tool layer / canvas-engine touches

**N/A — no engine touches.**

This is a pure-frontend cluster. Pinia stores + Vue components + one SQL RPC. No `packages/core/` modifications. No `tools/` registry changes. No renderer extensions.

---

## 8. Acceptance criteria

### 8.1 Storage layer

- [ ] `update_user_pref(p_path text[], p_value jsonb)` exists, SECURITY INVOKER, granted to `authenticated` role
- [ ] Calling `update_user_pref(ARRAY['accessibility','textSize'], '"large"'::jsonb)` updates only that slice; siblings unchanged
- [ ] Calling with a deep path that doesn't yet exist (e.g., `['notifications','productUpdates']` on a fresh `'{}'::jsonb`) succeeds via `create_missing := true`
- [ ] RLS denies `update_user_pref` for an unauthenticated caller (anon → error)
- [ ] RLS denies cross-user writes (user A signed-in cannot mutate user B's row — `auth.uid() = id` gate)
- [ ] `users.preferences` JSONB column exists and defaults to `'{}'::jsonb` on every new signup (confirmed via Cluster 01 migration; this PRD asserts in integration test)

### 8.2 Pinia stores

- [ ] `usePreferencesStore.load()` populates from server; on first ever load with empty JSONB, falls back to `DEFAULTS` without writing
- [ ] `usePreferencesStore.set(key, value)` updates `prefs` immutably (no in-place mutation; verified by reference comparison)
- [ ] `usePreferencesStore.set` triggers exactly one server write per 1000 ms window per path (debounce verified via fake-timer unit test)
- [ ] `usePreferencesStore.setPath(['view', 'showRuler'], true)` writes only the `showRuler` slice, not the entire `view` block
- [ ] On `set`, `<html>` data attributes (`data-text-size`, `data-reduce-motion`, `data-high-contrast`) reflect new value within the same Vue tick
- [ ] `mergeWithDefaults` handles missing keys, extra keys, and type-mismatched keys by falling back to defaults for the bad key (defensive parse)
- [ ] `useUIStateStore.pushRecentColor(hex)` dedupes case-insensitively + caps at 24 + FIFO (oldest evicts)
- [ ] `useUIStateStore` keys are all prefixed `kova:ui:` (no collisions with OpenPencil's namespace)

### 8.3 Accessibility UI

- [ ] `<AccessibilityPanel>` rendered inside `/account/profile` shows current values; flipping a toggle reflects in the modal if both are open (singleton state)
- [ ] `<AccessibilityPanel>` rendered inside `<PreferencesModal>` shows the same current value as inside Profile
- [ ] Text size segmented control: keyboard-navigable via Left/Right arrows; Enter applies; reads as a `radiogroup` to screen readers
- [ ] Reduce motion + High contrast toggles: keyboard-toggleable via Space; aria-pressed reflects state
- [ ] Toggling High contrast → `<html>` gains `data-high-contrast="true"` → CSS layer applies high-contrast tokens within the same paint cycle
- [ ] Toggling Reduce motion → page-level transitions + AI streaming animations cut to ~0ms (verified by a transitioned element's `transitionDuration` computed style)
- [ ] Toggling Text size → `<html>` gains `data-text-size="large"` → `--text-base` resolves to the large value; canvas chrome (`.kc {}` scoped) is unchanged
- [ ] On first session with no server pref and OS `prefers-reduced-motion: reduce`, `reduceMotion` initializes to `true` (one-time auto-tick); user can untoggle it and the choice persists thereafter
- [ ] On subsequent sessions, server value wins (OS state never re-overrides explicit user choice)

### 8.4 Notifications UI

- [ ] `<NotificationsPanel>` shows two toggles (Product updates / Sync alerts) with `Email · monthly` / `Email · immediate` labels
- [ ] Both default to `true` on a fresh account
- [ ] Toggling persists across reload + cross-device (assert via integration test against a real Supabase test DB)

### 8.5 View prefs slot

- [ ] `prefs.view.{showRuler, showLayoutGuide, showPixelGrid, showFrameOutlines, showSlices, showMaskOutlines}` slot exists in `UserPreferences` shape
- [ ] `prefs.view.showLayoutGuide` defaults to `true` (Figma-exact per Q24)
- [ ] Setting any `view.*` pref via `setPath(['view', key], value)` persists across reload
- [ ] Cluster 07b + Cluster 08 consumers can read `usePreferencesStore.view.*` reactively (verified in their own PRD acceptance gates)

### 8.6 Performance

- [ ] On signed-in app boot, `usePreferencesStore.load()` resolves in < 200 ms (single row read, single network round-trip)
- [ ] Debounced write does not block UI (verified by toggling 10 times in a row and watching no jank in the segmented control)
- [ ] First-paint `data-*` attributes set BEFORE any pref-dependent component renders (no flash-of-default-prefs — load is awaited in a top-level `<Suspense>` or set synchronously to defaults until load resolves; either ships)

### 8.7 Security

- [ ] No client-side bypass: attempting to write another user's prefs via `supabase.rpc('update_user_pref', { p_path: [...], p_value: ... })` while signed in as user A and targeting user B (impossible via the RPC body, but probed via integration test that mocks `auth.uid()` mismatch) yields zero rows updated
- [ ] No XSS surface: pref values rendered as text only (Text size = `'small'|'medium'|'large'`; toggles = boolean). No HTML interpolation anywhere
- [ ] No PII in localStorage: `kova:ui:*` keys hold ID strings (brand id, canvas id, color hex, toast id), no user emails or names

### 8.8 Hygiene rules (from `00e §6`)

- [ ] PRD does not promise live multi-device sync (writes are last-write-wins with ~1 s debounce; the "syncs across devices" copy in A8.3 footer reflects this — observer device picks up on next `load()`, not realtime)
- [ ] PRD does not reference `/marketing` route
- [ ] Privacy policy disclosure of preference data is added to Cluster 01's policy doc (this PRD ships the one-line addendum spec — see §5.5)

---

## 9. Test plan

### 9.1 Unit tests (`bun run test:unit`)

File: `kova-open-pencil-1/tests/stores/preferences.test.ts`

- `mergeWithDefaults` test matrix:
  - empty server blob → exact `DEFAULTS` clone
  - server blob with one key set → defaults except that key
  - server blob with extra unknown key → key ignored, rest defaulted
  - server blob with type-mismatched key (e.g., `accessibility.textSize: 42`) → falls back to default for that key, others honored
- `set('accessibility', { ... })` triggers exactly one RPC call within 1 s (use `bun:test` fake timer)
- Three consecutive `set` calls within 1 s collapse to one RPC call carrying the final value
- `set` on path A and `set` on path B within 1 s yield two RPC calls (one per path)
- `setPath(['view', 'showRuler'], true)` writes path `['view','showRuler']`, value `true`
- `applyToDom` sets all three `<html>` data attributes correctly on every mutation
- `applyReducedMotionDefault` no-ops if `hasExplicitAccessibilityKey('reduceMotion')` is `true`
- `applyReducedMotionDefault` writes `reduceMotion: true` only when OS query matches AND no explicit key

File: `kova-open-pencil-1/tests/stores/ui-state.test.ts`

- `pushRecentColor` dedupes case-insensitively (`#FF00AA` vs `#ff00aa`)
- `pushRecentColor` caps at 24 + evicts oldest FIFO
- `dismissToast` is idempotent (calling twice → array still has one entry)
- All keys are prefixed `kova:ui:` (assertion against `Object.keys(localStorage)` after store init)

Coverage target: ≥ 90% of statements in `src/stores/preferences.ts` + `src/stores/ui-state.ts` + `src/composables/use-preferences.ts` + `src/composables/use-reduced-motion-default.ts`.

### 9.2 Integration tests (against local Supabase)

File: `kova-open-pencil-1/tests/integration/preferences-rpc.test.ts`

- `update_user_pref` against a real Postgres: writes round-trip through `jsonb_set` correctly
- RLS denies: signed-in-as-A cannot write user-B's row (mock `auth.uid()` mismatch via JWT swap)
- Anon caller gets denied
- `create_missing := true` writes new deep key (start from `'{}'::jsonb`, write `['notifications','productUpdates']`, read back, assert shape)
- Two concurrent updates to disjoint paths from the same user both succeed (no jsonb_set serialization fight)

### 9.3 E2E tests (Playwright via `bun run test`)

File: `kova-open-pencil-1/tests/e2e/preferences.spec.ts`

- Sign in → open `/account/profile` → flip Text size to Large → reload → expect Text size still Large
- Open `/account/profile` (browser tab 1) → open A8.3 modal in browser tab 2 → flip High contrast in tab 2 → wait 1.5 s → reload tab 1 → expect High contrast on in tab 1
- Open A8.3 modal → flip Reduce motion → confirm a transitioned element has near-0ms transitionDuration
- Open `/account/profile` → Notifications Product updates default ON → flip OFF → reload → still OFF
- `<html data-text-size="...">`, `<html data-reduce-motion="...">`, `<html data-high-contrast="...">` reflect current pref on every page

### 9.4 Manual QA (founder browser smoke per `feedback_browser_smoke_test_before_done`)

- [ ] Open Profile → Accessibility → cycle Text size — body text changes, canvas chrome doesn't
- [ ] Toggle High contrast — borders + focus rings thicken / darken; visually different
- [ ] Toggle Reduce motion — panel slide animations cut; AI streaming feels instant
- [ ] Toggle Notifications — toast confirms save; no console error
- [ ] Open main menu → Preferences → Accessibility → modal opens, shows same values as Profile section; flip a toggle → close → reopen Profile → value reflected
- [ ] Sign in on a second browser (incognito) → Profile shows the values written on the first browser within ~1 s after debounce
- [ ] Clear localStorage on browser → reload → Layer 2 prefs reset (recent colors empty, panel collapse default) but Layer 1 prefs intact
- [ ] On a machine with OS `Reduce motion` ON → first ever sign-in → Accessibility → Reduce motion toggled ON automatically
- [ ] Test on Tauri desktop build: prefs sync identically (same Supabase backend)

### 9.5 Pre-commit + CI verifications

- [ ] `bun run check` (oxlint + type-check) passes
- [ ] `bun run format` produces no diff
- [ ] `bun run test:unit` green
- [ ] `bun run test` green (Playwright)
- [ ] `bun run test:dupes` stays under 3% (no copy-paste duplication created by store/composable)

---

## 10. Rollout phasing

### Phase A — initial deploy (Wave 3 close)

Ships with Cluster 04 (same wave). Order of merge:

1. Cluster 01 `users.preferences` column migration (already in PRD 01 — must be live first)
2. This PRD's `20260603_12_user_preferences_rpc.sql` migration
3. `usePreferencesStore` + `useUIStateStore` + composables + `<AccessibilityPanel>` + `<NotificationsPanel>` + `<PreferencesModal>`
4. Cluster 04 mounts `<AccessibilityPanel>` + `<NotificationsPanel>` inside its Profile section (coordinate PR)
5. Cluster 08 wires the main-menu Preferences entry (later wave; until then, Profile is the only host — acceptable)

### Phase B — pre-launch activation

- View toggle UI ships when Cluster 07b + Cluster 08 land (canvas right-click items). Until then, slot exists and defaults apply; no user-facing change.
- AI text suggestions toggle visible when 07b un-defers the feature.
- Snap toggle UI exposed once the founder un-defers per Q24 follow-up.

### Feature flags (per `00d` 2.B 10 default — hard-coded constants for MVP)

- `PREFS_REDUCED_MOTION_OS_DEFAULT_ENABLED = true` — controls whether the one-time OS cue applies. Default ON; set OFF if a regression surfaces.
- No other flags for this cluster.

---

## 11. Cross-cuts to other PRDs

| Other PRD | What we depend on | What they depend on us for |
|---|---|---|
| **01** Auth & Identity | `users.preferences jsonb` column ships in Cluster 01 migration; RLS on `users` table enforces `auth.uid() = id` for the `update_user_pref` RPC; one-line privacy-policy addendum text owned by 01 | Cluster 01 Resend integration reads `prefs.notifications.{productUpdates, syncAlerts}` to gate fan-out |
| **04** Account & Stripe Billing | `/account/profile` Vue Router section mounts `<AccessibilityPanel>` + `<NotificationsPanel>` | We provide both as zero-prop reusable components |
| **08** Canvas Menus, Popovers & Shortcuts | Main-menu Preferences entry calls `usePreferencesModal().open('accessibility')`; canvas right-click items mutate `prefs.view.*` via `usePreferencesStore.setPath` | We expose the modal + the store; we ship `prefs.view.*` slots in the `UserPreferences` shape |
| **07b** Canvas Engine Inspector + Overlays | Overlay extensions read `usePreferencesStore.view.*` reactively to decide whether to render | We expose reactive getters with documented defaults |
| **06** Canvas Editor Core Chrome | Panel-collapse + sidebar width state + last-active brand/canvas resume | We expose `useUIStateStore.{pagesCollapsed, layersCollapsed, sidebarLeftWidth, sidebarRightWidth, lastActiveBrandId, lastActiveCanvasId}` |
| **02** Onboarding & Dashboard | Resume-on-load uses `lastActiveBrandId` | We expose `useUIStateStore.lastActiveBrandId` |
| **11** Shared UI Infrastructure | `<KovaModal>`, `<KovaSegmented>`, `<KovaToggle>`, `<KovaButton>`, `useToast()` | None |
| **10** AI Chat + Memory + Tool Layer | `prefs.ai.showTextSuggestions` reads for the AI inline suggestion popover (Phase 2) | We expose the slot |

### 11.1 Hygiene rules from `00e §6`

- [x] Does not promise live multi-device sync — "syncs across devices" copy means eventual (debounced + next-load), not realtime
- [x] No reference to `/marketing` anywhere in this PRD
- [x] Privacy-policy addendum spec passed to Cluster 01 (§5.5)
- [x] No mention of staging-Supabase activation trigger (none required for this PRD)

---

## 12. Risks + open questions

### 12.1 RISK (Low) — JSONB schema evolution under load

Adding new pref keys later is a TS-interface change only (no migration). But if we ever need to RENAME a key (e.g., `prefs.ai.showTextSuggestions` → `prefs.editor.showAISuggestions`), we'll need a one-shot data-migration script + `mergeWithDefaults` aliasing for the transition window. Mitigation: stable naming convention now (group prefs by `accessibility / view / ai / snap / defaults / notifications`); avoid putting unrelated keys at the top level.

### 12.2 RISK (Low) — `prefers-reduced-motion` one-shot tick can confuse founder if QA on a machine with OS reduce-motion ON

Founder may first-load and see Reduce motion already on, wonder why. Mitigation: when the OS cue auto-ticks, raise a one-time toast: `Reduce motion is on because your OS prefers reduced motion. You can turn it off here anytime.` Dismissible; uses the `dismissedToasts` Layer 2 store. §6.3.3 composable will emit this toast.

### 12.3 RISK (Low) — Save-button-as-decoration in A8.3 modal could mislead

A8.3 hi-fi shows Cancel + Save buttons. Per founder pick, both close the modal (no gate). A power user might Save expecting "make persistent" semantics and only then realize toggles already wrote. Mitigation: footer copy `Saved to your account · syncs across devices.` already telegraphs apply-immediately. If user-research shows confusion, swap to a single `Done` button in a follow-up.

### 12.4 RISK (Low) — Cross-tab divergence within the 1-s debounce window

If user toggles in tab 1 → opens tab 2 within 1 s → tab 2's `load()` may read pre-debounce state and miss the new value. Mitigation: tab 2 picks up correct value on next focus or next session; we don't broadcast within-tab. Real-time channel for prefs would be over-engineered.

### 12.5 RISK (Low) — Hi-fi divergence between A7.1 save-bar and A8.3 apply-immediately

A7.1 shows a save-bar at the Profile section bottom (`1 unsaved change · Name · Discard · Save changes`). The save-bar governs **Identity fields** (Name, avatar upload). Accessibility + Notifications **bypass the save-bar** per apply-immediately contract. Engineer reading A7.1 hi-fi alone could misinterpret. Mitigation: §6.4.1 + §6.4.2 spec is explicit; PRD 04 (which owns the save-bar) must scope it to Identity fields only.

### 12.6 ESCALATE — Should `<html data-text-size>` also scope to `.dlg` and other portaled overlays?

The "Tools and canvas chrome stay fixed" rule (A7.1 annotation) means `.kc {}` block stays at fixed sizes. But modals, popovers, and toasts portal to `document.body`, not into `.kc`. They should scale with text-size since they're "dialog text" per the A7.1 sub-copy. Verify during implementation. Likely fine because `--text-base` on `:root` applies via inheritance; just confirm canvas-chrome `.kc {}` block doesn't reference `--text-base`.

### 12.7 OPEN QUESTION — Phase-2 Figma-parity Accessibility prefs

Figma exposes 5 accessibility toggles (per docs fetched 2026-05-15):
1. Adapt content to screen readers
2. Simplify focus navigation in the Actions menu
3. Toggle enhanced contrast for the Figma UI ← maps to our `highContrast`
4. Ignore Figma shortcuts in text fields
5. Automatically follow a collaborator when they turn on spotlight (multiplayer — N/A for Kova MVP per Q6)

Kova MVP ships 3 (textSize, reduceMotion, highContrast). Should we add the screen-reader + ignore-shortcuts toggles in Phase 2 to match Figma further? Recommend yes per `Figma Is the Reference` rule. Slot is cheap (add `accessibility.screenReaderAdapt: boolean` + `accessibility.ignoreShortcutsInTextFields: boolean`). Tracked here; not blocking MVP.

### 12.8 RESOLVED 2026-05-15 — Settings IA pick

Founder picked Option A: embed in Profile + A8.3 modal (no standalone `/account/settings` route). §3.1 + §6 spec'd accordingly.

### 12.9 RESOLVED 2026-05-15 — View-toggle persistence layer

Founder picked Layer 1 (Q5 ratified — cross-device sticky workflow). §6.2.3 allocation table reflects.

### 12.10 RESOLVED 2026-05-15 — Accessibility save UX

Founder picked apply-immediately, no save-bar. §6.4.1 + §6.4.3 spec'd accordingly.

### 12.11 RESOLVED 2026-05-15 — Notifications ownership

Founder picked Cluster 12 owns; Layer 1 `prefs.notifications`. §6.2.3 + §6.4.2 spec'd.

### 12.12 RESOLVED — `textSize` value vocabulary

Audit `00c §2.A` line 2122 uses `'small' | 'normal' | 'large'`. Hi-fi A7.1 + A8.3 use `Small / Medium / Large`. Q5 TypeScript shape uses `'small' | 'medium' | 'large'`. **Resolution:** hi-fi + Q5 win → `'small' | 'medium' | 'large'`. Audit is outdated on this string. Documented here.

---

## 13. References

### 13.1 03-doc rows covered

- §2.9 (3 rows) — Accessibility modal, Page collapse persistence, Layers collapse persistence
- §3C #3 — User-preferences storage layer
- Cross-cuts: §2.4 Page/Layers collapse, §2.7 Show text suggestions + view-toggle persistence (Frame/Mask/Slice outlines), §2.8 Recent colors, §2.10 Show ruler/layout-guide/pixel-grid persistence
- §3A consolidation — User-preferences storage decision

### 13.2 Q-decisions baked in

- **Q5** (corrected 2026-04-25) — Two-layer architecture; per-pref allocation table; JSONB column + RPC + Pinia patterns + TypeScript shape + DEFAULTS. **This PRD is the Q5 implementation.**

### 13.3 Hi-fi files

- `main-main-kova-scope/batch-a/dark/Kova Hi-Fi A7 Account Page - Dark.html` — A7.1 Profile section (lines 555–748), specifically Accessibility subsection (lines 671–704) + Notifications subsection (lines 707–725)
- `main-main-kova-scope/batch-a/dark/Kova Hi-Fi A6+A2a Popovers + A8 Dialogs - Dark.html` — A8.3 Accessibility modal (lines 803–887)

### 13.4 Design system

- `main-main-kova-scope/design-system/design.md` — segmented control + toggle + dialog component contracts
- `main-main-kova-scope/design-system/kova-hifi.css` — canonical dark CSS (`.seg`, `.toggle`, `.dlg-*`, `.row`, `.row-stack`, `.s-section` classes)
- `main-main-kova-scope/design-system/TOKEN_CANONICAL.md` — token vocabulary (short-names)

### 13.5 Audit + verification inputs

- `kova-open-pencil-1/docs/prd/00c-COMPREHENSIVE_AUDIT_REPORT.md` §2.A Cluster 12 (lines 2058–2128) — pre-baked spec used as the structural foundation here
- `kova-open-pencil-1/docs/prd/00d-EXTERNAL_VERIFICATION_HANDOFF.md` — no cluster-12-specific items
- `kova-open-pencil-1/docs/prd/00e-EXTERNAL_VERIFICATION_VERDICT.md` — §6 hygiene rules respected (see §11.1)

### 13.6 External sources cited

- [Figma · Adjust accessibility preferences](https://help.figma.com/hc/en-us/articles/35063862380311) (fetched 2026-05-15) — confirms main-menu → Preferences → Accessibility modal path matches Kova's A8.3
- [Figma · Change your preferences index](https://help.figma.com/hc/sections/4403936364311) — full Figma preference catalog (used to inform Phase-2 ask in §12.7)
- [Figma forum · "User preferences to be saved on account level"](https://forum.figma.com/suggest-a-feature-11/user-preferences-to-be-saved-on-account-level-in-software-4758) — confirms Figma stores prefs local-only; Kova goes better (Layer 1)

### 13.7 Memory pointers consulted

- `feedback_app_dark_website_light` — dark inside authenticated app; no theme toggle ever
- `feedback_figma_ui_theme` — Figma is the visual reference for the controls
- `feedback_build_better_not_easier` — Q5 two-layer architecture is the "build better" pick (Figma is local-only)
- `feedback_verify_with_docs` — Figma sources fetched + cited in §13.6
- `feedback_browser_smoke_test_before_done` — manual QA list in §9.4

### 13.8 What is NOT in this PRD (handed elsewhere)

- The `users.preferences` JSONB **column** — Cluster 01 migration
- The `/account/profile` route shell + save-bar for Identity fields — Cluster 04
- The main-menu Preferences trigger — Cluster 08
- The canvas right-click items that flip `view.*` prefs — Cluster 08
- The overlay extensions that READ `view.*` and render outlines/guides/grids — Cluster 07b
- The Resend email fan-out for `notifications.*` — Cluster 01
- The toast / modal / segmented / toggle primitives — Cluster 11
- Custom keybindings UI — Phase 2 / Cluster 08 follow-up
- Theme toggle — never (per dark-app rule)

---

## Appendix A — `UserPreferences` TypeScript shape (single source of truth)

File: `kova-open-pencil-1/src/types/preferences.ts` (NEW)

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
    showLayoutGuide: true,   // Figma-exact per Q24
    showPixelGrid: false,
    showFrameOutlines: false,
    showSlices: false,
    showMaskOutlines: false,
  },
  snap: { snapToGrid: true, snapToGuides: true, snapToObjects: true },
  defaults: { zoomLevel: 1, fontFamily: 'Inter' },
  notifications: { productUpdates: true, syncAlerts: true },
}

export function mergeWithDefaults(
  partial: unknown,
  defaults: UserPreferences,
): UserPreferences {
  if (!partial || typeof partial !== 'object') return structuredClone(defaults)
  const p = partial as Record<string, unknown>
  return {
    accessibility: mergeGroup(
      p.accessibility,
      defaults.accessibility,
      isAccessibilityValid,
    ),
    ai: mergeGroup(p.ai, defaults.ai, isAIValid),
    view: mergeGroup(p.view, defaults.view, isViewValid),
    snap: mergeGroup(p.snap, defaults.snap, isSnapValid),
    defaults: mergeGroup(p.defaults, defaults.defaults, isDefaultsValid),
    notifications: mergeGroup(
      p.notifications,
      defaults.notifications,
      isNotificationsValid,
    ),
  }
}

// Per-group validators (one each — defensive parse, fall back to default key-by-key on mismatch).
// Full validator bodies live in the test file's fixtures + the implementation file.
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
```

---

## Appendix B — files created / modified by this PRD's implementation

**NEW files:**

- `kova-open-pencil-1/supabase/migrations/20260603_12_user_preferences_rpc.sql`
- `kova-open-pencil-1/src/types/preferences.ts`
- `kova-open-pencil-1/src/stores/preferences.ts`
- `kova-open-pencil-1/src/stores/ui-state.ts`
- `kova-open-pencil-1/src/composables/use-preferences.ts`
- `kova-open-pencil-1/src/composables/use-preferences-modal.ts`
- `kova-open-pencil-1/src/composables/use-reduced-motion-default.ts`
- `kova-open-pencil-1/src/components/settings/AccessibilityPanel.vue`
- `kova-open-pencil-1/src/components/settings/NotificationsPanel.vue`
- `kova-open-pencil-1/src/components/settings/PreferencesModal.vue`
- `kova-open-pencil-1/src/styles/accessibility.css`
- `kova-open-pencil-1/tests/stores/preferences.test.ts`
- `kova-open-pencil-1/tests/stores/ui-state.test.ts`
- `kova-open-pencil-1/tests/integration/preferences-rpc.test.ts`
- `kova-open-pencil-1/tests/e2e/preferences.spec.ts`

**MODIFIED files:**

- `kova-open-pencil-1/src/app.css` — import `accessibility.css` CSS layer
- `kova-open-pencil-1/src/main.ts` — mount `<PreferencesModal>` globally inside the app shell; call `usePreferencesStore.load()` on auth-state-changed
- `kova-open-pencil-1/docs/prd/00-PRD_SCOPE_PLAN.md` — bump Cluster 12 tracker row to `IN-DRAFT` / `IN-REVIEW`
- `kova-open-pencil-1/docs/prd/00a-PRD_AUTHORING_GUIDE.md` — bump §7 tracker row for Cluster 12 with author + date

---

**End of PRD 12.**
