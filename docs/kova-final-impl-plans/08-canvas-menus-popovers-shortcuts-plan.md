# Implementation Plan — PRD 08 Canvas Menus, Popovers, Context Menus & Keyboard Shortcuts

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Source PRD:** `kova-open-pencil-1/docs/kova-final-prds/08-canvas-menus-popovers-shortcuts.md`
> **Wave:** 5 (close)
> **Status:** DRAFT — author Claude (Opus 4.7), 2026-05-15. Re-expanded to full TDD per task (C-MED20 — W3 fix dispatch 2026-05-19).
> **Workflow:** `superpowers:writing-plans` → this plan → `superpowers:test-driven-development` executes.
> **Branch:** `feat/m9-shopify` (or active feature branch at execution time).
> **Reference order during execution:** Figma docs → PRD 08 → Kova memory → AskUserQuestion (per CLAUDE.md "Figma Is the Reference. Always.").

**Goal:** Ship Cluster 08 — canvas menus, popovers, context menus, keyboard-shortcut registry + dialog — with one atomic TDD commit per task.

**Architecture:** Vue 3 + Pinia + Reka UI on top of OpenPencil engine. Stores layer first (no UI), composables second (logic), components third (visual), context menus fourth, keyboard dialog fifth, cross-cuts last. Find feature DROPPED from this cluster per W0-2 — owned by Cluster 07b end-to-end.

**Tech Stack:** Vue 3 Composition API, Pinia, Reka UI (DropdownMenu, Popover, Dialog), Tailwind 4, Bun test, Playwright E2E.

---

## 0. Pre-flight (one-shot, before any phase)

- [ ] **Step 0.1: Verify PRD 08 status = APPROVED**

```sh
head -20 kova-open-pencil-1/docs/kova-final-prds/08-canvas-menus-popovers-shortcuts.md
```
Expected: §0 row "Status" reads APPROVED with founder sign-off.

- [ ] **Step 0.2: Verify Cluster 06 + Cluster 11 either APPROVED or stub primitives available**

Inspect `00a-PRD_AUTHORING_GUIDE.md` Wave tracker. Both rows must be ≥ DRAFT so this PRD's components can mount against placeholder stubs.

- [ ] **Step 0.3: Verify Cluster 07b boolean-ops API surface ships in `packages/core/figma-api.ts`**

```sh
grep -n "booleanOperation" kova-open-pencil-1/packages/core/figma-api.ts
```
Expected: definition present.

- [ ] **Step 0.4: Audit existing `use-keyboard.ts` switch arms; snapshot to a planning note**

```sh
grep -n 'case ' kova-open-pencil-1/src/composables/use-keyboard.ts > /tmp/pre-refactor-shortcuts.md
```
Every existing case-arm shortcut MUST be enumerated and listed for parity verification post-Phase 2.6 refactor.

- [ ] **Step 0.5: Verify Reka UI `DropdownMenu` nested submenu support**

context7 query "Reka UI DropdownMenu Sub" + WebFetch help.reka-ui.com. Confirm 2-level nesting works with arrow-key navigation; OR record a compensating handler decision in `docs/superpowers/notes/2026-05-19-reka-submenu.md`.

- [ ] **Step 0.6: Local Supabase + dev server running**

```sh
cd kova-open-pencil-1 && bun run dev
```
localhost:1420 serves editor; canvas opens.

- [ ] **Step 0.7: Worktree setup** (per CLAUDE.md global-instructions "using-git-worktrees")

```sh
git worktree add .claude/worktrees/prd-08-impl
```
Isolated worktree on a new branch off `feat/m9-shopify`.

**Stop gate:** Do not enter Phase 1 until all pre-flight steps pass.

---

## Phase 1 — Stores (foundation; no UI yet)

> **Goal:** Establish the two Pinia stores every later component reads from. (Third store `useFindStore` DROPPED — see 1.3.) TDD strict.

### Task 1.1: `useShortcutsStore`

**Files:**
- Create: `kova-open-pencil-1/src/stores/shortcuts.ts`
- Test: `kova-open-pencil-1/tests/stores/shortcuts.test.ts`
- Type: `kova-open-pencil-1/src/types/shortcuts.ts`

- [ ] **Step 1.1.1 (RED): Write failing tests**

```ts
// kova-open-pencil-1/tests/stores/shortcuts.test.ts
import { describe, test, expect, beforeEach } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'
import { useShortcutsStore } from '@/stores/shortcuts'
import type { Shortcut } from '@/types/shortcuts'

const sc = (over: Partial<Shortcut>): Shortcut => ({
  id: 'test.id',
  keys: 'cmd+k',
  category: 'global',
  label: 'Test',
  action: () => {},
  ...over,
})

describe('useShortcutsStore', () => {
  beforeEach(() => setActivePinia(createPinia()))

  test('register adds a shortcut indexed by keys', () => {
    const store = useShortcutsStore()
    store.register(sc({ id: 'a', keys: 'cmd+a' }))
    expect(store.byKeys('cmd+a')?.id).toBe('a')
  })

  test('unregister removes a shortcut by id', () => {
    const store = useShortcutsStore()
    store.register(sc({ id: 'a', keys: 'cmd+a' }))
    store.unregister('a')
    expect(store.byKeys('cmd+a')).toBeUndefined()
  })

  test('register throws on duplicate keys for non-deferred entries', () => {
    const store = useShortcutsStore()
    store.register(sc({ id: 'a', keys: 'cmd+x' }))
    expect(() => store.register(sc({ id: 'b', keys: 'cmd+x' }))).toThrow(/duplicate/i)
  })

  test('deferred entries are excluded from visibleCategories', () => {
    const store = useShortcutsStore()
    store.register(sc({ id: 'a', keys: 'cmd+a', category: 'canvas' }))
    store.register(sc({ id: 'b', keys: 'cmd+b', category: 'components', deferred: true }))
    expect(store.visibleCategories).toContain('canvas')
    expect(store.visibleCategories).not.toContain('components')
  })

  test('byCategory returns shortcuts grouped by category', () => {
    const store = useShortcutsStore()
    store.register(sc({ id: 'a', keys: 'cmd+a', category: 'canvas' }))
    store.register(sc({ id: 'b', keys: 'cmd+b', category: 'canvas' }))
    store.register(sc({ id: 'c', keys: 'cmd+c', category: 'global' }))
    expect(store.byCategory('canvas')).toHaveLength(2)
    expect(store.byCategory('global')).toHaveLength(1)
  })
})
```

- [ ] **Step 1.1.2 (verify RED):**

```sh
cd kova-open-pencil-1 && bun test tests/stores/shortcuts.test.ts
```
Expected: all 5 tests FAIL — store + types missing.

- [ ] **Step 1.1.3 (GREEN): Implement type + store**

```ts
// kova-open-pencil-1/src/types/shortcuts.ts
export type ShortcutCategory =
  | 'global' | 'canvas' | 'chat' | 'dashboard' | 'editor'
  | 'view' | 'arrange' | 'text' | 'object' | 'boolean' | 'components'

export interface Shortcut {
  id: string
  keys: string                    // e.g. 'cmd+shift+u' — registry-canonical key string (Mac modifiers)
  category: ShortcutCategory
  label: string                   // human-readable; rendered in KeyboardShortcutsDialog
  action: () => void
  deferred?: boolean              // hidden from dialog + active dispatch (Phase 2 features)
}
```

```ts
// kova-open-pencil-1/src/stores/shortcuts.ts
import { defineStore } from 'pinia'
import { computed, reactive } from 'vue'
import type { Shortcut, ShortcutCategory } from '@/types/shortcuts'

export const useShortcutsStore = defineStore('shortcuts', () => {
  const byId = reactive(new Map<string, Shortcut>())
  const byKeysMap = reactive(new Map<string, Shortcut>())

  function register(sc: Shortcut): void {
    if (byKeysMap.has(sc.keys) && !sc.deferred) {
      throw new Error(`duplicate shortcut keys "${sc.keys}" (existing id: ${byKeysMap.get(sc.keys)!.id}, new id: ${sc.id})`)
    }
    byId.set(sc.id, sc)
    byKeysMap.set(sc.keys, sc)
  }

  function unregister(id: string): void {
    const sc = byId.get(id)
    if (!sc) return
    byId.delete(id)
    byKeysMap.delete(sc.keys)
  }

  function byKeys(keys: string): Shortcut | undefined {
    return byKeysMap.get(keys)
  }

  function byCategory(cat: ShortcutCategory): Shortcut[] {
    return Array.from(byId.values()).filter(s => s.category === cat && !s.deferred)
  }

  const visibleCategories = computed<ShortcutCategory[]>(() => {
    const seen = new Set<ShortcutCategory>()
    for (const sc of byId.values()) {
      if (!sc.deferred) seen.add(sc.category)
    }
    return Array.from(seen)
  })

  return { register, unregister, byKeys, byCategory, visibleCategories }
})
```

- [ ] **Step 1.1.4 (verify PASS):**

```sh
cd kova-open-pencil-1 && bun test tests/stores/shortcuts.test.ts
```
Expected: 5 PASS.

- [ ] **Step 1.1.5 (Commit):**

```sh
git add kova-open-pencil-1/src/stores/shortcuts.ts kova-open-pencil-1/src/types/shortcuts.ts kova-open-pencil-1/tests/stores/shortcuts.test.ts
git commit -m "feat(cluster-08): useShortcutsStore — register/unregister + byKeys/byCategory/visibleCategories + deferred-flag filter"
```

### Task 1.2: `useMenuStore`

**Files:**
- Create: `kova-open-pencil-1/src/stores/menu.ts`
- Test: `kova-open-pencil-1/tests/stores/menu.test.ts`

- [ ] **Step 1.2.1 (RED): Write failing tests**

```ts
// kova-open-pencil-1/tests/stores/menu.test.ts
import { describe, test, expect, beforeEach } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'
import { useMenuStore } from '@/stores/menu'

describe('useMenuStore', () => {
  beforeEach(() => setActivePinia(createPinia()))

  test('open(menuId) sets active root', () => {
    const s = useMenuStore()
    s.open('main')
    expect(s.activeRoot).toBe('main')
  })

  test('openSub(subId) sets activeSub; root stays open', () => {
    const s = useMenuStore()
    s.open('main')
    s.openSub('edit')
    expect(s.activeRoot).toBe('main')
    expect(s.activeSub).toBe('edit')
  })

  test('openSubSub(subSubId) sets activeSubSub', () => {
    const s = useMenuStore()
    s.open('main'); s.openSub('text'); s.openSubSub('case')
    expect(s.activeSubSub).toBe('case')
  })

  test('open(otherMenuId) clears sub + subSub', () => {
    const s = useMenuStore()
    s.open('main'); s.openSub('text'); s.openSubSub('case')
    s.open('file-name')
    expect(s.activeRoot).toBe('file-name')
    expect(s.activeSub).toBeNull()
    expect(s.activeSubSub).toBeNull()
  })

  test('close clears all three', () => {
    const s = useMenuStore()
    s.open('main'); s.openSub('text'); s.openSubSub('case')
    s.close()
    expect(s.activeRoot).toBeNull()
    expect(s.activeSub).toBeNull()
    expect(s.activeSubSub).toBeNull()
  })

  test('openSub(otherSubId) clears subSub', () => {
    const s = useMenuStore()
    s.open('main'); s.openSub('text'); s.openSubSub('case')
    s.openSub('edit')
    expect(s.activeSub).toBe('edit')
    expect(s.activeSubSub).toBeNull()
  })
})
```

- [ ] **Step 1.2.2 (verify RED):** `bun test tests/stores/menu.test.ts` — all FAIL.

- [ ] **Step 1.2.3 (GREEN): Implement**

```ts
// kova-open-pencil-1/src/stores/menu.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useMenuStore = defineStore('menu', () => {
  const activeRoot = ref<string | null>(null)
  const activeSub = ref<string | null>(null)
  const activeSubSub = ref<string | null>(null)

  function open(rootId: string): void {
    activeRoot.value = rootId
    activeSub.value = null
    activeSubSub.value = null
  }
  function openSub(subId: string): void {
    activeSub.value = subId
    activeSubSub.value = null
  }
  function openSubSub(subSubId: string): void {
    activeSubSub.value = subSubId
  }
  function close(): void {
    activeRoot.value = null
    activeSub.value = null
    activeSubSub.value = null
  }

  return { activeRoot, activeSub, activeSubSub, open, openSub, openSubSub, close }
})
```

- [ ] **Step 1.2.4 (verify PASS):** all 6 tests PASS.

- [ ] **Step 1.2.5 (Commit):**

```sh
git add kova-open-pencil-1/src/stores/menu.ts kova-open-pencil-1/tests/stores/menu.test.ts
git commit -m "feat(cluster-08): useMenuStore — root/sub/subSub mutual-exclusion state"
```

### Task 1.3: `useFindStore` — DROPPED (W0-2)

Find feature dropped from Cluster 08 per 2026-05-17 founder lock; see Cluster 07b Tasks 1.6 / 1.7 / 7.1. This plan does NOT ship `src/stores/find.ts`. Cluster 07b ships `src/stores/find.ts` with the canvas-focus-mode state shape (`active` / `query` / `matchedNodeIds` / `focusedNodeId`).

No task. No commit.

**Phase 1 exit gate:**
- 2 stores ship (`useShortcutsStore` + `useMenuStore`) with ≥90% line coverage (load-bearing for every downstream cluster)
- `bun run check` green
- `bun run test:unit` green
- No new dependencies added

---

## Phase 2 — Composables (logic; no UI)

### Task 2.1: `useObjectActions`

**Files:**
- Create: `kova-open-pencil-1/src/composables/use-object-actions.ts`
- Test: `kova-open-pencil-1/tests/composables/use-object-actions.test.ts`

- [ ] **Step 2.1.1 (RED): Write failing tests** — assert `compactActions ⊆ fullActions`; multi-select gate on Boolean ops; destructive flag on Delete.

```ts
// kova-open-pencil-1/tests/composables/use-object-actions.test.ts
import { describe, test, expect, beforeEach } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'
import { useObjectActions } from '@/composables/use-object-actions'
import { useEditorStore } from '@/stores/editor'

describe('useObjectActions — canvas actions', () => {
  beforeEach(() => setActivePinia(createPinia()))

  test('compactActions ⊆ fullActions', () => {
    const { compactActions, fullActions } = useObjectActions()
    const fullIds = new Set(fullActions.value.map(a => a.id))
    for (const a of compactActions.value) {
      expect(fullIds.has(a.id)).toBe(true)
    }
  })

  test('boolean-ops actions only enabled when 2+ selected', () => {
    const editor = useEditorStore()
    editor.selectedIds = ['a']
    const { fullActions } = useObjectActions()
    const union = fullActions.value.find(a => a.id === 'boolean.union')!
    expect(union.disabled).toBe(true)
    editor.selectedIds = ['a', 'b']
    expect(fullActions.value.find(a => a.id === 'boolean.union')!.disabled).toBe(false)
  })

  test('delete action carries destructive flag', () => {
    const { fullActions } = useObjectActions()
    const del = fullActions.value.find(a => a.id === 'object.delete')!
    expect(del.destructive).toBe(true)
  })
})
```

- [ ] **Step 2.1.2 (verify RED).**

- [ ] **Step 2.1.3 (GREEN): Implement `useObjectActions`** — see PRD §7.1 mapping table for all canvas actions. Action signature: `{ id, label, kbd?, invoke(ctx?), disabled?, destructive? }`. Internal `allCanvasActions[]` definitions wire each `invoke()` to existing `editor.ts` method.

```ts
// kova-open-pencil-1/src/composables/use-object-actions.ts
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { figma } from '@open-pencil/core'

export interface Action {
  id: string
  label: string
  kbd?: string
  destructive?: boolean
  disabled?: boolean
  invoke: (ctx?: { brand?: { id: string }; node?: { id: string } }) => void
}

export function useObjectActions() {
  const editor = useEditorStore()

  const allCanvasActions = computed<Action[]>(() => {
    const multi = editor.selectedIds.length >= 2
    return [
      { id: 'object.copy',          label: 'Copy',          kbd: '⌘C', invoke: () => editor.copySelection() },
      { id: 'object.cut',           label: 'Cut',           kbd: '⌘X', invoke: () => editor.cutSelection() },
      { id: 'object.paste',         label: 'Paste',         kbd: '⌘V', invoke: () => editor.paste() },
      { id: 'object.duplicate',     label: 'Duplicate',     kbd: '⌘D', invoke: () => editor.duplicateSelection() },
      { id: 'object.delete',        label: 'Delete',        kbd: '⌫',  destructive: true, invoke: () => editor.deleteSelection() },
      { id: 'boolean.union',        label: 'Union',         kbd: '⌘⌥U', disabled: !multi, invoke: () => figma.booleanOperation('UNION') },
      { id: 'boolean.subtract',     label: 'Subtract',      kbd: '⌘⌥S', disabled: !multi, invoke: () => figma.booleanOperation('SUBTRACT') },
      { id: 'boolean.intersect',    label: 'Intersect',     kbd: '⌘⌥I', disabled: !multi, invoke: () => figma.booleanOperation('INTERSECT') },
      { id: 'boolean.exclude',      label: 'Exclude',       kbd: '⌘⌥X', disabled: !multi, invoke: () => figma.booleanOperation('EXCLUDE') },
    ]
  })

  const fullActions = allCanvasActions
  const compactActions = computed(() => allCanvasActions.value.filter(a => ['object.copy', 'object.cut', 'object.paste', 'object.duplicate', 'object.delete'].includes(a.id)))

  return { compactActions, fullActions }
}
```

- [ ] **Step 2.1.4 (verify PASS).**

- [ ] **Step 2.1.5 (Commit):**

```sh
git add kova-open-pencil-1/src/composables/use-object-actions.ts kova-open-pencil-1/tests/composables/use-object-actions.test.ts
git commit -m "feat(cluster-08): useObjectActions — canvas + boolean-ops + destructive flag"
```

### Task 2.1b: `useObjectActions` brand-card extension (B12 founder lock 2026-05-17)

**Files:**
- Modify: `kova-open-pencil-1/src/composables/use-object-actions.ts` (extend with `brandCardActiveActions` / `brandCardArchivedActions`)
- Modify: `kova-open-pencil-1/tests/composables/use-object-actions.test.ts` (extend with brand-card tests)

- [ ] **Step 2.1b.1 (RED): Add brand-card tests**

```ts
describe('useObjectActions — brand-card actions (B12 founder lock 2026-05-17)', () => {
  beforeEach(() => setActivePinia(createPinia()))

  test('active brand: brandCardActiveActions returns [Rename, Archive, Delete]', () => {
    const { brandCardActiveActions } = useObjectActions()
    expect(brandCardActiveActions.value.map(a => a.id)).toEqual([
      'brand.rename', 'brand.archive', 'brand.delete'
    ])
  })

  test('archived brand: brandCardArchivedActions returns [Restore, Delete]', () => {
    const { brandCardArchivedActions } = useObjectActions()
    expect(brandCardArchivedActions.value.map(a => a.id)).toEqual([
      'brand.restore', 'brand.delete'
    ])
  })
})
```

- [ ] **Step 2.1b.2 (verify RED).**

- [ ] **Step 2.1b.3 (GREEN): Extend composable**

```ts
// inside useObjectActions return:
const brandCardActiveActions = computed<Action[]>(() => [
  { id: 'brand.rename',  label: 'Rename',  invoke: (ctx) => ctx?.brand && useBrandCardModals().startInlineRename(ctx.brand.id) },
  { id: 'brand.archive', label: 'Archive', invoke: (ctx) => ctx?.brand && useBrandCardModals().openArchive(ctx.brand.id) },
  { id: 'brand.delete',  label: 'Delete',  destructive: true, invoke: (ctx) => ctx?.brand && useBrandCardModals().openDelete(ctx.brand.id) },
])

const brandCardArchivedActions = computed<Action[]>(() => [
  { id: 'brand.restore', label: 'Restore', invoke: (ctx) => ctx?.brand && useBrandCardModals().openRestore(ctx.brand.id) },
  { id: 'brand.delete',  label: 'Delete',  destructive: true, invoke: (ctx) => ctx?.brand && useBrandCardModals().openDelete(ctx.brand.id) },
])

return { compactActions, fullActions, brandCardActiveActions, brandCardArchivedActions }
```

Cross-cut: `useBrandCardModals` is a PRD-03-provided composable injected via `provide/inject`. Do NOT import PRD 03 modal components directly here.

- [ ] **Step 2.1b.4 (verify PASS).**

- [ ] **Step 2.1b.5 (Commit):**

```sh
git add kova-open-pencil-1/src/composables/use-object-actions.ts kova-open-pencil-1/tests/composables/use-object-actions.test.ts
git commit -m "feat(cluster-08): useObjectActions brand-card extension (B12 active vs archived) per founder lock 2026-05-17"
```

### Task 2.2: `useContextMenu`

**Files:**
- Create: `kova-open-pencil-1/src/composables/use-context-menu.ts`
- Test: `kova-open-pencil-1/tests/composables/use-context-menu.test.ts`

- [ ] **Step 2.2.1 (RED): Write failing tests** — PRD §9.1: 8 surfaces (`canvas`, `layer-row`, `page-row`, `empty-canvas`, `frame`, `asset-row`, `overflow-dots`, `brand-card`). Asset-row dispatch hook (Cluster 05 plug-in). Brand-card state branch (Task 2.1b).

```ts
// kova-open-pencil-1/tests/composables/use-context-menu.test.ts
import { describe, test, expect, beforeEach } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'
import { useContextMenu } from '@/composables/use-context-menu'

describe('useContextMenu — surface dispatch', () => {
  beforeEach(() => setActivePinia(createPinia()))

  test('canvas surface returns canvas items', () => {
    const { items } = useContextMenu('canvas')
    expect(items.value.length).toBeGreaterThan(0)
  })

  test('asset-row surface starts empty until Cluster 05 plug-in registers', () => {
    const { items, registerAssetMenuItems } = useContextMenu('asset-row')
    expect(items.value).toHaveLength(0)
    registerAssetMenuItems([{ id: 'asset.rename', label: 'Rename', invoke: () => {} }])
    expect(items.value).toHaveLength(1)
  })

  test('brand-card surface branches on brand.archived_at', () => {
    const brand = { id: 'b1', archived_at: null as string | null }
    const { items } = useContextMenu('brand-card', { brand })
    expect(items.value.map(i => i.id)).toEqual(['brand.rename', 'brand.archive', 'brand.delete'])
    brand.archived_at = new Date().toISOString()
    expect(items.value.map(i => i.id)).toEqual(['brand.restore', 'brand.delete'])
  })
})
```

- [ ] **Step 2.2.2 (verify RED).**

- [ ] **Step 2.2.3 (GREEN): Implement per-surface dispatch table**

```ts
// kova-open-pencil-1/src/composables/use-context-menu.ts
import { computed, ref } from 'vue'
import { useObjectActions, type Action } from './use-object-actions'

type Surface = 'canvas' | 'layer-row' | 'page-row' | 'empty-canvas' | 'frame' | 'asset-row' | 'overflow-dots' | 'brand-card'

const assetMenuItems = ref<Action[]>([])

export function useContextMenu(surface: Surface, ctx?: { brand?: { id: string; archived_at: string | null } }) {
  const objectActions = useObjectActions()
  const items = computed<Action[]>(() => {
    switch (surface) {
      case 'canvas':         return objectActions.fullActions.value
      case 'layer-row':      return objectActions.compactActions.value
      case 'page-row':       return objectActions.compactActions.value
      case 'empty-canvas':   return objectActions.compactActions.value
      case 'frame':          return objectActions.fullActions.value
      case 'overflow-dots':  return objectActions.compactActions.value
      case 'asset-row':      return assetMenuItems.value
      case 'brand-card':
        if (!ctx?.brand) return []
        return ctx.brand.archived_at === null
          ? objectActions.brandCardActiveActions.value
          : objectActions.brandCardArchivedActions.value
    }
  })
  function registerAssetMenuItems(menu: Action[]) {
    assetMenuItems.value = menu
  }
  return { items, registerAssetMenuItems }
}
```

- [ ] **Step 2.2.4 (verify PASS).**

- [ ] **Step 2.2.5 (Commit):**

```sh
git add kova-open-pencil-1/src/composables/use-context-menu.ts kova-open-pencil-1/tests/composables/use-context-menu.test.ts
git commit -m "feat(cluster-08): useContextMenu — 8 surfaces + Cluster 05 asset-row plug-in + brand-card state branch"
```

### Task 2.3: `useFind` — DROPPED (W0-2)

Find search algorithm + composable dropped from Cluster 08 per W0-2; see Cluster 07b Tasks 2.11–2.14 (`useFindSearch`, `useCameraPan`). No task. No commit.

### Task 2.4: `useMainMenu` + `useFileNameDropdown`

**Files:**
- Create: `kova-open-pencil-1/src/composables/use-main-menu.ts`, `use-file-name-dropdown.ts`
- Test: `kova-open-pencil-1/tests/composables/use-main-menu.test.ts`, `use-file-name-dropdown.test.ts`

- [ ] **Step 2.4.1 (RED): Tests** assert menu-item list shape + open/close/openSubmenu invocations.

```ts
// kova-open-pencil-1/tests/composables/use-file-name-dropdown.test.ts
import { describe, test, expect, beforeEach } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'
import { useFileNameDropdown } from '@/composables/use-file-name-dropdown'

describe('useFileNameDropdown — 5 items, NO trash', () => {
  beforeEach(() => setActivePinia(createPinia()))

  test('returns 5 items in correct order', () => {
    const { items } = useFileNameDropdown()
    expect(items.value).toHaveLength(5)
    expect(items.value.map(i => i.id)).toEqual([
      'file.rename', 'file.duplicate', 'file.show-version-history', 'file.save-version-snapshot', 'file.export'
    ])
  })

  test('NO move-to-trash item present', () => {
    const { items } = useFileNameDropdown()
    expect(items.value.find(i => i.id === 'file.trash' || i.label.toLowerCase().includes('trash'))).toBeUndefined()
  })
})
```

- [ ] **Step 2.4.2 (verify RED).**

- [ ] **Step 2.4.3 (GREEN): Implement** — file-name dropdown has 5 items (NO trash per founder rip 2026-05-09); main menu has 9 root submenus (File / Edit / View / Object / Text / Arrange / Vector / Preferences / Help). Use `editorBus.emit('editor:open-version-history', ...)` and `editorBus.emit('editor:save-version-snapshot', ...)` for version-history items (contract defined in Plan 06 Task 9 — C-MED26).

- [ ] **Step 2.4.4 (verify PASS).**

- [ ] **Step 2.4.5 (Commit):**

```sh
git add kova-open-pencil-1/src/composables/use-main-menu.ts kova-open-pencil-1/src/composables/use-file-name-dropdown.ts kova-open-pencil-1/tests/composables/use-main-menu.test.ts kova-open-pencil-1/tests/composables/use-file-name-dropdown.test.ts
git commit -m "feat(cluster-08): useMainMenu + useFileNameDropdown — 5-item file-name dropdown (no trash) + 9-submenu main"
```

### Task 2.5: `usePropertyClipboard` (Q23 full property set)

**Files:**
- Create: `kova-open-pencil-1/src/composables/use-property-clipboard.ts`
- Test: `kova-open-pencil-1/tests/composables/use-property-clipboard.test.ts`

- [ ] **Step 2.5.1 (RED): Tests** cover copy/paste full property set (fills + strokes complete + effects + corner radius + blend + opacity); silent skip incompatible fields; mass-skip detection.

```ts
test('copy/paste full property set (Q23)', () => { /* fills, strokes, effects, cornerRadius, blendMode, opacity */ })
test('silent skip on incompatible target fields (e.g., cornerRadius onto TextNode)', () => {})
test('mass-skip detection — when ≥3 fields skipped, surface toast once per session', () => {})
```

- [ ] **Step 2.5.2 (verify RED).**

- [ ] **Step 2.5.3 (GREEN): Implement** extending `editor.ts.clipboardHtml` slot with `CopyablePropertySet` payload. Wire `useToast()` (Cluster 11 stub OK) for mass-skip. Use `useUIStateStore.dismissedToasts` to suppress re-fire.

- [ ] **Step 2.5.4 (verify PASS).**

- [ ] **Step 2.5.5 (Commit):**

```sh
git add kova-open-pencil-1/src/composables/use-property-clipboard.ts kova-open-pencil-1/tests/composables/use-property-clipboard.test.ts
git commit -m "feat(cluster-08): usePropertyClipboard — Q23 full property set + mass-skip toast"
```

### Task 2.6: `use-keyboard.ts` REFACTOR — split into 5 sub-task TDD cycles (C-MED21 — W3 fix dispatch)

> **Strategy:** Refactor the monolithic `switch (e.code)` block into a registry consumer (`useShortcutsStore.byKeys(...)`) one shortcut-category at a time. Each sub-task is its own RED → GREEN → COMMIT cycle. Pre-refactor parity audit (Step 0.4) is the safety net.

#### Task 2.6a: Dashboard shortcuts

**Files:**
- Modify: `kova-open-pencil-1/src/composables/use-keyboard.ts` (extract dashboard branches)
- Modify: `kova-open-pencil-1/src/composables/use-shortcut-registration.ts` (register dashboard category)
- Test: `kova-open-pencil-1/tests/composables/use-keyboard-dashboard.test.ts`

- [ ] **Step 2.6a.1 (RED): Tests assert every dashboard shortcut (Cmd+N new design, Cmd+B brand switcher, Cmd+/ help, Cmd+, settings (from dashboard context), Cmd+K dropped — assert NOT bound) still dispatches via registry post-refactor.**

```ts
test('Cmd+N from dashboard context dispatches new-design action', () => {
  const store = useShortcutsStore()
  const action = mock(() => {})
  store.register({ id: 'dashboard.new-design', keys: 'cmd+n', category: 'dashboard', label: 'New design', action })
  fireKeyboardEvent({ code: 'KeyN', metaKey: true })
  expect(action).toHaveBeenCalled()
})

test('Cmd+K is NOT bound (Command-K palette dropped per W0-7)', () => {
  const store = useShortcutsStore()
  expect(store.byKeys('cmd+k')).toBeUndefined()
})
```

- [ ] **Step 2.6a.2 (verify RED).**

- [ ] **Step 2.6a.3 (GREEN):** Extract dashboard case-arms from `use-keyboard.ts` → `useShortcutRegistration([ ...dashboardShortcuts ])` called from dashboard route's `<script setup>`.

- [ ] **Step 2.6a.4 (verify PASS).**

- [ ] **Step 2.6a.5 (Commit):**

```sh
git add kova-open-pencil-1/src/composables/use-keyboard.ts kova-open-pencil-1/src/composables/use-shortcut-registration.ts kova-open-pencil-1/tests/composables/use-keyboard-dashboard.test.ts
git commit -m "refactor(cluster-08): use-keyboard 2.6a dashboard shortcuts → registry consumer (Cmd+K dropped per W0-7)"
```

#### Task 2.6b: Canvas shortcuts (tool switch + canvas-only ops)

**Files:**
- Modify: `kova-open-pencil-1/src/composables/use-keyboard.ts`
- Test: `kova-open-pencil-1/tests/composables/use-keyboard-canvas.test.ts`

- [ ] **Step 2.6b.1 (RED):** Tests for V (move), F (frame), R (rectangle), O (ellipse), T (text), P (pen), S (slice), Shift+M (measurement), plus canvas-only: Delete, Cmd+D duplicate, Cmd+/ collapse selection, Cmd+G group, Cmd+Shift+G ungroup, [ / ] z-order, Cmd+[ / Cmd+] send-to-back/bring-to-front.

```ts
test.each([
  ['KeyV', 'tool.move'],
  ['KeyF', 'tool.frame'],
  ['KeyR', 'tool.rectangle'],
  ['KeyO', 'tool.ellipse'],
  ['KeyT', 'tool.text'],
  ['KeyP', 'tool.pen'],
  ['KeyS', 'tool.slice'],
])('%s code triggers %s', (code, expectedId) => {
  fireKeyboardEvent({ code })
  expect(useEditorStore().activeTool).toBe(expectedId)
})
```

- [ ] **Step 2.6b.2 (verify RED).**
- [ ] **Step 2.6b.3 (GREEN):** Extract canvas case-arms; register via `useShortcutRegistration([...])`.
- [ ] **Step 2.6b.4 (verify PASS).**
- [ ] **Step 2.6b.5 (Commit):**

```sh
git add kova-open-pencil-1/src/composables/use-keyboard.ts kova-open-pencil-1/tests/composables/use-keyboard-canvas.test.ts
git commit -m "refactor(cluster-08): use-keyboard 2.6b canvas tool + z-order shortcuts → registry consumer"
```

#### Task 2.6c: Chat shortcuts

**Files:**
- Modify: `kova-open-pencil-1/src/composables/use-keyboard.ts`
- Test: `kova-open-pencil-1/tests/composables/use-keyboard-chat.test.ts`

- [ ] **Step 2.6c.1 (RED):** Tests for Cmd+Enter (send), Esc (cancel), Up arrow (recall last prompt), Cmd+Shift+; (toggle chat panel focus). Guard: chat shortcuts only fire when `useRightPanelStore.activeTab === 'ai'`.

- [ ] **Step 2.6c.2 (verify RED).**
- [ ] **Step 2.6c.3 (GREEN):** Extract chat arms; register via `useShortcutRegistration([...])` with context guard.
- [ ] **Step 2.6c.4 (verify PASS).**
- [ ] **Step 2.6c.5 (Commit):**

```sh
git add kova-open-pencil-1/src/composables/use-keyboard.ts kova-open-pencil-1/tests/composables/use-keyboard-chat.test.ts
git commit -m "refactor(cluster-08): use-keyboard 2.6c chat shortcuts → registry consumer with AI-tab guard"
```

#### Task 2.6d: Global shortcuts (settings, keyboard dialog, undo/redo, save)

**Files:**
- Modify: `kova-open-pencil-1/src/composables/use-keyboard.ts`
- Test: `kova-open-pencil-1/tests/composables/use-keyboard-global.test.ts`

- [ ] **Step 2.6d.1 (RED):** Tests for Cmd+Z (undo), Cmd+Shift+Z (redo), Cmd+S (save — wires to `editorBus.emit('editor:save-version-snapshot', ...)` per C-MED26 contract), Cmd+, (settings), Cmd+Shift+? (keyboard dialog), Cmd+F (find — delegated to Cluster 07b useFindStore.open() per W0-2). **Assert Cmd+K NOT bound (dropped per W0-7).**

- [ ] **Step 2.6d.2 (verify RED).**
- [ ] **Step 2.6d.3 (GREEN):** Extract global arms; register via `useShortcutRegistration([...])`. Cmd+F handler imports `useFindStore` from `@/stores/find` (Cluster 07b's store).
- [ ] **Step 2.6d.4 (verify PASS).**
- [ ] **Step 2.6d.5 (Commit):**

```sh
git add kova-open-pencil-1/src/composables/use-keyboard.ts kova-open-pencil-1/tests/composables/use-keyboard-global.test.ts
git commit -m "refactor(cluster-08): use-keyboard 2.6d global shortcuts → registry consumer (Cmd+F → 07b useFindStore; Cmd+K dropped)"
```

#### Task 2.6e: Modifier handling (e.code correctness, Mac Option, text-edit guard)

**Files:**
- Modify: `kova-open-pencil-1/src/composables/use-keyboard.ts` (final pass)
- Test: `kova-open-pencil-1/tests/composables/use-keyboard-modifiers.test.ts`

- [ ] **Step 2.6e.1 (RED): Tests assert:**
  - All registered `keys` strings use `e.code` form (e.g. `'KeyV'` → registered as `'v'` lowercase; never `'∫'` Option-transformed character).
  - Mac Option-key press does NOT mistransform character (regression: Option+R should fire `tool.rectangle` not `∂`).
  - Text-edit guard: when `useEditorStore.editingTextNodeId !== null`, NO shortcut fires (typing into a text node doesn't trigger tool switch).
  - Number-keys-for-opacity: 5 → 50% opacity on selected layer; 5+0 (within 500ms) → 50% (two-digit window); 5+space-or-timeout → 50%.

```ts
test('Option+R fires rectangle tool, NOT ∂ (Mac Option-transform regression)', () => {
  fireKeyboardEvent({ code: 'KeyR', altKey: true, key: '∂' })
  expect(useEditorStore().activeTool).toBe('tool.rectangle')
})

test('typing in text-edit context does NOT trigger shortcuts', () => {
  const editor = useEditorStore()
  editor.editingTextNodeId = 'text-1'
  const moveAction = mock(() => {})
  useShortcutsStore().register({ id: 'tool.move', keys: 'v', category: 'canvas', label: 'Move', action: moveAction })
  fireKeyboardEvent({ code: 'KeyV' })
  expect(moveAction).not.toHaveBeenCalled()
})

test('digit + digit within 500ms = two-digit opacity (e.g., "5","0" → 50%)', async () => {
  fireKeyboardEvent({ code: 'Digit5' })
  await new Promise(r => setTimeout(r, 200))
  fireKeyboardEvent({ code: 'Digit0' })
  expect(useEditorStore().selectedNodes[0].opacity).toBeCloseTo(0.5, 2)
})

test('digit + timeout = single-digit opacity (e.g., "5" alone → 50%)', async () => {
  fireKeyboardEvent({ code: 'Digit5' })
  await new Promise(r => setTimeout(r, 600))
  expect(useEditorStore().selectedNodes[0].opacity).toBeCloseTo(0.5, 2)
})
```

- [ ] **Step 2.6e.2 (verify RED).**

- [ ] **Step 2.6e.3 (GREEN):**
  - Add `pendingDigit: Ref<string | null>` + `setTimeout(500)` two-digit window.
  - Text-edit guard at top of keyboard handler: `if (editor.editingTextNodeId !== null && context !== 'text-edit') return`.
  - Grep audit post-refactor: ZERO `switch (e.code)` or `switch (e.key)` blocks remain in `use-keyboard.ts`. `grep -n 'switch (e\.' use-keyboard.ts` returns no matches.
  - All registered `keys` use `e.code` form (no Option-transformed characters).

- [ ] **Step 2.6e.4 (verify PASS):** Run all `use-keyboard-*.test.ts` + grep audit.

- [ ] **Step 2.6e.5 (Commit):**

```sh
git add kova-open-pencil-1/src/composables/use-keyboard.ts kova-open-pencil-1/tests/composables/use-keyboard-modifiers.test.ts
git commit -m "refactor(cluster-08): use-keyboard 2.6e modifier handling — e.code correctness + Mac Option + text-edit guard + 2-digit opacity"
```

### Task 2.7: `useShortcutRegistration` convenience wrapper

**Files:**
- Create: `kova-open-pencil-1/src/composables/use-shortcut-registration.ts`
- Test: `kova-open-pencil-1/tests/composables/use-shortcut-registration.test.ts`

- [ ] **Step 2.7.1 (RED): Test** asserts auto-unregister fires on `onScopeDispose`.

```ts
test('auto-unregisters on scope dispose', async () => {
  const store = useShortcutsStore()
  const { stop } = await runInScope(() => {
    useShortcutRegistration([{ id: 'x', keys: 'cmd+x', category: 'global', label: 'X', action: () => {} }])
  })
  expect(store.byKeys('cmd+x')).toBeDefined()
  stop()
  expect(store.byKeys('cmd+x')).toBeUndefined()
})
```

- [ ] **Step 2.7.2 (verify RED).**

- [ ] **Step 2.7.3 (GREEN):**

```ts
// kova-open-pencil-1/src/composables/use-shortcut-registration.ts
import { onScopeDispose } from 'vue'
import { useShortcutsStore } from '@/stores/shortcuts'
import type { Shortcut } from '@/types/shortcuts'

export function useShortcutRegistration(shortcuts: Shortcut[]): void {
  const store = useShortcutsStore()
  for (const sc of shortcuts) store.register(sc)
  onScopeDispose(() => {
    for (const sc of shortcuts) store.unregister(sc.id)
  })
}
```

- [ ] **Step 2.7.4 (verify PASS).**

- [ ] **Step 2.7.5 (Commit):**

```sh
git add kova-open-pencil-1/src/composables/use-shortcut-registration.ts kova-open-pencil-1/tests/composables/use-shortcut-registration.test.ts
git commit -m "feat(cluster-08): useShortcutRegistration — scope-bound auto-unregister wrapper"
```

**Phase 2 exit gate:**
- All composables coverage ≥85%
- `bun run check` + `bun run test:unit` green
- Grep audit shows zero remaining `switch (e.code)` in `use-keyboard.ts`
- `/tmp/pre-refactor-shortcuts.md` deleted after audit confirms parity

---

## Phase 3 — Menu components (visual; no behavior tests yet)

### Task 3.1: Menu primitives (4 sub-tasks)

#### Task 3.1.1: `<MenuItem>` — per PRD §6.4.1 LOCK spec

**Files:**
- Create: `kova-open-pencil-1/src/components/menu/MenuItem.vue`
- Test: `kova-open-pencil-1/tests/components/menu/MenuItem.test.ts`

- [ ] **Step 3.1.1.1 (RED):** Tests assert variants render: default, hovered, checked, disabled (+ Phase-2-disabled tooltip), destructive (red), has-sub (caret).

```ts
test.each(['default', 'hovered', 'checked', 'disabled', 'destructive', 'has-sub'] as const)(
  'renders %s variant', (variant) => {
    const w = mount(MenuItem, { props: { label: 'Test', variant } })
    expect(w.find(`[data-variant="${variant}"]`).exists()).toBe(true)
  }
)
```

- [ ] **Step 3.1.1.2 (verify RED).**
- [ ] **Step 3.1.1.3 (GREEN):** Implement per PRD §6.4.1 LOCK spec.
- [ ] **Step 3.1.1.4 (verify PASS).**
- [ ] **Step 3.1.1.5 (Commit):**

```sh
git commit -m "feat(cluster-08): <MenuItem> primitive — 6 variants per PRD §6.4.1 LOCK"
```

#### Task 3.1.2: `<MenuSeparator>` (`.sep`)

- [ ] **Step:** 1-px line, correct margins. Snapshot test. Commit `feat(cluster-08): <MenuSeparator> primitive`.

#### Task 3.1.3: `<MenuGroupLabel>` (`.group`)

- [ ] **Step:** Used in Arrange / Boolean ops. Snapshot test. Commit `feat(cluster-08): <MenuGroupLabel> primitive`.

#### Task 3.1.4: `<KbdRow>` — macOS canonical glyph order

**Files:**
- Create: `kova-open-pencil-1/src/components/menu/KbdRow.vue`
- Test: `kova-open-pencil-1/tests/components/menu/KbdRow.test.ts`

- [ ] **Step 3.1.4.1 (RED):** Test asserts macOS canonical glyph order `⌃ → ⌥ → ⇧ → ⌘ → letter` regardless of input array order.

```ts
test.each([
  [['cmd', 'shift', 'k'], '⇧⌘K'],
  [['shift', 'cmd', 'k'], '⇧⌘K'],
  [['ctrl', 'alt', 'shift', 'cmd', 'a'], '⌃⌥⇧⌘A'],
])('reorders %j to %s', (input, expected) => {
  const w = mount(KbdRow, { props: { keys: input } })
  expect(w.text()).toBe(expected)
})
```

- [ ] **Step 3.1.4.2 (verify RED).**
- [ ] **Step 3.1.4.3 (GREEN):** Sort input via `KBD_ORDER = ['ctrl','alt','shift','cmd']` then append letter.
- [ ] **Step 3.1.4.4 (verify PASS).**
- [ ] **Step 3.1.4.5 (Commit):**

```sh
git commit -m "feat(cluster-08): <KbdRow> primitive — macOS canonical glyph order ⌃⌥⇧⌘"
```

### Task 3.2: Main menu submenus (13 sub-tasks)

Each follows the 5-step TDD pattern from Task 3.1.1. Listed compactly here; expand per-task at execution time.

- [ ] **Task 3.2.1:** `<MainMenuPopover>` — mounted from Cluster 06 top chrome. Opens/closes via `useMenuStore`. Snapshot + manual click test. Commit `feat(cluster-08): <MainMenuPopover>`.

- [ ] **Task 3.2.2:** `<FileSubmenu>` (B1.2 — 7 items: New design / Place image (⇧⌘K) / Export / Save to version history (⌥⌘S) / Show version history / Move to trash / Sign out). Destructive coloring on trash. Snapshot. Commit `feat(cluster-08): <FileSubmenu> per B1.2`.

- [ ] **Task 3.2.3:** `<EditSubmenu>` (B1.3 — densest, w-280). All kbd-rows correct + Copy as ▶ sub-of-sub. Snapshot. Commit `feat(cluster-08): <EditSubmenu> per B1.3`.

- [ ] **Task 3.2.4:** `<ViewSubmenu>` (B1.4 — 6 checkable rows + 2 sub-of-subs per founder lock 2026-05-17). Defaults: Pixel grid (⇧') / Layout guides (⇧G) / Rulers (⇧R) → checked. Show slices / Mask outlines / Frame outlines → unchecked. Plus Show/Hide UI (⌘\) checked / Minimize UI (⇧⌘\) / Panels ▶ / Outlines ▶ / 5 Zoom rows. Snapshot + assert defaults via reading `usePreferencesStore.prefs.view.*` post-mount. Commit `feat(cluster-08): <ViewSubmenu> per founder lock 2026-05-17`.

- [ ] **Task 3.2.4b:** `<OutlinesSubmenu>` (B1.4 sub-of-sub — NEW per founder lock 2026-05-17). Single item "Show outlines" (⇧O) checkable, default-OFF. Toggles `usePreferencesStore.prefs.view.wireframeMode`. Cluster 07b wireframe-render primitive consumed via `editor.ts.setRenderMode('wireframe'|'normal')`. Commit `feat(cluster-08): <OutlinesSubmenu> wireframe toggle`.

- [ ] **Task 3.2.5:** `<ObjectSubmenu>` (B1.5). Multi-select gate on Boolean ops row. Snapshot single-select + multi-select. Commit `feat(cluster-08): <ObjectSubmenu>`.

- [ ] **Task 3.2.6:** `<BooleanOpsSubmenu>` (B1.5 sub-of-sub). 4 items + Multi-select-only group label. Snapshot. Commit `feat(cluster-08): <BooleanOpsSubmenu>`.

- [ ] **Task 3.2.7:** `<TextSubmenu>` (B1.6) + `<CaseSubmenu>` sub-of-sub (radio behavior). Snapshot. Commit `feat(cluster-08): <TextSubmenu> + <CaseSubmenu>`.

- [ ] **Task 3.2.8:** `<CopyAsSubmenu>` (single PNG item). Snapshot. Commit `feat(cluster-08): <CopyAsSubmenu>`.

- [ ] **Task 3.2.9:** `<PanelsSubmenu>` (Left visible / Right visible checkable). Persistence via Yjs awareness verified later. Snapshot. Commit `feat(cluster-08): <PanelsSubmenu>`.

- [ ] **Task 3.2.10:** `<ArrangeSubmenu>` (B1.7 — 3 group labels, 8 distribute variants). Snapshot. Commit `feat(cluster-08): <ArrangeSubmenu>`.

- [ ] **Task 3.2.11:** `<PreferencesSubmenu>` (1 item — opens Cluster 12 modal via emit). Test asserts emit fires. Commit `feat(cluster-08): <PreferencesSubmenu>`.

- [ ] **Task 3.2.12:** `<HelpSubmenu>` (Help mailto / Keyboard shortcuts / Log out). Help item href correct; Log out invokes `useAuthStore.signOut()`. Test. Commit `feat(cluster-08): <HelpSubmenu>`.

### Task 3.3: File-name dropdown (3 sub-tasks)

- [ ] **Task 3.3.1:** `<FileNameDropdown>` per B1.11 / 13.2 — 5 items, NO trash. DOM-grep test confirms trash absence. Snapshot. Commit `feat(cluster-08): <FileNameDropdown> 5-item (no trash)`.

- [ ] **Task 3.3.2:** Rename item activates `use-inline-rename.ts` on file-name region; popover closes immediately. Manual + E2E. Commit `feat(cluster-08): file-name Rename inline edit`.

- [ ] **Task 3.3.3:** Duplicate item invokes `useCanvasesStore.duplicate(canvasId)`. Test mocks store call. Commit `feat(cluster-08): file-name Duplicate action`.

**Phase 3 exit gate:**
- Visual regression baselines captured for: main menu root, Edit submenu, Object submenu (single + multi-select), Text submenu with Case sub-of-sub, Arrange submenu, file-name dropdown
- All menu components individually rendered correctly in Storybook-style harness (or `bun run dev` route)
- `bun run test:dupes` jscpd < 3% across menu components — confirms `<MenuItem>` abstraction is sufficient

---

## Phase 4 — Context-menu components (9 sub-tasks)

Each follows 5-step TDD pattern.

- [ ] **Task 4.1:** `<ContextMenuShell>` per PRD §6.4.2 — reads items from `useContextMenu(surface).items`. Renders for each of 8 surfaces. Snapshot per surface. Commit `feat(cluster-08): <ContextMenuShell> 8-surface dispatch`.

- [ ] **Task 4.2:** `<OverflowDots>` button (mounted in inspector by Cluster 06). Opens shell with `surface='overflow-dots'` (compact subset). Test. Commit `feat(cluster-08): <OverflowDots>`.

- [ ] **Task 4.3:** Verify `compact ⊆ full` invariant via E2E test enumerating DOM items in both. Subset assertion passes. Commit `test(cluster-08): compact ⊆ full invariant E2E`.

- [ ] **Task 4.4:** Right-click trigger wiring on canvas / layer-row / page-row / empty-canvas / frame / asset-row (Cluster 06 cross-cut — mount points stubbed during dev). Each trigger opens correct surface. E2E. Commit `feat(cluster-08): right-click trigger wiring`.

- [ ] **Task 4.5:** Auto-select on right-click-unselected-node behavior. E2E. Commit `feat(cluster-08): right-click auto-select unselected node`.

- [ ] **Task 4.6:** Empty-canvas surface — 12 items per Figma-full menu (founder lock 2026-05-17): Paste here / Paste to replace (⇧⌘R) / sep / Select all (⌘A) / Select inverse (⇧⌘A) / sep / Zoom to 100% (⌘0) / Zoom to fit (⇧1) / Zoom to selection (⇧2) / sep / Pixel grid / Layout guides / Rulers (3 checkable, all default-ON) / sep / Find (⌘F → Cluster 07b `useFindStore.open()`). Paste-here uses cursor→canvas coord via `editor.canvasToScreen` inverse. Toggles bound to `usePreferencesStore.prefs.view.{pixelGrid, layoutGuides, rulers}`. E2E test all 12 items + paste-here cursor positioning. Commit `feat(cluster-08): empty-canvas right-click 12-item surface`.

- [ ] **Task 4.7:** Page-row Delete — `useConfirm` specialization. Last-page guard: menu row renders `.disabled` with hover-tooltip "Cannot delete the last page" (founder lock 2026-05-17 — Figma-exact). NO `useConfirm` invocation, NO error toast. Implemented in `useObjectActions` return shape `{ disabled: true, disabledReason: string }` when `pages.length === 1`. E2E both states. Commit `feat(cluster-08): page-row Delete + last-page guard`.

- [ ] **Task 4.8:** Asset-row shell only — items left blank (Cluster 05 plugs in). Shell opens with empty items list; document Cluster 05 plug-in API. Manual. Commit `feat(cluster-08): asset-row shell (Cluster 05 plug-in API)`.

- [ ] **Task 4.9:** Brand-card surface wiring (B12 founder lock 2026-05-17). PRD 03 mounts `<ContextMenuShell surface='brand-card' :ctx="{ brand }" :triggerEvent>` on each brand card. Items dispatched from `useObjectActions().brandCardActiveActions` (3 items) when `brand.archived_at === null`, else `brandCardArchivedActions` (2 items). Each item's `invoke({ brand })` calls PRD 03's `useBrandCardModals().{ openArchive, openRestore, openDelete, startInlineRename }` injected dispatcher. E2E both states + reactivity. Commit `feat(cluster-08): brand-card surface wiring (B12)`.

**Phase 4 exit gate:**
- All 8 context-menu surfaces ship
- `compact ⊆ full` invariant proven
- `useConfirm` specialization for Delete page validated against PRD §8.8

---

## Phase 5 — Find overlay + canvas-extension — DROPPED (W0-2)

Find feature dropped from Cluster 08 per 2026-05-17 founder lock; see Cluster 07b Tasks 1.6 / 1.7 / 7.1. This phase is intentionally empty in Plan 08. PRD 07b §12.12 documents the canvas-focus-mode design that Cluster 07b ships end-to-end (`SearchPanel`, `DimLayerOverlay`, `FindOverlay`, `useFindStore`, `useFindSearch`, `useCameraPan`, `Cmd+F`/`Esc` bindings).

**Phase 5 exit gate:** N/A — phase intentionally empty.

---

## Phase 6 — Keyboard shortcuts dialog (6 sub-tasks)

### Task 6.1: `<KeyboardShortcutsDialog>` per PRD §6.4.4

**Files:**
- Create: `kova-open-pencil-1/src/components/dialog/KeyboardShortcutsDialog.vue`
- Test: `kova-open-pencil-1/tests/components/dialog/KeyboardShortcutsDialog.test.ts`

- [ ] **Step 6.1.1 (RED):** Test asserts uses Cluster 11 `<KovaModal>` size `lg` (720 px); 11 visible tabs; Components + Prototyping NOT rendered.

- [ ] **Step 6.1.2 (verify RED).**
- [ ] **Step 6.1.3 (GREEN):** Implement using `<KovaModal>` shell + tab list reading `useShortcutsStore.visibleCategories`.
- [ ] **Step 6.1.4 (verify PASS).**
- [ ] **Step 6.1.5 (Commit):** `git commit -m "feat(cluster-08): <KeyboardShortcutsDialog> 11-tab modal"`

### Task 6.2: `<ShortcutRow>` — label + `<KbdRow>`

- [ ] **Steps:** RED test asserts label + `<KbdRow>` render. GREEN. Snapshot. Commit `feat(cluster-08): <ShortcutRow>`.

### Task 6.3: Wire `⇧⌘?` global shortcut → opens dialog

- [ ] **Steps:** Register into `useShortcutsStore`. E2E. Commit `feat(cluster-08): ⇧⌘? opens KeyboardShortcutsDialog`.

### Task 6.4: Help & account submenu "Keyboard shortcuts" item → opens dialog

- [ ] **Steps:** Same instance. E2E. Commit `feat(cluster-08): Help submenu Keyboard shortcuts → dialog`.

### Task 6.5: Search filter input (debounced 200 ms) — filters rows across all categories

- [ ] **Steps:** RED test asserts filter works + "No matches" empty state. E2E. Commit `feat(cluster-08): dialog search filter (200ms debounce)`.

### Task 6.6: E2E sanity — enumerate every registered shortcut, synthesize keydown, assert action fires

- [ ] **Steps:** Long-running E2E. Commit `test(cluster-08): E2E shortcut dispatch enumeration`.

**Phase 6 exit gate:**
- Dialog ships with all 11 visible categories
- DEFER categories hidden (registry honors `deferred: true`)
- Every shortcut testable end-to-end

---

## Phase 7 — Cross-cuts + integration (8 sub-tasks)

- [ ] **Task 7.1:** Cluster 07b boolean-ops shortcut registration: ensure 07b's `useShortcutRegistration` registers `⌘⌥U/S/I/X` into store. Manual check in DevTools after app boot.

- [ ] **Task 7.2:** Cluster 09 `⌥⌘S` Save to version history registration — confirm 09 plugs into store via `editorBus.emit('editor:save-version-snapshot', { canvasId })` per C-MED26 contract (Plan 06 Task 9). E2E.

- [ ] **Task 7.3:** Cluster 06 tool-switch shortcuts (V/F/R/O/P/T/C): confirm 06 plugs into store via `useShortcutRegistration` at editor mount. Manual.

- [ ] **Task 7.4:** Cluster 05 asset-row right-click items: confirm 05 plugs into `useContextMenu('asset-row').registerAssetMenuItems(...)` at brand-kit mount. Manual.

- [ ] **Task 7.4b:** PRD 03 brand-card right-click (B12 founder lock 2026-05-17): confirm PRD 03 exposes `useBrandCardModals()` composable + Brand type with `archived_at: string | null`; confirm PRD 03 mounts `<ContextMenuShell surface='brand-card'>` on brand cards; confirm `useObjectActions().brandCardActiveActions` / `brandCardArchivedActions` arrays render with PRD-03 modal dispatch wired. Manual + E2E both states.

- [ ] **Task 7.5:** Cluster 11 `useConfirm()` primitive: confirm canvas-side `useConfirm` specializations call into the primitive correctly. E2E delete-page flow.

- [ ] **Task 7.6:** Cluster 12 `useUIStateStore.recentColors`: confirm color-picker (Cluster 06) writes; confirm overlay reads. E2E recent-colors persistence.

- [ ] **Task 7.7:** Cluster 12 `usePreferencesStore.prefs.view.*`: confirm View menu toggles read/write Layer 1 prefs per founder lock 2026-05-17 Figma defaults: `pixelGrid: true / layoutGuides: true / rulers: true / frameOutlines: false / maskOutlines: false / showSlices: false / wireframeMode: false`. Default `users.preferences` JSONB seed updated accordingly. E2E toggle persists across reload (test against local Supabase); seed asserts defaults on fresh user.

- [ ] **Task 7.7b:** Cluster 07b NEW dependencies (founder lock 2026-05-17) — confirm Cluster 07b ships: (a) wireframe render-mode primitive `editor.ts.setRenderMode('wireframe'|'normal')`; (b) Pixel-grid overlay primitive (active MVP, no longer Phase-2 stub); (c) Rulers overlay primitive; (d) Frame-outlines / Mask-outlines / Slices overlay primitives (on-toggle render). If not ready, View menu toggles render but visual effect missing — flag in PR review.

- [ ] **Task 7.7c:** Cluster 12 schema seed — `users.preferences` JSONB default migration MUST include `view.{pixelGrid: true, layoutGuides: true, rulers: true, frameOutlines: false, maskOutlines: false, showSlices: false, wireframeMode: false}`. **Schema reference (C-LOW08.6 — W3 fix dispatch):** Cluster 12 seeds `users.preferences.view.*` keys (snap-to-grid, snap-to-objects, pixelGrid, layoutGuides, rulers, frameOutlines, maskOutlines, showSlices, wireframeMode, recentColors) — see `docs/kova-final-impl-plans/12-settings-and-user-preferences-plan.md` (usePreferencesStore schema definition task) + Supabase migration file `supabase/migrations/<YYYYMMDDHHMMSS>_users_preferences_view.sql`. Cluster 08 reads via `usePreferencesStore.prefs.view.*`; never writes the schema directly. Migration SQL diff reviewed before this task closes.

- [ ] **Task 7.8:** Trash cross-cut sanity: confirm Move-to-trash NOT reachable from canvas (B1.11 / 13.2 stripped); dashboard right-click does reach modal. E2E.

**Phase 7 exit gate:**
- Every cross-cut in PRD §11 verified live
- Integration matrix: 7.1 through 7.8 all green
- No silent cross-cluster contract drift

---

## Phase 8 — Acceptance criteria pass + manual QA

| Task | Action | Verification |
|---|---|---|
| 8.1 Walk PRD §8 acceptance criteria top-to-bottom; check each | Every checkbox passes in `bun run test:unit` or `bun run test` or browser | Founder reviews |
| 8.2 Manual QA per PRD §9.4 — engineer runs `bun run dev` localhost:1420, walks the script | All 15 manual items pass | Founder smoke-test confirms |
| 8.3 Visual regression baselines reviewed: no unintended diffs | Playwright `--update-snapshots` only if intentional | |
| 8.4 `bun run check` green | | |
| 8.5 `bun run test:unit` green ≥80% per file | | |
| 8.6 `bun run test` green (E2E) | | |
| 8.7 `bun run test:dupes` jscpd < 3% | | |
| 8.8 Verify all popover renders with consistent Reka shell (radius / padding / shadow) — visual cross-check on 3 representative popovers | | |
| 8.9 Verify NO `packages/core/` modifications introduced (grep `git diff` paths) | grep returns zero | |
| 8.10 Bump PRD §0 status: `IN-IMPLEMENTATION` → `SHIPPED` after founder browser-verify | Edit `08-canvas-menus-popovers-shortcuts.md` §0 | |

**Phase 8 exit gate:**
- PRD §8 100% passing
- Manual QA founder sign-off
- All quality gates green
- PRD status flipped to SHIPPED

---

## Phase 9 — Commit + PR (per CLAUDE.md git-workflow)

| Task | Action | Verification |
|---|---|---|
| 9.1 Group commits by phase (5–8 commits total) — Phase 1 / 2 / 3 / 4 / 5 / 6 / 7 / 8 | Conventional commit format (`feat:`, `refactor:`, `test:`) | `git log` clean |
| 9.2 Each commit body cites the PRD §X.Y it implements | | |
| 9.3 Open PR titled `feat(canvas): PRD 08 canvas menus, popovers, context menus & keyboard shortcuts` | Body: §summary + §test plan from PRD §9 | `gh pr view` |
| 9.4 Request founder review | | |
| 9.5 After approval: merge to `feat/m9-shopify` (or current feature branch) | No force-push | |

---

## Risk register (mirrors PRD §12, surfaced here for execution-time tracking)

| Risk | Phase | Mitigation in plan | Status |
|---|---|---|---|
| Find performance on large layer trees | 5 (DROPPED) | N/A — owned by Cluster 07b | Closed |
| Reka nested submenu keyboard nav incomplete | 0 + 3 | Pre-flight verification; compensating handler if needed | Open |
| `use-keyboard.ts` refactor drops existing shortcut | 2.6a-e | Pre-refactor audit (Step 0.4) + per-category parity tests | Open |
| Cluster 06 / 11 stubs delay testing | 0 + 7 | Pre-flight requires stub availability; mount-point placeholders in dev | Open |
| Q24 open question on Cluster 05 asset-menu dispatch direction | 4.8 | Decided unilaterally per PRD §12.4 — confirm during Cluster 05 PRD authoring | Resolved-pending-Cluster-05 |
| Last-page guard UX (error toast vs disabled item) | 4.7 | **RESOLVED 2026-05-17 — disabled item + tooltip per founder Figma-parity lock** | Closed |
| Outlines wireframe submenu (Cluster 07b dep) | 3.2.4b, 7.7b | NEW per founder lock 2026-05-17 — Cluster 07b must ship `editor.ts.setRenderMode` primitive | Open (Cluster 07b dep) |
| Pixel grid activation (was Phase-2 stub) | 3.2.4, 7.7b | NEW per founder lock 2026-05-17 — Cluster 07b must ship overlay primitive | Open (Cluster 07b dep) |
| Default View toggle states (3 ON / 4 OFF Figma defaults) | 3.2.4, 7.7c | NEW per founder lock 2026-05-17 — Cluster 12 schema seed update needed | Open (Cluster 12 dep) |
| Empty-canvas right-click expanded to 12 items | 4.6 | NEW per founder lock 2026-05-17 — replaces 3-item minimal | Closed (spec'd) |
| Brand-card right-click — active vs archived state branch (B12 archived Brands page MVP) | 2.1b, 2.2, 4.9, 7.4b | NEW per founder lock 2026-05-17 — `useObjectActions` extended; `useContextMenu` gets `brand-card` surface; cross-cut to PRD 03 for B12.1/B12.3/B12.4 modals | Open (PRD 03 dep — must expose `useBrandCardModals()` composable + `Brand` type with `archived_at`) |

---

## File inventory (created / modified)

### Created

```
kova-open-pencil-1/src/stores/
  menu.ts
  shortcuts.ts

kova-open-pencil-1/src/composables/
  use-object-actions.ts
  use-context-menu.ts
  use-main-menu.ts
  use-file-name-dropdown.ts
  use-property-clipboard.ts
  use-shortcut-registration.ts

kova-open-pencil-1/src/components/menu/
  MainMenuPopover.vue
  FileSubmenu.vue
  EditSubmenu.vue
  ViewSubmenu.vue
  ObjectSubmenu.vue
  BooleanOpsSubmenu.vue
  TextSubmenu.vue
  CaseSubmenu.vue
  CopyAsSubmenu.vue
  PanelsSubmenu.vue
  OutlinesSubmenu.vue
  ArrangeSubmenu.vue
  PreferencesSubmenu.vue
  HelpSubmenu.vue
  FileNameDropdown.vue
  MenuItem.vue
  MenuSeparator.vue
  MenuGroupLabel.vue
  KbdRow.vue

kova-open-pencil-1/src/components/context-menu/
  ContextMenuShell.vue
  OverflowDots.vue

kova-open-pencil-1/src/components/dialog/
  KeyboardShortcutsDialog.vue
  ShortcutRow.vue

kova-open-pencil-1/src/types/
  shortcuts.ts

kova-open-pencil-1/src/actions/
  transform-actions.ts        # rotate / flip wrappers (if needed)
  layout-actions.ts           # pack / distribute wrappers
  round-to-pixel.ts           # if not already in editor.ts

kova-open-pencil-1/tests/stores/
  menu.test.ts
  shortcuts.test.ts

kova-open-pencil-1/tests/composables/
  use-object-actions.test.ts
  use-context-menu.test.ts
  use-property-clipboard.test.ts
  use-keyboard-dashboard.test.ts
  use-keyboard-canvas.test.ts
  use-keyboard-chat.test.ts
  use-keyboard-global.test.ts
  use-keyboard-modifiers.test.ts
  use-shortcut-registration.test.ts

kova-open-pencil-1/tests/components/menu/
  MenuItem.test.ts
  KbdRow.test.ts

kova-open-pencil-1/tests/components/dialog/
  KeyboardShortcutsDialog.test.ts

kova-open-pencil-1/tests/e2e/
  canvas-menus.spec.ts
  canvas-context-menu.spec.ts
  shortcuts-dialog.spec.ts
  opacity-shortcuts.spec.ts
  recent-colors.spec.ts
  view-toggles.spec.ts
  menu-visual-regression.spec.ts
```

### Modified

```
kova-open-pencil-1/src/composables/use-keyboard.ts    # major refactor: switch → registry consumer (Task 2.6a-e)
kova-open-pencil-1/src/main.ts (or app-bootstrap.ts)  # mount KeyboardShortcutsDialog + register shortcuts at boot (FindOverlay/SearchPanel mounted by Cluster 07b Task 4.14)
```

### Touched (NOT modified — only consumed via existing public API)

```
kova-open-pencil-1/packages/core/figma-api.ts         # read figma.booleanOperation
kova-open-pencil-1/packages/core/src/scene-graph.ts   # read isMask field per Q2
kova-open-pencil-1/packages/core/src/editor.ts        # consume existing methods
```

(Per CLAUDE.md `packages/core/` is read-only. Zero modifications.)

---

## Execution notes

- **TDD strict:** every phase opens with RED tests before any implementation code. No exceptions.
- **Verification before completion:** every phase has an explicit exit gate. Do not advance until all rows pass.
- **Subagents:** `e2e-runner` for Phase 5 / 6 / 8 long-running E2E flows; `superpowers:code-reviewer` after Phase 4 + Phase 8 against PRD spec.
- **AskUserQuestion checkpoints:** open questions in §12.4 / §12.5 / §12.6 of PRD require founder confirmation BEFORE locking in the implementation. Surface during Phase 0 review.
- **Worktree:** per CLAUDE.md / `superpowers:using-git-worktrees`, isolate execution in `.claude/worktrees/prd-08-impl`.
- **Browser smoke before done:** per `feedback_browser_smoke_test_before_done` memory, founder verifies in browser. Green CI ≠ working feature.
- **No `packages/core/` writes:** every action wires through existing public API or thin app-layer wrappers in `src/actions/`. Per CLAUDE.md hard constraint.

---

## End of plan

PRD 08 implementation plan ready. Status: `DRAFT — awaits PRD approval`. Hand off to `superpowers:test-driven-development` once PRD §0 status = APPROVED.
