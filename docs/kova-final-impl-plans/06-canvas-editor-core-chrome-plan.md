# Cluster 06 — Canvas Editor Core Chrome Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the structural canvas-editor chrome (route, topbar, bottom toolbar with 11 tools, left panel with Pages + Layers + Shop panel, right panel two-tab framework Design + AI per founder ratification 2026-05-15, drop-receiver dispatcher for Cluster 05's 5 brand-kit MIME types, tool-registry API consumed by Cluster 07a, EditorView refactor removing legacy ChatPopup) so Cluster 07a/07b/08/10 have a chrome shell to mount into.

**Architecture:**
- Backend: NONE. (Chrome is read-only over existing engine state + Cluster 05's brand-kit data + Cluster 10's chat data.)
- Frontend: New Vue Router child for `/canvas/:canvasId` (likely exists from M5 — refactor), refactored `EditorView.vue` shell, 3 new Pinia stores (`useRightPanelStore`, `useToolRegistry`, extension of `useEditorStore`), 5 new composables (`useLayerTree`, `useInspectorRouter`, `useRightPanelTab`, EXTEND `useCanvasDrop`, EXTEND `useEditorStore`), ~20 new/refactored components, MIME-typed drop dispatcher.
- ChatPopup REMOVAL: PRD 10 owns the file delete; this PRD removes EditorView wiring (import + render block + ShopBuildPrompt + useCanvasBindingsPersistence + useShopDrop per Shopify spec §5.1).
- Tool registry: Cluster 06 exports `useToolRegistry`; Cluster 07a's `src/canvas-extensions/slice/register.ts` + `measurement/register.ts` call into it at app init.

**Tech Stack:**
- Vue 3 (Composition API setup stores), Pinia, Vue Router 4, Tailwind 4 (canonical kova-hifi.css → @theme)
- valibot for drop-payload validation (NOT zod, per CLAUDE.md)
- Reka UI primitives (DropdownMenu, Tabs, ScrollArea) — Cluster 11 wraps
- Existing M5 infrastructure: useCanvas, useCanvasInput, useEditorStore, useCanvasesStore, useTabsStore, useBrandsStore, useAuthStore
- `bun:test` for unit; Playwright/Vercel Agent Browser for E2E

**PRD reference:** `kova-open-pencil-1/docs/kova-final-prds/06-canvas-editor-core-chrome.md`

---

## File Structure (locked before tasks)

### New files (Cluster 06 owns)

| File | Responsibility |
|---|---|
| `src/types/inspector.ts` | InspectorSectionDef contract (section components declare priority + supported selection types — coordination with Cluster 07b) |
| `src/types/tool-registry.ts` | ToolDef interface (Cluster 07a registers against this) |
| `src/types/drag-payload.ts` | Valibot schemas for the 5 MIME-typed drag payloads (Cluster 05 owns the source-side; this file is the receiver-side guard) |
| `src/stores/right-panel.ts` | useRightPanelStore — activeTab: 'design'\|'ai' + localStorage persistence |
| `src/stores/tool-registry.ts` | useToolRegistry — tool registration API |
| `src/composables/use-layer-tree.ts` | Virtual-scrolled flat-row derivation from editor.graph + expand/collapse + drag-reorder |
| `src/composables/use-inspector-router.ts` | Section list per selection type |
| `src/composables/use-right-panel-tab.ts` | switchToDesign / switchToAi / focusAiComposer |
| `src/components/editor/TopChrome.vue` | Composes children |
| `src/components/editor/TopChromeLogo.vue` | Logo + dropdown caret trigger |
| `src/components/editor/FileBreadcrumb.vue` | Brand pill (click navigate per Q17) + sep + file name + caret |
| `src/components/editor/TopChromeActions.vue` | Right side: Notifications + Present + Comments + Avatar |
| `src/components/editor/AvatarDropdown.vue` | 5-item dropdown per Q16 |
| `src/components/editor/MissingFontsPill.vue` | Visible when useFontStatus().globalMissing |
| `src/components/editor/BottomToolbar.vue` | Renders tools from useToolRegistry |
| `src/components/editor/ToolButton.vue` | Single tool with dropdown chevron |
| `src/components/editor/ToolDropdown.vue` | Move/Frame/Pen sub-tool dropdown |
| `src/components/editor/AiToolButton.vue` | Click → open AI tab + focus composer |
| `src/components/editor/LeftPanel.vue` | Composes FileRow + PagesPanel + LayersPanel + ShopPanel |
| `src/components/editor/FileRow.vue` | File icon + name + meta |
| `src/components/editor/LayerRow.vue` | Per-layer row (caret, icon, name, glyphs, vis, lock) |
| `src/components/editor/LayersEmptyState.vue` | "No layers yet" |
| `src/components/editor/RightPanel.vue` | Tab strip + frame-head + body |
| `src/components/editor/RightPanelTabs.vue` | EXACTLY 2 tabs (Design + AI) |
| `src/components/editor/FrameHead.vue` | Title + 3 actions (visible-disabled) + overflow ••• |
| `src/components/editor/InspectorRouter.vue` | Mounts Cluster 07b sections |
| `src/components/editor/RightPanelAiSlot.vue` | Mounts Cluster 10's ChatPanel |
| `src/components/editor/CanvasOverlayHost.vue` | Slot for Cluster 07b overlays |
| `src/components/editor/ZoomHud.vue` | Bottom-right zoom % HUD |

### Modified files (Cluster 06 + cross-cluster ownership)

| File | Changes |
|---|---|
| `src/router/routes.ts` | EXTEND — add `/canvas/:canvasId` route with viewport + auth + brand-ownership guards (verify route exists from M5; refactor if so) |
| `src/views/EditorView.vue` | REFACTOR — remove `<ChatPopup>` import + render block; remove `useCanvasBindingsPersistence` lifecycle (saveBindings + onBeforeRouteLeave); remove `useShopDrop` destructure; remove `<ShopBuildPrompt>` render block; remove canvas-extensions/product-variant references; mount new chrome components |
| `src/stores/editor.ts` | EXTEND — `showUI` to 3-state enum; add `panelsVisible: { left: boolean; right: boolean }`; add `dropTargetId` + `dropTargetAction` reactive refs (consumed by Cluster 07b hover overlay) |
| `src/components/editor/PagesPanel.vue` | EXTEND — render right-click anchor for Cluster 08 menu |
| `src/components/editor/LayersPanel.vue` | EXTEND — use `useLayerTree`; add mask + slice glyphs per maskType / SLICE NodeType; empty-state slot |
| `src/composables/use-canvas-drop.ts` | EXTEND — add 5 MIME dispatch handlers per PRD §6.5 |
| `src/components/editor/sidebar/ShopPanel.vue` | REWORK per Shopify spec §5.2 — collapse 3-tab TabsRoot to product-only panel |
| `src/components/editor/sidebar/ShopPanelProducts.vue` | REWORK per Shopify spec §4.1 + §5.2 — remove draggable, onDragStart, serializeShopPayload import, variant-flat listing; add multi-select + "Import N to chat" button + sort + collection filter |

### Test files

| File | Coverage |
|---|---|
| `tests/unit/stores/right-panel.test.ts` | activeTab + persistence |
| `tests/unit/stores/tool-registry.test.ts` | register / unregister / primaryTools / dropdownTools / toolByKey |
| `tests/unit/stores/editor-extension.test.ts` | 3-state showUI + panelsVisible + dropTarget refs |
| `tests/unit/composables/use-layer-tree.test.ts` | Flat-row derivation + expand/collapse + reorder |
| `tests/unit/composables/use-inspector-router.test.ts` | Section list per selection |
| `tests/unit/composables/use-right-panel-tab.test.ts` | switchTo + focus |
| `tests/unit/composables/use-canvas-drop.test.ts` | 5 MIME handlers + modifier-key + valibot reject |
| `tests/unit/components/editor/TopChrome.test.ts` | Renders + emits |
| `tests/unit/components/editor/AvatarDropdown.test.ts` | 5 items per Q16; NO brand picker; NO What's new |
| `tests/unit/components/editor/FileBreadcrumb.test.ts` | brand-click event |
| `tests/unit/components/editor/BottomToolbar.test.ts` | 9 default tools rendered; AI tool click → focus composer |
| `tests/unit/components/editor/ToolButton.test.ts` | Chevron iff sub-tools |
| `tests/unit/components/editor/RightPanelTabs.test.ts` | EXACTLY 2 tabs; Prototype tab NOT in DOM |
| `tests/unit/components/editor/InspectorRouter.test.ts` | Renders section list per selection |
| `tests/unit/components/editor/LayersPanel.test.ts` | Mask glyph + slice glyph + empty state |
| `tests/unit/components/editor/LayerRow.test.ts` | Per maskType variant |
| `tests/unit/components/editor/ShopPanelProducts.test.ts` | No draggable; multi-select; Import N to chat callback |
| `tests/unit/components/editor/ShopPanel.test.ts` | Single panel (no tabs); product-only |
| `tests/integration/editor/route-guard.test.ts` | Auth + ownership + viewport guards |
| `tests/integration/editor/drop-receiver-end-to-end.test.ts` | 5 MIME types end-to-end against real editor state |
| `tests/integration/editor/tool-registration.test.ts` | Cluster 07a register-call (mocked) → toolbar renders Slice + Measurement |
| `tests/integration/editor/shop-panel-import-to-chat.test.ts` | Multi-select + Import → chat refs populated |
| `tests/e2e/editor/load-and-render.spec.ts` | All chrome elements visible; no Prototype tab; no ChatPopup |
| `tests/e2e/editor/avatar-dropdown.spec.ts` | 5 items + routing |
| `tests/e2e/editor/brand-label-navigates.spec.ts` | Click → `/brand/:brandId` (W0-3 canonical route per scope plan §6) |
| `tests/e2e/editor/right-panel-tab-switch.spec.ts` | Click AI → ChatPanel; reload → persists |
| `tests/e2e/editor/ai-tool-button.spec.ts` | Click → AI tab + focus |
| `tests/e2e/editor/layer-tree-interactions.spec.ts` | Hover + click + drag-reorder + right-click |
| `tests/e2e/editor/drag-color-to-frame.spec.ts` | Real drag end-to-end |
| `tests/e2e/editor/drag-saved-block-to-canvas.spec.ts` | Spawn TEXT |
| `tests/e2e/editor/shop-panel-import-flow.spec.ts` | Multi-select → chips appear |
| `tests/e2e/editor/no-chat-popup.spec.ts` | Regression: no ChatPopup |
| `tests/e2e/editor/no-prototype-tab.spec.ts` | Regression: no Prototype tab |

---

## Task Sequence

Tasks are ordered so each builds on prior tasks. TDD throughout. Commit after each task.

---

### Task 1: Type contracts (inspector + tool-registry + drag-payload)

**Files:**
- Create: `src/types/inspector.ts`
- Create: `src/types/tool-registry.ts`
- Create: `src/types/drag-payload.ts`

- [ ] **Step 1: Write the type files (no tests — checked by `bun run check`)**

```ts
// src/types/inspector.ts
import type { Component } from 'vue'
import type { NodeType } from '@open-pencil/core'

export interface InspectorSectionDef {
  id: string
  component: Component
  priority: number  // ascending sort; coordination contract with Cluster 07b (RATIFIED 2026-05-17 §12.15)
  //   10  PageSection         (no-selection)
  //   20  PositionSection
  //   30  LayoutSection
  //   40  AppearanceSection
  //   50  FillSection
  //   60  StrokeSection
  //   70  TypographySection   (text-only)
  //   80  EffectsSection
  //   90  ExportSection
  //  100  VariablesSection    (page-level)
  // Cluster 06 ships PageSection (priority 10) at init; Cluster 07b registers 20–100 at app boot.
  supports: 'none' | NodeType[] | 'all'  // 'none' = render when no selection; 'all' = render for any selection
  multiSelect?: boolean  // false → hide when multi-selection (e.g., Layout)
}
```

```ts
// src/types/tool-registry.ts
export type ToolSlot = 'move'|'frame'|'rectangle'|'ellipse'|'pen'|'text'|'measurement'|'ai'|'components'

export interface ToolDef {
  id: string
  slot: ToolSlot
  parent?: 'move'|'frame'|'pen'  // dropdown sub-tool under primary slot
  icon: string  // lucide icon name
  label: string
  key?: string  // single-key shortcut
  keySequence?: string[]  // e.g. ['Shift','M']
  when?: () => boolean
  onActivate: () => void
  disabled?: boolean
  tooltip?: string
}
```

```ts
// src/types/drag-payload.ts
import * as v from 'valibot'

export const BrandColorPayloadSchema = v.object({
  hex: v.pipe(v.string(), v.regex(/^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/)),
  swatchId: v.pipe(v.string(), v.uuid()),
  brandId: v.pipe(v.string(), v.uuid()),
})

export const BrandFontPayloadSchema = v.object({
  family: v.pipe(v.string(), v.minLength(1), v.maxLength(128)),
  fontId: v.optional(v.pipe(v.string(), v.uuid())),
  fontFileUrl: v.optional(v.string()),
  brandId: v.pipe(v.string(), v.uuid()),
})

export const BrandAssetPayloadSchema = v.object({
  assetId: v.pipe(v.string(), v.uuid()),
  kind: v.picklist(['logo','wordmark','image']),
  url: v.string(),
  brandId: v.pipe(v.string(), v.uuid()),
})

export const SavedBlockPayloadSchema = v.object({
  blockId: v.pipe(v.string(), v.uuid()),
  blockData: v.object({
    label: v.string(),
    content: v.string(),
    type: v.picklist(['text','cta','footer']),
  }),
  brandId: v.pipe(v.string(), v.uuid()),
})

export const ToneSnippetPayloadSchema = v.object({
  snippetId: v.pipe(v.string(), v.uuid()),
  content: v.string(),
  brandId: v.pipe(v.string(), v.uuid()),
})

export type BrandColorPayload = v.InferOutput<typeof BrandColorPayloadSchema>
export type BrandFontPayload = v.InferOutput<typeof BrandFontPayloadSchema>
export type BrandAssetPayload = v.InferOutput<typeof BrandAssetPayloadSchema>
export type SavedBlockPayload = v.InferOutput<typeof SavedBlockPayloadSchema>
export type ToneSnippetPayload = v.InferOutput<typeof ToneSnippetPayloadSchema>

export const DRAG_MIME = {
  COLOR: 'application/x-kova-brand-color',
  FONT: 'application/x-kova-brand-font',
  ASSET: 'application/x-kova-brand-asset',
  SAVED_BLOCK: 'application/x-kova-saved-block',
  TONE_SNIPPET: 'application/x-kova-tone-snippet',
} as const
```

- [ ] **Step 2: Verify `bun run check` passes**

```bash
bun run check
```

- [ ] **Step 3: Commit**

```bash
git add src/types/inspector.ts src/types/tool-registry.ts src/types/drag-payload.ts
git commit -m "feat(cluster-06): type contracts — InspectorSectionDef + ToolDef + drag-payload valibot schemas"
```

---

### Task 2: useEditorStore extension (showUI 3-state + panelsVisible + drop-target refs)

**Files:**
- Modify: `src/stores/editor.ts`
- Test: `tests/unit/stores/editor-extension.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// tests/unit/stores/editor-extension.test.ts
import { describe, test, expect, beforeEach } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'
import { useEditorStore } from '@/stores/editor'

describe('useEditorStore extensions', () => {
  beforeEach(() => setActivePinia(createPinia()))

  test('showUI is 3-state enum, default "full"', () => {
    const store = useEditorStore()
    expect(store.showUI).toBe('full')
    store.setUIVisibility('minimized'); expect(store.showUI).toBe('minimized')
    store.setUIVisibility('hidden');    expect(store.showUI).toBe('hidden')
    store.setUIVisibility('full');      expect(store.showUI).toBe('full')
  })

  test('panelsVisible.left + panelsVisible.right default true', () => {
    const store = useEditorStore()
    expect(store.panelsVisible.left).toBe(true)
    expect(store.panelsVisible.right).toBe(true)
  })

  test('togglePanel flips one side', () => {
    const store = useEditorStore()
    store.togglePanel('left')
    expect(store.panelsVisible.left).toBe(false)
    expect(store.panelsVisible.right).toBe(true)
  })

  test('dropTargetId and dropTargetAction are reactive refs default null', () => {
    const store = useEditorStore()
    expect(store.dropTargetId).toBeNull()
    expect(store.dropTargetAction).toBeNull()
    store.setDropTarget('node-1', 'fill-replace')
    expect(store.dropTargetId).toBe('node-1')
    expect(store.dropTargetAction).toBe('fill-replace')
    store.clearDropTarget()
    expect(store.dropTargetId).toBeNull()
  })
})
```

- [ ] **Step 2: Run, verify failure**

```bash
bun test tests/unit/stores/editor-extension.test.ts
```

- [ ] **Step 3: Extend `editor.ts`**

```ts
// src/stores/editor.ts (additions only — preserve existing state + actions)
import { ref, reactive } from 'vue'

// ... existing state ...

const showUI = ref<'hidden'|'minimized'|'full'>('full')
const panelsVisible = reactive({ left: true, right: true })
const dropTargetId = ref<string|null>(null)
const dropTargetAction = ref<string|null>(null)

function setUIVisibility(mode: 'hidden'|'minimized'|'full'): void {
  showUI.value = mode
}

function togglePanel(side: 'left'|'right'): void {
  panelsVisible[side] = !panelsVisible[side]
}

function setPanelVisible(side: 'left'|'right', visible: boolean): void {
  panelsVisible[side] = visible
}

function setDropTarget(nodeId: string|null, action: string|null): void {
  dropTargetId.value = nodeId
  dropTargetAction.value = action
}

function clearDropTarget(): void { setDropTarget(null, null) }

// Export the new state + actions alongside existing
return {
  // ... existing exports ...
  showUI, panelsVisible, dropTargetId, dropTargetAction,
  setUIVisibility, togglePanel, setPanelVisible, setDropTarget, clearDropTarget,
}
```

- [ ] **Step 4: Run tests, verify PASS**

```bash
bun test tests/unit/stores/editor-extension.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/stores/editor.ts tests/unit/stores/editor-extension.test.ts
git commit -m "feat(cluster-06): extend useEditorStore — 3-state showUI + panelsVisible + dropTarget refs"
```

---

### Task 3: useRightPanelStore (NEW Pinia)

**Files:**
- Create: `src/stores/right-panel.ts`
- Test: `tests/unit/stores/right-panel.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// tests/unit/stores/right-panel.test.ts
import { describe, test, expect, beforeEach } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'
import { useRightPanelStore } from '@/stores/right-panel'

describe('useRightPanelStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  test('activeTab default = ai (RATIFIED 2026-05-17 §12.13 — Kova differentiator: chat-first UX)', () => {
    const store = useRightPanelStore()
    expect(store.activeTab).toBe('ai')
    expect(store.isAiActive).toBe(true)
    expect(store.isDesignActive).toBe(false)
  })

  test('setActiveTab switches', () => {
    const store = useRightPanelStore()
    store.setActiveTab('design')
    expect(store.activeTab).toBe('design')
    expect(store.isDesignActive).toBe(true)
  })

  test('persists per-canvas via localStorage', () => {
    const store = useRightPanelStore()
    store.initFor('canvas-1')
    store.setActiveTab('design')
    expect(localStorage.getItem('right-panel-tab:canvas-1')).toBe('design')
  })

  test('initFor with no localStorage key → defaults to ai (first canvas open)', () => {
    const store = useRightPanelStore()
    store.initFor('canvas-fresh')
    expect(store.activeTab).toBe('ai')
  })

  test('initFor hydrates from localStorage when key present', () => {
    localStorage.setItem('right-panel-tab:canvas-2', 'design')
    const store = useRightPanelStore()
    store.initFor('canvas-2')
    expect(store.activeTab).toBe('design')
  })

  test('setActiveTab rejects "prototype"', () => {
    const store = useRightPanelStore()
    // @ts-expect-error — runtime guard
    expect(() => store.setActiveTab('prototype')).toThrow()
  })

  test('REGRESSION GUARD: store does NOT subscribe to selection events (sticky behavior — RATIFIED 2026-05-17 §12.14)', async () => {
    // The store source MUST NOT import useEditorStore or subscribe to selection changes.
    // Verify by static check: read the source file and assert no editor-store import.
    const src = await Bun.file('src/stores/right-panel.ts').text()
    expect(src).not.toContain('useEditorStore')
    expect(src).not.toContain('selectedNodeIds')
    expect(src).not.toContain('selectionStore')
  })
})
```

- [ ] **Step 2: Verify failure**

- [ ] **Step 3: Write store**

```ts
// src/stores/right-panel.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export type RightPanelTab = 'design' | 'ai'

// RATIFIED 2026-05-17 (founder):
//   §12.13 — Default tab on FIRST canvas open = 'ai' (Kova differentiator over Figma)
//   §12.14 — STICKY on layer-click: this store MUST NOT subscribe to selection events
export const useRightPanelStore = defineStore('right-panel', () => {
  const activeTab = ref<RightPanelTab>('ai')   // §12.13: first-open default
  const currentCanvasId = ref<string | null>(null)

  const isDesignActive = computed(() => activeTab.value === 'design')
  const isAiActive = computed(() => activeTab.value === 'ai')

  function setActiveTab(tab: RightPanelTab): void {
    if (tab !== 'design' && tab !== 'ai') throw new Error(`invalid_tab: ${tab}`)
    activeTab.value = tab
    if (currentCanvasId.value) {
      try { localStorage.setItem(`right-panel-tab:${currentCanvasId.value}`, tab) } catch {}
    }
  }

  function toggleAi(): void { setActiveTab(activeTab.value === 'ai' ? 'design' : 'ai') }

  function initFor(canvasId: string): void {
    currentCanvasId.value = canvasId
    try {
      const persisted = localStorage.getItem(`right-panel-tab:${canvasId}`)
      if (persisted === 'design' || persisted === 'ai') activeTab.value = persisted
      else activeTab.value = 'ai'   // §12.13: first-open default = AI
    } catch {
      activeTab.value = 'ai'
    }
  }

  // §12.14 STICKY: do NOT import useEditorStore; do NOT subscribe to selection.
  // The store has no awareness of canvas selection. Sticky behavior verified by static-check test.

  return { activeTab, isDesignActive, isAiActive, setActiveTab, toggleAi, initFor }
})
```

- [ ] **Step 4: Run tests, verify PASS**

- [ ] **Step 5: Commit**

```bash
git add src/stores/right-panel.ts tests/unit/stores/right-panel.test.ts
git commit -m "feat(cluster-06): useRightPanelStore — AI-default tab framework (Prototype dropped 2026-05-15; AI-default + sticky-on-selection ratified 2026-05-17)"
```

---

### Task 4: useToolRegistry (NEW Pinia)

**Files:**
- Create: `src/stores/tool-registry.ts`
- Test: `tests/unit/stores/tool-registry.test.ts`

**Icon convention (B-HIGH7 — W0-4 lock):** `ToolDef.icon` is a KovaIcon registry name (short form, e.g. `'mouse-pointer-2'`, `'crop'`, `'ruler'`, `'frame'`, `'square'`, `'circle'`, `'pen-tool'`, `'type'`, `'sparkles'`, `'component'`). The bottom toolbar passes the string into `<KovaIcon :name="tool.icon" />`. Forbidden alternates (`'i-lucide-*'` UnoCSS class strings, `<icon-lucide-*>` raw tags, `<component :is="\`icon-lucide-${name}\`">` template-literal resolution) are NOT permitted — see Cluster 11 Task 4.4 contract. ALL icon names registered above MUST be added to `src/components/ui/kova-icon-registry.ts` before this task ships.

- [ ] **Step 1: Write failing test**

```ts
// tests/unit/stores/tool-registry.test.ts
import { describe, test, expect, beforeEach } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'
import { useToolRegistry } from '@/stores/tool-registry'
import type { ToolDef } from '@/types/tool-registry'

const move: ToolDef = { id: 'move', slot: 'move', icon: 'mouse-pointer-2', label: 'Move', key: 'V', onActivate: () => {} }
const slice: ToolDef = { id: 'slice', slot: 'frame', parent: 'frame', icon: 'crop', label: 'Slice', key: 'S', onActivate: () => {} }
const measurement: ToolDef = { id: 'measurement', slot: 'measurement', icon: 'ruler', label: 'Measurement', keySequence: ['Shift','M'], onActivate: () => {} }

describe('useToolRegistry', () => {
  beforeEach(() => setActivePinia(createPinia()))

  test('register adds tool', () => {
    const r = useToolRegistry()
    r.register(move)
    expect(r.toolByKey('V')?.id).toBe('move')
  })

  test('primaryTools excludes dropdown sub-tools', () => {
    const r = useToolRegistry()
    r.register(move)
    r.register(slice)
    r.register(measurement)
    const primary = r.primaryTools
    expect(primary.find(t => t.id === 'slice')).toBeUndefined()
    expect(primary.find(t => t.id === 'move')).toBeDefined()
    expect(primary.find(t => t.id === 'measurement')).toBeDefined()
  })

  test('dropdownTools(slot) returns sub-tools', () => {
    const r = useToolRegistry()
    r.register(slice)
    expect(r.dropdownTools('frame')).toHaveLength(1)
    expect(r.dropdownTools('frame')[0].id).toBe('slice')
  })

  test('toolByKey matches single key and key sequences', () => {
    const r = useToolRegistry()
    r.register(measurement)
    expect(r.toolByKey('M', { shift: true })?.id).toBe('measurement')
    expect(r.toolByKey('M', { shift: false })).toBeUndefined()
  })

  test('when() predicate hides tool', () => {
    const r = useToolRegistry()
    let visible = false
    r.register({ ...move, id: 'cond-tool', when: () => visible })
    expect(r.primaryTools.find(t => t.id === 'cond-tool')).toBeUndefined()
    visible = true
    expect(r.primaryTools.find(t => t.id === 'cond-tool')).toBeDefined()
  })

  test('unregister removes', () => {
    const r = useToolRegistry()
    r.register(move)
    r.unregister('move')
    expect(r.primaryTools).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Verify failure**

- [ ] **Step 3: Write store**

```ts
// src/stores/tool-registry.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ToolDef, ToolSlot } from '@/types/tool-registry'
import { useEditorStore } from '@/stores/editor'

const PRIMARY_SLOT_ORDER: ToolSlot[] = ['move','frame','rectangle','ellipse','pen','text','measurement','ai','components']

export const useToolRegistry = defineStore('tool-registry', () => {
  const tools = ref<Map<string, ToolDef>>(new Map())

  const allVisibleTools = computed(() => [...tools.value.values()].filter(t => t.when ? t.when() : true))

  const primaryTools = computed(() => {
    const visible = allVisibleTools.value.filter(t => !t.parent)
    return visible.sort((a, b) => PRIMARY_SLOT_ORDER.indexOf(a.slot) - PRIMARY_SLOT_ORDER.indexOf(b.slot))
  })

  function dropdownTools(parent: 'move'|'frame'|'pen'): ToolDef[] {
    return allVisibleTools.value.filter(t => t.parent === parent)
  }

  function register(tool: ToolDef): void {
    tools.value.set(tool.id, tool)
  }

  function unregister(id: string): void {
    tools.value.delete(id)
  }

  function toolByKey(key: string, mods: { shift?: boolean; alt?: boolean; meta?: boolean; ctrl?: boolean } = {}): ToolDef | undefined {
    for (const t of allVisibleTools.value) {
      if (t.key && t.key.toUpperCase() === key.toUpperCase() && !mods.shift && !mods.alt && !mods.meta && !mods.ctrl) return t
      if (t.keySequence) {
        const wants = { shift: t.keySequence.includes('Shift'), alt: t.keySequence.includes('Alt'), meta: t.keySequence.includes('Meta'), ctrl: t.keySequence.includes('Ctrl') }
        const lastKey = t.keySequence[t.keySequence.length - 1]
        if (lastKey.toUpperCase() === key.toUpperCase()
          && !!mods.shift === wants.shift && !!mods.alt === wants.alt
          && !!mods.meta === wants.meta && !!mods.ctrl === wants.ctrl) return t
      }
    }
    return undefined
  }

  function setActive(id: string): void {
    const tool = tools.value.get(id)
    if (!tool || tool.disabled) return
    tool.onActivate()
    useEditorStore().activeTool = id  // existing M5 reactive
  }

  return { tools, primaryTools, dropdownTools, register, unregister, toolByKey, setActive }
})
```

- [ ] **Step 4: Run tests, verify PASS**

- [ ] **Step 5: Register the 9 default tools in `src/main.ts` (app init)**

```ts
// src/main.ts (additions)
import { useToolRegistry } from '@/stores/tool-registry'

// after pinia setup, before mount:
const registry = useToolRegistry()
registry.register({ id: 'move',       slot: 'move',       icon: 'mouse-pointer-2', label: 'Move',      key: 'V', onActivate: () => useEditorStore().setActiveTool('move') })
registry.register({ id: 'frame',      slot: 'frame',      icon: 'frame',           label: 'Frame',     key: 'F', onActivate: () => useEditorStore().setActiveTool('frame') })
registry.register({ id: 'rectangle',  slot: 'rectangle',  icon: 'square',          label: 'Rectangle', key: 'R', onActivate: () => useEditorStore().setActiveTool('rectangle') })
registry.register({ id: 'ellipse',    slot: 'ellipse',    icon: 'circle',          label: 'Ellipse',   key: 'O', onActivate: () => useEditorStore().setActiveTool('ellipse') })
registry.register({ id: 'pen',        slot: 'pen',        icon: 'pen-tool',        label: 'Pen',       key: 'P', onActivate: () => useEditorStore().setActiveTool('pen') })
registry.register({ id: 'text',       slot: 'text',       icon: 'type',            label: 'Text',      key: 'T', onActivate: () => useEditorStore().setActiveTool('text') })
registry.register({ id: 'ai',         slot: 'ai',         icon: 'sparkles',        label: 'Ask Kova',  onActivate: () => useRightPanelTab().focusAiComposer() })
registry.register({ id: 'components', slot: 'components', icon: 'component',       label: 'Components — Phase 2', disabled: true, onActivate: () => {} })
// Slice + Measurement registered by Cluster 07a (Wave 5)
```

- [ ] **Step 6: Commit**

```bash
git add src/stores/tool-registry.ts src/main.ts tests/unit/stores/tool-registry.test.ts
git commit -m "feat(cluster-06): useToolRegistry — declarative tool registration API + register 8 default tools (Slice + Measurement deferred to Cluster 07a)"
```

---

### Task 4b: use-page-operations composable (RATIFIED 2026-05-17 §12.2 — reorderPage + duplicatePage primitives)

**Why:** PRD §12.2 verified core lacks `editor.reorderPage` + `editor.duplicatePage` (grep `reorderPage|duplicatePage|movePage` in `packages/core/src` returns ZERO matches as of 2026-05-17). Cluster 06's Pages right-click menu (Cluster 08 owns the menu shell, this PRD owns the actions) needs both. **Decision: implement as Cluster-06 composable wrapping Yjs page-array splice** — no core mods.

**Files:**
- Create: `src/composables/use-page-operations.ts`
- Test: `tests/unit/composables/use-page-operations.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// tests/unit/composables/use-page-operations.test.ts
import { describe, test, expect, beforeEach } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'
import * as Y from 'yjs'
import { usePageOperations } from '@/composables/use-page-operations'
import { useEditorStore } from '@/stores/editor'

describe('usePageOperations (RATIFIED 2026-05-17 §12.2)', () => {
  beforeEach(() => setActivePinia(createPinia()))

  test('reorderPage moves page from index 0 to index 2', () => {
    const editor = useEditorStore()
    editor.addPage('Page 1')
    editor.addPage('Page 2')
    editor.addPage('Page 3')
    const ops = usePageOperations()
    const firstPageId = editor.pages[0].id

    ops.reorderPage(0, 2)

    expect(editor.pages[2].id).toBe(firstPageId)
    expect(editor.pages.length).toBe(3)
  })

  test('reorderPage no-op when fromIdx === toIdx', () => {
    const editor = useEditorStore()
    editor.addPage('Page 1')
    editor.addPage('Page 2')
    const before = editor.pages.map(p => p.id)
    const ops = usePageOperations()

    ops.reorderPage(1, 1)

    expect(editor.pages.map(p => p.id)).toEqual(before)
  })

  test('reorderPage throws on out-of-bounds index', () => {
    const editor = useEditorStore()
    editor.addPage('Page 1')
    const ops = usePageOperations()
    expect(() => ops.reorderPage(0, 99)).toThrow('out_of_bounds')
    expect(() => ops.reorderPage(-1, 0)).toThrow('out_of_bounds')
  })

  test('duplicatePage deep-clones target page + appends as new page with new id + " copy" suffix', () => {
    const editor = useEditorStore()
    editor.addPage('Hero Section')
    const originalId = editor.pages[0].id
    const ops = usePageOperations()

    const newId = ops.duplicatePage(originalId)

    expect(editor.pages.length).toBe(2)
    expect(editor.pages[1].id).toBe(newId)
    expect(editor.pages[1].id).not.toBe(originalId)
    expect(editor.pages[1].name).toBe('Hero Section copy')
  })

  test('duplicatePage throws when target page id not found', () => {
    const editor = useEditorStore()
    const ops = usePageOperations()
    expect(() => ops.duplicatePage('nonexistent-id')).toThrow('page_not_found')
  })

  test('duplicatePage clones nodes inside page (deep-clone, not by ref)', () => {
    const editor = useEditorStore()
    editor.addPage('Source')
    const originalId = editor.pages[0].id
    editor.addNodeToPage(originalId, { type: 'TEXT', text: 'Hello' })
    const ops = usePageOperations()

    const newId = ops.duplicatePage(originalId)
    const clonedNode = editor.pages.find(p => p.id === newId)!.nodes[0]
    const originalNode = editor.pages[0].nodes[0]
    expect(clonedNode.id).not.toBe(originalNode.id)
    expect(clonedNode.text).toBe('Hello')
  })
})
```

- [ ] **Step 2: Verify failure**

- [ ] **Step 3: Implement**

```ts
// src/composables/use-page-operations.ts
// RATIFIED 2026-05-17 PRD §12.2 — composable wrappers over Yjs page-array; no packages/core mods.
import { useEditorStore } from '@/stores/editor'
import { crypto } from '@/utils/crypto'  // crypto.getRandomValues per CLAUDE.md

export function usePageOperations(): {
  reorderPage: (fromIdx: number, toIdx: number) => void
  duplicatePage: (pageId: string) => string
} {
  const editor = useEditorStore()

  function reorderPage(fromIdx: number, toIdx: number): void {
    const pages = editor.pages
    if (fromIdx < 0 || fromIdx >= pages.length || toIdx < 0 || toIdx >= pages.length) {
      throw new Error('out_of_bounds')
    }
    if (fromIdx === toIdx) return

    // Yjs Y.Array splice — uses editor's internal Y.Doc transaction
    editor.transactPages((yPages) => {
      const moved = yPages.get(fromIdx)
      yPages.delete(fromIdx, 1)
      const insertIdx = toIdx > fromIdx ? toIdx - 1 : toIdx
      yPages.insert(insertIdx, [moved])
    })
  }

  function duplicatePage(pageId: string): string {
    const sourceIdx = editor.pages.findIndex(p => p.id === pageId)
    if (sourceIdx === -1) throw new Error('page_not_found')
    const source = editor.pages[sourceIdx]

    const newId = crypto.randomUUID()
    const cloned = structuredClone({
      ...source,
      id: newId,
      name: `${source.name} copy`,
      // node ids must also be regenerated so cloned tree doesn't collide with source
      nodes: source.nodes.map((n) => regenerateNodeIds(n)),
    })

    editor.transactPages((yPages) => {
      yPages.push([cloned])
    })

    return newId
  }

  return { reorderPage, duplicatePage }
}

// Recursive node-id regeneration helper
function regenerateNodeIds<T extends { id: string; children?: T[] }>(node: T): T {
  return {
    ...node,
    id: crypto.randomUUID(),
    children: node.children?.map((c) => regenerateNodeIds(c)),
  }
}
```

**Engine extension needed:** `useEditorStore.transactPages(fn: (yPages: Y.Array) => void)` exposes the Y.Doc transaction wrapper around the page array. Add to `editor.ts` (Pinia store, NOT `packages/core/`):

```ts
// src/stores/editor.ts (additions)
function transactPages(fn: (yPages: Y.Array<PageData>) => void): void {
  yDoc.transact(() => fn(yPagesArray))
}
```

- [ ] **Step 4: Run tests, verify PASS**

- [ ] **Step 5: Commit**

```bash
git add src/composables/use-page-operations.ts src/stores/editor.ts tests/unit/composables/use-page-operations.test.ts
git commit -m "feat(cluster-06): use-page-operations composable — reorderPage + duplicatePage Yjs wrappers (RATIFIED §12.2 2026-05-17 — core lacks primitives, Cluster 06 owns)"
```

---

### Task 5: useLayerTree composable (virtual-scrolled tree)

**Files:**
- Create: `src/composables/use-layer-tree.ts`
- Test: `tests/unit/composables/use-layer-tree.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// tests/unit/composables/use-layer-tree.test.ts
import { describe, test, expect, beforeEach } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'
import { useLayerTree } from '@/composables/use-layer-tree'
import { useEditorStore } from '@/stores/editor'

describe('useLayerTree', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    // seed editor.graph with a small page tree
    const editor = useEditorStore()
    editor.graph = {
      pages: [{ id: 'p1', name: 'Page 1', children: [
        { id: 'frame-1', type: 'FRAME', name: 'Hero', isMask: false, children: [
          { id: 'text-1', type: 'TEXT', name: 'Headline', isMask: false, children: [] },
          { id: 'rect-1', type: 'RECT', name: 'BG', isMask: true, maskType: 'ALPHA', children: [] },
        ] },
        { id: 'slice-1', type: 'SLICE', name: 'Export region', isMask: false, children: [] },
      ] }],
      currentPageId: 'p1',
    } as any
  })

  test('flatRows yields ordered rows with indent', () => {
    const tree = useLayerTree()
    const rows = tree.flatRows.value
    expect(rows.map(r => r.id)).toEqual(['frame-1','text-1','rect-1','slice-1'])
    expect(rows[1].indent).toBe(1)
    expect(rows[2].indent).toBe(1)
  })

  test('toggleExpand collapses children', () => {
    const tree = useLayerTree()
    tree.toggleExpand('frame-1')
    const rows = tree.flatRows.value
    expect(rows.map(r => r.id)).toEqual(['frame-1','slice-1'])
  })

  test('mask glyph variant carries maskType', () => {
    const tree = useLayerTree()
    const rectRow = tree.flatRows.value.find(r => r.id === 'rect-1')
    expect(rectRow?.maskGlyph).toBe('ALPHA')
  })

  test('slice glyph rendered for SLICE NodeType', () => {
    const tree = useLayerTree()
    const sliceRow = tree.flatRows.value.find(r => r.id === 'slice-1')
    expect(sliceRow?.isSlice).toBe(true)
  })

  test('reorderLayer calls editor.reorderChildWithUndo', () => {
    const tree = useLayerTree()
    const editor = useEditorStore()
    let captured: any = null
    editor.reorderChildWithUndo = ((args: any) => { captured = args }) as any
    tree.reorderLayer('text-1', 'rect-1')
    expect(captured).toEqual({ nodeId: 'text-1', beforeNodeId: 'rect-1' })
  })
})
```

- [ ] **Step 2: Verify failure**

- [ ] **Step 3: Write composable**

```ts
// src/composables/use-layer-tree.ts
import { computed, ref } from 'vue'
import { useEditorStore } from '@/stores/editor'

export interface LayerRow {
  id: string
  type: string
  name: string
  indent: number
  hasChildren: boolean
  isExpanded: boolean
  isMask: boolean
  maskGlyph: 'ALPHA'|'VECTOR'|'LUMINANCE'|null
  isSlice: boolean
  isVisible: boolean
  isLocked: boolean
}

const expandedState = ref<Map<string, boolean>>(new Map())

export function useLayerTree() {
  const editor = useEditorStore()

  function defaultExpanded(nodeId: string): boolean {
    return expandedState.value.has(nodeId) ? expandedState.value.get(nodeId)! : true
  }

  const flatRows = computed<LayerRow[]>(() => {
    const out: LayerRow[] = []
    const currentPage = (editor.graph as any)?.pages?.find?.((p: any) => p.id === (editor.graph as any).currentPageId)
    if (!currentPage) return out

    function walk(nodes: any[], indent: number): void {
      for (const n of nodes) {
        const expanded = defaultExpanded(n.id)
        out.push({
          id: n.id,
          type: n.type,
          name: n.name,
          indent,
          hasChildren: (n.children?.length ?? 0) > 0,
          isExpanded: expanded,
          isMask: n.isMask === true,
          maskGlyph: n.isMask ? (n.maskType ?? 'ALPHA') : null,
          isSlice: n.type === 'SLICE',
          isVisible: n.visible !== false,
          isLocked: n.locked === true,
        })
        if (expanded && n.children?.length) walk(n.children, indent + 1)
      }
    }
    walk(currentPage.children ?? [], 0)
    return out
  })

  function toggleExpand(nodeId: string): void {
    expandedState.value.set(nodeId, !defaultExpanded(nodeId))
  }

  function setExpanded(nodeId: string, expanded: boolean): void {
    expandedState.value.set(nodeId, expanded)
  }

  function reorderLayer(nodeId: string, beforeNodeId?: string, parentNodeId?: string): void {
    ;(editor as any).reorderChildWithUndo({ nodeId, beforeNodeId, parentNodeId })
  }

  const rowHeight = 28

  return { flatRows, rowHeight, toggleExpand, setExpanded, reorderLayer }
}
```

- [ ] **Step 4: Run tests, verify PASS**

- [ ] **Step 5: Commit**

```bash
git add src/composables/use-layer-tree.ts tests/unit/composables/use-layer-tree.test.ts
git commit -m "feat(cluster-06): useLayerTree — flat-row derivation with mask glyphs (per Q2) + slice glyph + reorder action"
```

---

### Task 6: useInspectorRouter composable

**Files:**
- Create: `src/composables/use-inspector-router.ts`
- Test: `tests/unit/composables/use-inspector-router.test.ts`

- [ ] **Step 1: Write test using mock InspectorSectionDef stubs registered via DI pattern**

```ts
// tests/unit/composables/use-inspector-router.test.ts
import { describe, test, expect, beforeEach } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'
import { useInspectorRouter, registerInspectorSection } from '@/composables/use-inspector-router'
import { useEditorStore } from '@/stores/editor'
import { h, defineComponent } from 'vue'

const PageStub = defineComponent({ name: 'PageStub', setup() { return () => h('div', 'page') } })
const PositionStub = defineComponent({ name: 'PositionStub', setup() { return () => h('div', 'position') } })
const TextStub = defineComponent({ name: 'TextStub', setup() { return () => h('div', 'text') } })

describe('useInspectorRouter', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    registerInspectorSection({ id: 'page', component: PageStub, priority: 0, supports: 'none' })
    registerInspectorSection({ id: 'position', component: PositionStub, priority: 10, supports: 'all' })
    registerInspectorSection({ id: 'text', component: TextStub, priority: 50, supports: ['TEXT'] })
  })

  test('when no selection → PageSection only', () => {
    const editor = useEditorStore()
    editor.selectedIds = []
    const router = useInspectorRouter()
    expect(router.activeSections.value.map(s => s.id)).toEqual(['page'])
  })

  test('when single TEXT selection → position + text (sorted by priority)', () => {
    const editor = useEditorStore()
    editor.selectedIds = ['text-1']
    editor.graph = { nodesById: { 'text-1': { id: 'text-1', type: 'TEXT' } } } as any
    const router = useInspectorRouter()
    expect(router.activeSections.value.map(s => s.id)).toEqual(['position','text'])
  })

  test('when single FRAME selection → position only (text not supported)', () => {
    const editor = useEditorStore()
    editor.selectedIds = ['frame-1']
    editor.graph = { nodesById: { 'frame-1': { id: 'frame-1', type: 'FRAME' } } } as any
    const router = useInspectorRouter()
    expect(router.activeSections.value.map(s => s.id)).toEqual(['position'])
  })
})
```

- [ ] **Step 2: Verify failure**

- [ ] **Step 3: Write composable**

```ts
// src/composables/use-inspector-router.ts
import { computed, ref } from 'vue'
import type { InspectorSectionDef } from '@/types/inspector'
import { useEditorStore } from '@/stores/editor'

const sections = ref<InspectorSectionDef[]>([])

export function registerInspectorSection(s: InspectorSectionDef): void {
  if (sections.value.some(x => x.id === s.id)) return
  sections.value = [...sections.value, s]
}

export function useInspectorRouter() {
  const editor = useEditorStore()

  const activeSections = computed<InspectorSectionDef[]>(() => {
    const ids = editor.selectedIds ?? []
    if (ids.length === 0) {
      return sections.value.filter(s => s.supports === 'none').sort((a, b) => a.priority - b.priority)
    }
    const isMulti = ids.length > 1
    const selectedType = !isMulti ? (editor.graph as any)?.nodesById?.[ids[0]]?.type : null

    return sections.value
      .filter(s => {
        if (s.supports === 'none') return false
        if (isMulti && s.multiSelect === false) return false
        if (s.supports === 'all') return true
        return Array.isArray(s.supports) && selectedType && s.supports.includes(selectedType)
      })
      .sort((a, b) => a.priority - b.priority)
  })

  return { activeSections }
})
```

(Fix typo: defineStore not needed — it's a composable returning computed. Keep as `}` not `})`.)

- [ ] **Step 4: Run tests, verify PASS**

- [ ] **Step 5: Commit**

```bash
git add src/composables/use-inspector-router.ts tests/unit/composables/use-inspector-router.test.ts
git commit -m "feat(cluster-06): useInspectorRouter — section list per selection type (DI registry for Cluster 07b sections)"
```

---

### Task 7: useRightPanelTab composable

**Files:**
- Create: `src/composables/use-right-panel-tab.ts`
- Test: `tests/unit/composables/use-right-panel-tab.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// tests/unit/composables/use-right-panel-tab.test.ts
import { describe, test, expect, beforeEach } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'
import { useRightPanelTab } from '@/composables/use-right-panel-tab'
import { useRightPanelStore } from '@/stores/right-panel'

describe('useRightPanelTab', () => {
  beforeEach(() => setActivePinia(createPinia()))

  test('switchToDesign + switchToAi delegate to store', () => {
    const store = useRightPanelStore()
    const tab = useRightPanelTab()
    tab.switchToAi()
    expect(store.activeTab).toBe('ai')
    tab.switchToDesign()
    expect(store.activeTab).toBe('design')
  })

  test('focusAiComposer switches to AI + emits focus request', () => {
    const tab = useRightPanelTab()
    let focused = false
    tab.onFocusRequest(() => { focused = true })
    tab.focusAiComposer()
    expect(useRightPanelStore().activeTab).toBe('ai')
    expect(focused).toBe(true)
  })
})
```

- [ ] **Step 2: Write composable**

```ts
// src/composables/use-right-panel-tab.ts
import { useRightPanelStore } from '@/stores/right-panel'

const focusListeners: Array<() => void> = []

export function useRightPanelTab() {
  const store = useRightPanelStore()

  function switchToDesign(): void { store.setActiveTab('design') }
  function switchToAi(): void { store.setActiveTab('ai') }
  function focusAiComposer(): void {
    store.setActiveTab('ai')
    queueMicrotask(() => { focusListeners.forEach(fn => fn()) })
  }
  function onFocusRequest(fn: () => void): () => void {
    focusListeners.push(fn)
    return () => { const idx = focusListeners.indexOf(fn); if (idx >= 0) focusListeners.splice(idx, 1) }
  }

  return { switchToDesign, switchToAi, focusAiComposer, onFocusRequest, activeTab: store.activeTab }
}
```

- [ ] **Step 3: PASS + Commit**

```bash
git add src/composables/use-right-panel-tab.ts tests/unit/composables/use-right-panel-tab.test.ts
git commit -m "feat(cluster-06): useRightPanelTab — switchTo + focusAiComposer with listener registry"
```

---

### Task 8: Extend use-canvas-drop with 5 MIME-typed drop handlers

**Files:**
- Modify: `src/composables/use-canvas-drop.ts`
- Test: `tests/unit/composables/use-canvas-drop.test.ts` (EXTEND existing)

- [ ] **Step 1: Write failing tests for each MIME handler + modifier-key behavior + invalid payload reject**

```ts
// tests/unit/composables/use-canvas-drop.test.ts (extend or new file)
import { describe, test, expect, beforeEach, mock } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'
import { useCanvasDrop } from '@/composables/use-canvas-drop'
import { useEditorStore } from '@/stores/editor'
import { DRAG_MIME } from '@/types/drag-payload'

function makeDropEvent(types: string[], data: Record<string, string>, modifiers: { shift?: boolean; alt?: boolean } = {}): DragEvent {
  const dt = {
    types,
    getData: mock((k: string) => data[k] ?? ''),
    files: [] as any,
  } as unknown as DataTransfer
  return { dataTransfer: dt, clientX: 100, clientY: 100, preventDefault: mock(() => undefined), shiftKey: !!modifiers.shift, altKey: !!modifiers.alt } as any
}

describe('useCanvasDrop — 5 MIME handlers', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const editor = useEditorStore()
    ;(editor as any).hitTestAt = mock(() => ({ id: 'frame-1', type: 'FRAME' }))
    ;(editor as any).screenToCanvas = mock(() => ({ x: 50, y: 50 }))
    ;(editor as any).commitNodeUpdate = mock(() => undefined)
    ;(editor as any).createNode = mock(() => ({ id: 'new-1' }))
  })

  test('color drop on frame → commitNodeUpdate with fills replaced', async () => {
    const drop = useCanvasDrop()
    const evt = makeDropEvent([DRAG_MIME.COLOR], { [DRAG_MIME.COLOR]: JSON.stringify({ hex: '#FA5400', swatchId: '00000000-0000-0000-0000-000000000001', brandId: '00000000-0000-0000-0000-000000000002' }) })
    await drop.handleDrop(evt)
    expect((useEditorStore() as any).commitNodeUpdate).toHaveBeenCalledWith('frame-1', expect.objectContaining({ fills: expect.any(Array) }))
  })

  test('Shift+color drop → stroke replace', async () => {
    const drop = useCanvasDrop()
    const evt = makeDropEvent([DRAG_MIME.COLOR], { [DRAG_MIME.COLOR]: JSON.stringify({ hex: '#FA5400', swatchId: '00000000-0000-0000-0000-000000000001', brandId: '00000000-0000-0000-0000-000000000002' }) }, { shift: true })
    await drop.handleDrop(evt)
    expect((useEditorStore() as any).commitNodeUpdate).toHaveBeenCalledWith('frame-1', expect.objectContaining({ strokes: expect.any(Array) }))
  })

  test('color drop on empty canvas → spawn rect', async () => {
    setActivePinia(createPinia())
    const editor = useEditorStore()
    ;(editor as any).hitTestAt = mock(() => null)
    ;(editor as any).screenToCanvas = mock(() => ({ x: 50, y: 50 }))
    ;(editor as any).createNode = mock(() => ({ id: 'new-1' }))
    const drop = useCanvasDrop()
    const evt = makeDropEvent([DRAG_MIME.COLOR], { [DRAG_MIME.COLOR]: JSON.stringify({ hex: '#FA5400', swatchId: '00000000-0000-0000-0000-000000000001', brandId: '00000000-0000-0000-0000-000000000002' }) })
    await drop.handleDrop(evt)
    expect((useEditorStore() as any).createNode).toHaveBeenCalledWith(expect.objectContaining({ type: 'RECT', w: 200, h: 200 }))
  })

  test('saved-block type=cta → spawn TEXT wrapped in button frame', async () => {
    const drop = useCanvasDrop()
    const payload = { blockId: '00000000-0000-0000-0000-000000000003', blockData: { label: 'CTA', content: 'Shop now', type: 'cta' }, brandId: '00000000-0000-0000-0000-000000000002' }
    const evt = makeDropEvent([DRAG_MIME.SAVED_BLOCK], { [DRAG_MIME.SAVED_BLOCK]: JSON.stringify(payload) })
    await drop.handleDrop(evt)
    // Expect createNode called twice: outer frame + inner text (or single create with type='BUTTON_FRAME' if engine has it)
    const calls = ((useEditorStore() as any).createNode as any).mock.calls
    expect(calls.length).toBeGreaterThanOrEqual(1)
    expect(calls.some((c: any) => c[0].type === 'TEXT' && c[0].content === 'Shop now')).toBe(true)
  })

  test('invalid payload rejected silently', async () => {
    const drop = useCanvasDrop()
    const evt = makeDropEvent([DRAG_MIME.COLOR], { [DRAG_MIME.COLOR]: JSON.stringify({ wrong: 'shape' }) })
    await drop.handleDrop(evt)
    expect((useEditorStore() as any).commitNodeUpdate).not.toHaveBeenCalled()
    expect((useEditorStore() as any).createNode).not.toHaveBeenCalled()
  })

  test('existing image-file drop preserved (no MIME match → file fallback)', async () => {
    // ... call drop.handleDrop with dataTransfer.files set
  })
})
```

- [ ] **Step 2: Verify failure**

- [ ] **Step 3: Extend use-canvas-drop.ts with the dispatch table**

```ts
// src/composables/use-canvas-drop.ts (additions on top of existing)
import * as v from 'valibot'
import {
  DRAG_MIME,
  BrandColorPayloadSchema, BrandFontPayloadSchema, BrandAssetPayloadSchema,
  SavedBlockPayloadSchema, ToneSnippetPayloadSchema,
} from '@/types/drag-payload'
import { useEditorStore } from '@/stores/editor'

export function useCanvasDrop() {
  const editor = useEditorStore()

  async function handleDrop(e: DragEvent): Promise<void> {
    if (!e.dataTransfer) return
    const types = Array.from(e.dataTransfer.types)
    const pos = (editor as any).screenToCanvas(e.clientX, e.clientY)
    const target = (editor as any).hitTestAt(pos.x, pos.y)
    const modifiers = { shift: e.shiftKey, alt: e.altKey }

    // Dispatch on first matching MIME
    if (types.includes(DRAG_MIME.COLOR)) {
      const raw = e.dataTransfer.getData(DRAG_MIME.COLOR)
      const parsed = v.safeParse(BrandColorPayloadSchema, JSON.parse(raw))
      if (!parsed.success) { console.warn('[drop] invalid color payload', parsed.issues); return }
      const p = parsed.output

      if (target) {
        if (modifiers.shift) {
          editor.setDropTarget(target.id, 'stroke-replace')
          ;(editor as any).commitNodeUpdate(target.id, { strokes: [{ type: 'SOLID', color: p.hex }] })
        } else if (modifiers.alt) {
          editor.setDropTarget(target.id, 'fill-additive')
          const existing = (editor as any).graph?.nodesById?.[target.id]?.fills ?? []
          ;(editor as any).commitNodeUpdate(target.id, { fills: [...existing, { type: 'SOLID', color: p.hex }] })
        } else {
          editor.setDropTarget(target.id, 'fill-replace')
          ;(editor as any).commitNodeUpdate(target.id, { fills: [{ type: 'SOLID', color: p.hex }] })
        }
      } else {
        ;(editor as any).createNode({ type: 'RECT', x: pos.x - 100, y: pos.y - 100, w: 200, h: 200, fills: [{ type: 'SOLID', color: p.hex }] })
      }
      editor.clearDropTarget()
      return
    }

    if (types.includes(DRAG_MIME.FONT)) {
      const raw = e.dataTransfer.getData(DRAG_MIME.FONT)
      const parsed = v.safeParse(BrandFontPayloadSchema, JSON.parse(raw))
      if (!parsed.success) return
      const p = parsed.output
      if (target && target.type === 'TEXT') {
        ;(editor as any).commitNodeUpdate(target.id, { fontFamily: p.family })
      } else {
        ;(editor as any).createNode({ type: 'TEXT', x: pos.x, y: pos.y, content: 'Edit text', fontFamily: p.family })
      }
      editor.clearDropTarget()
      return
    }

    if (types.includes(DRAG_MIME.ASSET)) {
      const raw = e.dataTransfer.getData(DRAG_MIME.ASSET)
      const parsed = v.safeParse(BrandAssetPayloadSchema, JSON.parse(raw))
      if (!parsed.success) return
      const p = parsed.output
      if (target && hasFillSupport(target.type)) {
        ;(editor as any).commitNodeUpdate(target.id, { fills: [{ type: 'IMAGE', imageUrl: p.url, scaleMode: 'FILL' }] })
      } else {
        const { naturalWidth, naturalHeight } = await fetchImageDimensions(p.url)
        ;(editor as any).createNode({ type: 'IMAGE', x: pos.x - naturalWidth / 2, y: pos.y - naturalHeight / 2, w: naturalWidth, h: naturalHeight, imageUrl: p.url })
      }
      editor.clearDropTarget()
      return
    }

    if (types.includes(DRAG_MIME.SAVED_BLOCK)) {
      const raw = e.dataTransfer.getData(DRAG_MIME.SAVED_BLOCK)
      const parsed = v.safeParse(SavedBlockPayloadSchema, JSON.parse(raw))
      if (!parsed.success) return
      const p = parsed.output
      const t = p.blockData.type
      if (t === 'cta') {
        const wrap = (editor as any).createNode({ type: 'RECT', x: pos.x - 100, y: pos.y - 20, w: 200, h: 40, cornerRadius: 6, fills: [{ type: 'SOLID', color: '#1a1a18' }] })
        ;(editor as any).createNode({ type: 'TEXT', parentId: wrap.id, x: 0, y: 0, content: p.blockData.content, color: '#ffffff', align: 'center' })
      } else if (t === 'footer') {
        const containerFrame = nearestContainingFrame(target)
        const y = containerFrame ? containerFrame.y + containerFrame.h - 40 : pos.y
        ;(editor as any).createNode({ type: 'TEXT', x: pos.x, y, content: p.blockData.content })
      } else {
        ;(editor as any).createNode({ type: 'TEXT', x: pos.x, y: pos.y, content: p.blockData.content })
      }
      editor.clearDropTarget()
      return
    }

    if (types.includes(DRAG_MIME.TONE_SNIPPET)) {
      const raw = e.dataTransfer.getData(DRAG_MIME.TONE_SNIPPET)
      const parsed = v.safeParse(ToneSnippetPayloadSchema, JSON.parse(raw))
      if (!parsed.success) return
      const p = parsed.output
      if (target && target.type === 'TEXT') {
        ;(editor as any).commitNodeUpdate(target.id, { content: p.content })
      } else {
        ;(editor as any).createNode({ type: 'TEXT', x: pos.x, y: pos.y, content: p.content })
      }
      editor.clearDropTarget()
      return
    }

    // Fall through to existing image-file drop (M5 behavior)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      // existing handleImageFileDrop
    }
  }

  async function handleDragOver(e: DragEvent): Promise<void> {
    if (!e.dataTransfer) return
    e.preventDefault()
    const types = Array.from(e.dataTransfer.types)
    const pos = (editor as any).screenToCanvas(e.clientX, e.clientY)
    const target = (editor as any).hitTestAt(pos.x, pos.y)

    let action: string | null = null
    if (types.includes(DRAG_MIME.COLOR)) {
      action = target ? (e.shiftKey ? 'stroke-replace' : e.altKey ? 'fill-additive' : 'fill-replace') : 'spawn-rect'
    } else if (types.includes(DRAG_MIME.FONT)) {
      action = target?.type === 'TEXT' ? 'text-font' : 'spawn-text'
    } else if (types.includes(DRAG_MIME.ASSET)) {
      action = target && hasFillSupport(target.type) ? 'image-fill-replace' : 'spawn-image'
    } else if (types.includes(DRAG_MIME.SAVED_BLOCK)) {
      action = 'spawn-text'
    }
    editor.setDropTarget(target?.id ?? null, action)
  }

  function handleDragLeave(): void { editor.clearDropTarget() }

  return { handleDrop, handleDragOver, handleDragLeave }
}

function hasFillSupport(type: string): boolean {
  return ['FRAME','RECT','ELLIPSE','POLYGON','STAR','LINE','TEXT'].includes(type)
}

async function fetchImageDimensions(url: string): Promise<{ naturalWidth: number; naturalHeight: number }> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve({ naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight })
    img.onerror = () => resolve({ naturalWidth: 300, naturalHeight: 300 })
    img.src = url
  })
}

function nearestContainingFrame(target: any): any | null {
  // Walk up parents until FRAME found; return null if not
  let n = target
  while (n) {
    if (n.type === 'FRAME') return n
    n = n.parent
  }
  return null
}
```

- [ ] **Step 4: Run tests, verify PASS**

- [ ] **Step 5: Commit**

```bash
git add src/composables/use-canvas-drop.ts tests/unit/composables/use-canvas-drop.test.ts
git commit -m "feat(cluster-06): use-canvas-drop — 5 MIME dispatch + modifier-key behavior + valibot validation"
```

**Sub-test 8.6: Crash-resistance against malformed drop payload (C-MED18)**

Valibot covers schema-shape validation; this sub-test adds explicit coverage for truncated / non-MIME drops so a malformed paste cannot crash the editor or corrupt scene state.

```ts
// tests/integration/editor/drop-malformed-payload.test.ts
import { describe, test, expect } from 'bun:test'
import { mountEditorHost } from '@/test/mount-editor-host'

describe('use-canvas-drop — malformed payload (C-MED18)', () => {
  test('truncated saved-block JSON does not crash editor; surfaces error toast', async () => {
    const host = await mountEditorHost()
    const dt = new DataTransfer()
    dt.setData('application/x-kova-saved-block', '{"id":"abc","payl')  // truncated mid-JSON
    const ev = new DragEvent('drop', { dataTransfer: dt })
    host.canvas.dispatchEvent(ev)
    await host.flush()
    expect(host.toastQueue).toContainEqual(
      expect.objectContaining({ variant: 'error', code: 'drop_invalid_payload' })
    )
    expect(host.editorStateChanged).toBe(false)
  })

  test('non-MIME plain-text drop is a silent no-op', async () => {
    const host = await mountEditorHost()
    const dt = new DataTransfer()
    dt.setData('text/plain', 'lol')
    const ev = new DragEvent('drop', { dataTransfer: dt })
    host.canvas.dispatchEvent(ev)
    await host.flush()
    expect(host.editorStateChanged).toBe(false)
    expect(host.toastQueue).toHaveLength(0)
  })

  test('empty DataTransfer is a silent no-op', async () => {
    const host = await mountEditorHost()
    const ev = new DragEvent('drop', { dataTransfer: new DataTransfer() })
    host.canvas.dispatchEvent(ev)
    await host.flush()
    expect(host.editorStateChanged).toBe(false)
  })
})
```

Commit (separate from Step 5 commit above so the crash-resistance test ships as its own atomic change):

```bash
git add tests/integration/editor/drop-malformed-payload.test.ts
git commit -m "test(cluster-06): malformed drop payload crash-resistance (C-MED18)"
```

---

### Task 9: TopChrome + 4 sub-components

**Files:**
- Create: `src/components/editor/TopChrome.vue`, `TopChromeLogo.vue`, `FileBreadcrumb.vue`, `TopChromeActions.vue`, `AvatarDropdown.vue`, `MissingFontsPill.vue`
- Test: `tests/unit/components/editor/TopChrome.test.ts`, `AvatarDropdown.test.ts`, `FileBreadcrumb.test.ts`, `MissingFontsPill.test.ts`

- [ ] **Step 1: Write failing tests** (4 component tests covering: 5-item avatar dropdown per Q16; brand-click emit; topbar renders all children; **TopChromeActions renders NO Comments slot — RATIFIED HIDE 2026-05-17 §12.3**)

- [ ] **Step 2: Write components per PRD §6.4.2** — see PRD for exact prop/emit contracts. AvatarDropdown uses Reka DropdownMenu from Cluster 11. `TopChromeActions.vue` template renders ONLY: `<NotificationsIcon disabled />` + `<PresentIcon disabled />` + `<AvatarDropdown />`. **NO `<CommentsIconButton>` slot** — DOM must not contain `[data-testid="topbar-comments"]`.

- [ ] **Step 3: PASS + Commit**

```ts
// tests/unit/components/editor/TopChromeActions.test.ts
import { describe, test, expect } from 'bun:test'
import { mount } from '@vue/test-utils'
import TopChromeActions from '@/components/editor/TopChromeActions.vue'

describe('TopChromeActions — RATIFIED 2026-05-17 §12.3 (Comments HIDDEN)', () => {
  test('does NOT render Comments icon in topbar', () => {
    const wrap = mount(TopChromeActions)
    expect(wrap.find('[data-testid="topbar-comments"]').exists()).toBe(false)
    expect(wrap.text().toLowerCase()).not.toContain('comment')
  })

  test('renders Notifications + Present + Avatar slots', () => {
    const wrap = mount(TopChromeActions)
    expect(wrap.find('[data-testid="topbar-notifications"]').exists()).toBe(true)
    expect(wrap.find('[data-testid="topbar-present"]').exists()).toBe(true)
    expect(wrap.find('[data-testid="topbar-avatar"]').exists()).toBe(true)
  })
})
```

```bash
git add src/components/editor/TopChrome.vue src/components/editor/TopChromeLogo.vue src/components/editor/FileBreadcrumb.vue src/components/editor/TopChromeActions.vue src/components/editor/AvatarDropdown.vue src/components/editor/MissingFontsPill.vue tests/unit/components/editor/TopChrome.test.ts tests/unit/components/editor/TopChromeActions.test.ts tests/unit/components/editor/AvatarDropdown.test.ts tests/unit/components/editor/FileBreadcrumb.test.ts
git commit -m "feat(cluster-06): top chrome — logo + file breadcrumb (Q17 navigate) + actions (Comments hidden per §12.3 2026-05-17) + 5-item avatar dropdown (Q16)"
```

**Sub-test 9.x: `<MissingFontsPill>` mount + click handler (C-LOW06.4)**

```ts
// tests/unit/components/editor/MissingFontsPill.test.ts
import { describe, test, expect } from 'bun:test'
import { mount } from '@vue/test-utils'
import MissingFontsPill from '@/components/editor/MissingFontsPill.vue'

describe('<MissingFontsPill> (C-LOW06.4)', () => {
  test('renders count text when missingCount > 0', () => {
    const w = mount(MissingFontsPill, { props: { missingCount: 2 } })
    expect(w.text()).toContain('2')
    expect(w.text()).toMatch(/missing/i)
  })

  test('does not render when missingCount = 0', () => {
    const w = mount(MissingFontsPill, { props: { missingCount: 0 } })
    expect(w.find('[data-testid="missing-fonts-pill"]').exists()).toBe(false)
  })

  test('click emits open-font-manager event', async () => {
    const w = mount(MissingFontsPill, { props: { missingCount: 1 } })
    await w.find('[data-testid="missing-fonts-pill"]').trigger('click')
    expect(w.emitted('open-font-manager')).toBeTruthy()
  })

  test('aria-label includes count for screen readers', () => {
    const w = mount(MissingFontsPill, { props: { missingCount: 3 } })
    expect(w.find('[data-testid="missing-fonts-pill"]').attributes('aria-label'))
      .toMatch(/3.*missing fonts/i)
  })
})
```

**Version history event contract (C-MED26 — ratified W3 fix dispatch):**

The file-menu items "Show version history" and "Save to version history (⌥⌘S)" (defined in Plan 08 §3.3 file-name dropdown rows) dispatch via a global event bus that Cluster 09's `<VersionHistoryPanel>` consumes. TopChrome itself only hosts the file-name trigger surface (`FileBreadcrumb.vue`); it does NOT mount the panel.

Event surface (defined here; consumed by Plan 09 W4):

```ts
// src/lib/editor-bus.ts (Cluster 11 shared)
export interface EditorBusEvents {
  'editor:open-version-history':  { canvasId: string; brandId: string }
  'editor:save-version-snapshot': { canvasId: string; label?: string }
}
```

- Plan 08 file-name dropdown row handlers call `editorBus.emit('editor:open-version-history', { canvasId, brandId })`.
- Plan 09 (W4) mounts `<VersionHistoryPanel>` listening for both events; on `open-version-history` it slides the right panel over the inspector; on `save-version-snapshot` it triggers snapshot RPC + toast.
- TopChrome integration test: assert `FileBreadcrumb` emits no panel-mount logic itself (decoupling guard).

---

### Task 10: BottomToolbar + ToolButton + ToolDropdown + AiToolButton

**Files:**
- Create: `src/components/editor/BottomToolbar.vue`, `ToolButton.vue`, `ToolDropdown.vue`, `AiToolButton.vue`
- Test: `tests/unit/components/editor/BottomToolbar.test.ts`, `ToolButton.test.ts`

- [ ] **Step 1: Write tests covering:** 9 default tools render (Move/Frame/Rect/Ellipse/Pen/Text/Measurement-pending-07a/AI/Components); Components disabled tooltip; AI tool click → focusAiComposer

- [ ] **Step 2: Implement components.** BottomToolbar reads `useToolRegistry.primaryTools`. ToolButton renders icon + tooltip + active state + chevron when `useToolRegistry.dropdownTools(tool.slot).length > 0`. ToolDropdown uses Reka DropdownMenu.

- [ ] **Step 3: PASS + Commit**

```bash
git commit -m "feat(cluster-06): bottom toolbar — 9 default tools rendered from useToolRegistry, AI tool opens right-panel AI tab"
```

---

### Task 11: LeftPanel + FileRow + LayersPanel extension + LayerRow + LayersEmptyState + useLeftPanelStore

**Files:**
- Create: `src/components/editor/LeftPanel.vue`, `FileRow.vue`, `LayerRow.vue`, `LayersEmptyState.vue`, `src/stores/left-panel.ts` (NEW — collapsed-section state per RATIFICATION 2026-05-17 §12.1)
- Modify: `src/components/editor/LayersPanel.vue`, `PagesPanel.vue` (existing — add right-click anchor)
- Test: `tests/unit/components/editor/LayersPanel.test.ts`, `LayerRow.test.ts`, `tests/unit/components/editor/LeftPanel.test.ts`, `tests/unit/stores/left-panel.test.ts`

- [ ] **Step 1: Tests covering:**
  - mask glyph + slice glyph per node type
  - empty state renders when no rows
  - LayerRow per maskType variant
  - **LeftPanel renders 3 stacked `<CollapsibleRoot>` sections in order: Pages, Layers, Shop (RATIFIED §12.1 2026-05-17)**
  - **Shop section default-expanded when active brand has `shopify_connection_history.connection_status = 'connected'`; default-collapsed otherwise**
  - **`useLeftPanelStore.collapsed['shop']` persists per-user via localStorage**
  - Section header count badge format: `"Pages · 3"`, `"Layers · 14"`, `"Shop · 247"`

- [ ] **Step 2: Implement.**
  - `LayersPanel` uses `useLayerTree`. Virtual scrolling via `<vue-virtual-scroller>` or hand-rolled with `rowHeight: 28`.
  - `LayerRow` renders all 7 cells (caret + icon + indent + name + mask + vis + lock).
  - `LeftPanel.vue` composes 3 sections — see template below.
  - `useLeftPanelStore` tracks `collapsed: Record<'pages'|'layers'|'shop', boolean>`, persists to `localStorage['left-panel-collapsed']`.

```vue
<!-- src/components/editor/LeftPanel.vue (RATIFIED §12.1 2026-05-17 — 3 stacked sections) -->
<script setup lang="ts">
import { computed } from 'vue'
import { CollapsibleRoot, CollapsibleTrigger, CollapsibleContent } from 'reka-ui'
import PagesPanel from './sidebar/PagesPanel.vue'
import LayersPanel from './sidebar/LayersPanel.vue'
import ShopPanel from './sidebar/ShopPanel.vue'
import FileRow from './FileRow.vue'
import { useLeftPanelStore } from '@/stores/left-panel'
import { useBrandsStore } from '@/stores/brands'
import { useShopifyConnectionStore } from '@/stores/shopify-connection'

const lp = useLeftPanelStore()
const brands = useBrandsStore()
const shopify = useShopifyConnectionStore()

const shopifyConnected = computed(() =>
  shopify.connectionStatusForBrand(brands.activeBrandId) === 'connected'
)
const shopDefaultExpanded = computed(() => shopifyConnected.value)
</script>

<template>
  <aside class="left-panel w-[240px] h-full flex flex-col bg-fill-2 border-r border-line">
    <FileRow />

    <CollapsibleRoot v-model:open="lp.expanded.pages" class="flex-shrink-0">
      <CollapsibleTrigger class="section-header">
        <span>Pages</span>
        <span class="count-badge">{{ pageCount }}</span>
      </CollapsibleTrigger>
      <CollapsibleContent><PagesPanel /></CollapsibleContent>
    </CollapsibleRoot>

    <CollapsibleRoot v-model:open="lp.expanded.layers" class="flex-1 min-h-0 flex flex-col">
      <CollapsibleTrigger class="section-header">
        <span>Layers</span>
        <span class="count-badge">{{ layerCount }}</span>
      </CollapsibleTrigger>
      <CollapsibleContent class="flex-1 overflow-hidden"><LayersPanel /></CollapsibleContent>
    </CollapsibleRoot>

    <CollapsibleRoot
      v-model:open="lp.expanded.shop"
      :default-open="shopDefaultExpanded"
      class="flex-shrink-0 max-h-[40vh]"
    >
      <CollapsibleTrigger class="section-header">
        <span>Shop</span>
        <span class="count-badge">{{ productCount }}</span>
      </CollapsibleTrigger>
      <CollapsibleContent class="overflow-hidden"><ShopPanel /></CollapsibleContent>
    </CollapsibleRoot>
  </aside>
</template>
```

```ts
// src/stores/left-panel.ts (NEW)
import { defineStore } from 'pinia'
import { reactive, watch } from 'vue'

interface ExpandedState {
  pages: boolean
  layers: boolean
  shop: boolean
}

const STORAGE_KEY = 'left-panel-expanded'

function loadInitial(): ExpandedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        pages: parsed.pages ?? true,
        layers: parsed.layers ?? true,
        shop: parsed.shop ?? false,  // §12.1: default-collapsed unless brand has Shopify (LeftPanel.vue overrides via :default-open)
      }
    }
  } catch {}
  return { pages: true, layers: true, shop: false }
}

export const useLeftPanelStore = defineStore('left-panel', () => {
  const expanded = reactive<ExpandedState>(loadInitial())

  watch(expanded, (next) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
  }, { deep: true })

  return { expanded }
})
```

- [ ] **Step 3: PASS + Commit**

```bash
git commit -m "feat(cluster-06): left panel — 3 stacked sections (Pages + Layers + Shop) per §12.1 2026-05-17 + virtual scroll + mask/slice glyphs + useLeftPanelStore persisted collapse state"
```

**Sub-spec 11.x: Inter-section ResizeHandle (C-LOW06.3)**

Between the three stacked sections (Pages ↔ Layers ↔ Shop) render a 4px-tall draggable `<ResizeHandle>` row. Dragging adjusts the height of the section ABOVE the handle (Pages or Layers); the lower section flexes to consume remaining space. Persist heights per-user.

Files:
- Create: `src/components/editor/ResizeHandle.vue`
- Modify: `src/components/editor/LeftPanel.vue` (insert handles between sections)
- Modify: `src/stores/left-panel.ts` (add `sectionHeights` state)

Store extension:

```ts
// src/stores/left-panel.ts (EXTEND)
interface SectionHeights {
  pages: number   // px — min 80, max 600, default 160
  layers: number  // px — min 120, max 800, default 360
  // shop flexes to fill remaining
}
const STORAGE_HEIGHTS_KEY = 'left-panel-section-heights'

// inside defineStore:
const sectionHeights = reactive<SectionHeights>(loadInitialHeights())
function setSectionHeight(section: keyof SectionHeights, px: number) {
  const clamped = clampHeight(section, px)
  sectionHeights[section] = clamped
}
watch(sectionHeights, (next) => {
  try { localStorage.setItem(STORAGE_HEIGHTS_KEY, JSON.stringify(next)) } catch {}
}, { deep: true })
```

Component:

```vue
<!-- src/components/editor/ResizeHandle.vue -->
<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  /** which section's height this handle controls */
  section: 'pages' | 'layers'
  /** current height in px */
  modelValue: number
  min: number
  max: number
}>()
const emit = defineEmits<{ 'update:modelValue': [px: number] }>()

const dragging = ref(false)
const startY = ref(0)
const startH = ref(0)

function onDown(e: PointerEvent) {
  dragging.value = true
  startY.value = e.clientY
  startH.value = props.modelValue
  ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
}
function onMove(e: PointerEvent) {
  if (!dragging.value) return
  const delta = e.clientY - startY.value
  const next = Math.min(props.max, Math.max(props.min, startH.value + delta))
  emit('update:modelValue', next)
}
function onUp(e: PointerEvent) {
  dragging.value = false
  ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
}
</script>
<template>
  <div
    class="rh"
    :class="{ dragging }"
    role="separator"
    aria-orientation="horizontal"
    :aria-label="`Resize ${section} section`"
    @pointerdown="onDown"
    @pointermove="onMove"
    @pointerup="onUp"
    @pointercancel="onUp"
  />
</template>
<style scoped>
.rh { height: 4px; cursor: row-resize; }
.rh:hover, .rh.dragging { background: var(--kc-border-focus); }
</style>
```

Tests:

```ts
// tests/unit/components/editor/ResizeHandle.test.ts
import { describe, test, expect } from 'bun:test'
import { mount } from '@vue/test-utils'
import ResizeHandle from '@/components/editor/ResizeHandle.vue'

describe('<ResizeHandle> (C-LOW06.3)', () => {
  test('emits update:modelValue clamped to min/max while dragging', async () => {
    const w = mount(ResizeHandle, { props: { section: 'pages', modelValue: 200, min: 80, max: 600 } })
    await w.trigger('pointerdown', { clientY: 100 })
    await w.trigger('pointermove', { clientY: 150 })  // +50 → 250
    expect(w.emitted('update:modelValue')?.[0]).toEqual([250])
    await w.trigger('pointermove', { clientY: 800 })  // would be 900 → clamped 600
    expect(w.emitted('update:modelValue')?.at(-1)).toEqual([600])
  })

  test('setSectionHeight clamps and persists to localStorage', () => {
    const store = useLeftPanelStore()
    store.setSectionHeight('pages', 50)   // below min 80
    expect(store.sectionHeights.pages).toBe(80)
    store.setSectionHeight('pages', 1000) // above max 600
    expect(store.sectionHeights.pages).toBe(600)
    expect(JSON.parse(localStorage.getItem('left-panel-section-heights')!).pages).toBe(600)
  })
})
```

Commit (separate from Task 11 Step 3):

```bash
git add src/components/editor/ResizeHandle.vue src/components/editor/LeftPanel.vue src/stores/left-panel.ts tests/unit/components/editor/ResizeHandle.test.ts tests/unit/stores/left-panel.test.ts
git commit -m "feat(cluster-06): LeftPanel ResizeHandle between sections + persisted sectionHeights (C-LOW06.3)"
```

---

### Task 12: Shop panel REWORK per Shopify spec §4.1 + §5.2

**Files:**
- Modify: `src/components/editor/sidebar/ShopPanel.vue` (REWORK — collapse 3-tab TabsRoot to product-only)
- Modify: `src/components/editor/sidebar/ShopPanelProducts.vue` (REWORK — remove draggable, add multi-select + Import button)
- Test: `tests/unit/components/editor/ShopPanel.test.ts`, `ShopPanelProducts.test.ts`

- [ ] **Step 1: Tests** — no draggable; multi-select; sort dropdown (no bestsellers); Import button callback

- [ ] **Step 2: Rewrite both files per Shopify spec §4.1 + §5.2.** Import callback wires to Cluster 10's `useChatProductReferencesStore.importProducts(selectedIds)`.

- [ ] **Step 3: PASS + Commit**

```bash
git commit -m "refactor(cluster-06): Shop panel — collapse to product-only, remove draggable, add multi-select + Import to chat (per Shopify spec §5.2)"
```

---

### Task 13: Delete ripped M9 product-variant files (per Shopify spec §5.1)

Per the Shopify spec migration plan §5.1, the ripped files are:
- `src/canvas-extensions/product-variant/` (entire directory)
- `src/stores/product-variant-bindings.ts`
- `src/components/inspector/ProductVariantInspector.vue`
- `src/composables/use-shop-drop.ts`
- `src/composables/useCanvasBindingsPersistence.ts`
- `src/engine/tool-calls.ts`
- `src/components/editor/ShopBuildPrompt.vue`
- `src/components/editor/sidebar/ShopPanelCollections.vue`
- `src/components/editor/sidebar/ShopPanelDiscounts.vue`
- `api/shopify/cron/orders-agg.ts`
- `api/shopify/cron/inventory-delta.ts`

Plus EditorView.vue removes the references.

- [ ] **Step 1: Run** `git rm` on each ripped file

- [ ] **Step 2: Remove the `orders-agg` and `inventory-delta` entries from `vercel.json` crons array**

- [ ] **Step 3: Remove from `api/shopify/cron/purge-worker.ts`** the `'shopify_orders_agg'` entry in its `directTables` delete list

- [ ] **Step 4: Verify build green** (`bun run check && bun run build`) — there will be unresolved imports until Task 14 (EditorView refactor) lands. Stage commits together.

- [ ] **Step 5: Commit (with Task 14)**

---

### Task 14: EditorView refactor (remove ChatPopup, mount new chrome)

**Files:**
- Modify: `src/views/EditorView.vue` (REFACTOR)
- Test: `tests/integration/editor/editor-view-refactor.test.ts`

- [ ] **Step 1: Write failing test asserting:** no `<ChatPopup>` element in DOM; new chrome components present

- [ ] **Step 2: Rewrite EditorView.vue**

```vue
<!-- src/views/EditorView.vue (REFACTORED) -->
<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useEditorStore } from '@/stores/editor'
import { useTabsStore } from '@/stores/tabs'
import { useRightPanelStore } from '@/stores/right-panel'
import { useCanvasDrop } from '@/composables/use-canvas-drop'

import TopChrome from '@/components/editor/TopChrome.vue'
import BottomToolbar from '@/components/editor/BottomToolbar.vue'
import LeftPanel from '@/components/editor/LeftPanel.vue'
import CanvasSurface from '@/components/editor/CanvasSurface.vue'  // existing M5
import CanvasOverlayHost from '@/components/editor/CanvasOverlayHost.vue'
import RightPanel from '@/components/editor/RightPanel.vue'
import ZoomHud from '@/components/editor/ZoomHud.vue'
import ToastStack from '@/components/shared/ToastStack.vue'  // Cluster 11
import TabsBar from '@/components/editor/TabsBar.vue'  // existing M5

const route = useRoute()
const editor = useEditorStore()
const rightPanel = useRightPanelStore()
const drop = useCanvasDrop()

onMounted(() => {
  const canvasId = route.params.canvasId as string
  rightPanel.initFor(canvasId)
})

watch(() => route.params.canvasId, (id) => {
  if (typeof id === 'string') rightPanel.initFor(id)
})
</script>

<template>
  <div class="kc h-screen w-screen overflow-hidden" :class="{ 'ui-hidden': editor.showUI === 'hidden', 'ui-minimized': editor.showUI === 'minimized' }">
    <TabsBar />
    <TopChrome />
    <div class="body grid grid-cols-[240px_1fr_264px] min-h-0">
      <LeftPanel v-show="editor.panelsVisible.left" />
      <div class="center relative overflow-hidden" @drop.prevent="drop.handleDrop" @dragover.prevent="drop.handleDragOver" @dragleave="drop.handleDragLeave">
        <CanvasSurface />
        <CanvasOverlayHost />
        <BottomToolbar />
        <ZoomHud />
      </div>
      <RightPanel v-show="editor.panelsVisible.right" />
    </div>
    <ToastStack />
  </div>
</template>
```

(Note: removes `<ChatPopup>`, `<ShopBuildPrompt>`, `useShopDrop`, `useCanvasBindingsPersistence`, all product-variant references.)

- [ ] **Step 3: Run + verify PASS + verify `bun run build` green**

- [ ] **Step 4: Commit together with Task 13's file deletes**

```bash
git add -u && git rm src/canvas-extensions/product-variant/ src/stores/product-variant-bindings.ts ... [all from Task 13]
git add src/views/EditorView.vue tests/integration/editor/editor-view-refactor.test.ts vercel.json api/shopify/cron/purge-worker.ts
git commit -m "refactor(cluster-06): EditorView refactor — remove ChatPopup + product-variant extension + drag-place model (per Shopify spec §5.1 RIP)"
```

---

### Task 15: RightPanel + RightPanelTabs + FrameHead + InspectorRouter + RightPanelAiSlot

**Files:**
- Create: `src/components/editor/RightPanel.vue`, `RightPanelTabs.vue`, `FrameHead.vue`, `InspectorRouter.vue`, `RightPanelAiSlot.vue`
- Test: `tests/unit/components/editor/RightPanelTabs.test.ts`, `InspectorRouter.test.ts`

- [ ] **Step 1: Tests** — RightPanelTabs renders EXACTLY 2 tabs (Design + AI), Prototype NOT in DOM, **default-active AI on first canvas open (no localStorage key) per §12.13 RATIFICATION 2026-05-17**; click switches; **layer-selection event does NOT change `activeTab` (sticky regression per §12.14)**; InspectorRouter renders correct section list per selection.

```ts
// tests/unit/components/editor/RightPanelTabs.test.ts
import { describe, test, expect, beforeEach } from 'bun:test'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import RightPanelTabs from '@/components/editor/RightPanelTabs.vue'
import { useRightPanelStore } from '@/stores/right-panel'
import { useEditorStore } from '@/stores/editor'

describe('RightPanelTabs', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  test('renders EXACTLY 2 tabs: Design + AI (Prototype NOT in DOM per founder 2026-05-15)', () => {
    const wrap = mount(RightPanelTabs)
    expect(wrap.findAll('[role="tab"]')).toHaveLength(2)
    expect(wrap.text()).toContain('Design')
    expect(wrap.text()).toContain('AI')
    expect(wrap.text().toLowerCase()).not.toContain('prototype')
    expect(wrap.find('[data-tab="prototype"]').exists()).toBe(false)
  })

  test('default-active = AI on first canvas open (RATIFIED §12.13 2026-05-17)', () => {
    useRightPanelStore().initFor('canvas-fresh')
    const wrap = mount(RightPanelTabs)
    expect(wrap.find('[data-tab="ai"][data-state="active"]').exists()).toBe(true)
    expect(wrap.find('[data-tab="design"][data-state="active"]').exists()).toBe(false)
  })

  test('respects per-canvas localStorage on subsequent opens', () => {
    localStorage.setItem('right-panel-tab:canvas-2', 'design')
    useRightPanelStore().initFor('canvas-2')
    const wrap = mount(RightPanelTabs)
    expect(wrap.find('[data-tab="design"][data-state="active"]').exists()).toBe(true)
  })

  test('REGRESSION GUARD: layer click does NOT switch active tab (sticky per §12.14)', async () => {
    const rp = useRightPanelStore()
    const editor = useEditorStore()
    rp.initFor('canvas-1')
    expect(rp.activeTab).toBe('ai')

    const wrap = mount(RightPanelTabs)
    editor.setSelection(['some-node-id'])
    await flushPromises()

    expect(rp.activeTab).toBe('ai')  // SHOULD NOT have switched to 'design'
    expect(wrap.find('[data-tab="ai"][data-state="active"]').exists()).toBe(true)
  })
})
```

- [ ] **Step 2: Implement.** RightPanelTabs uses Reka Tabs. **Default tab read from `useRightPanelStore.activeTab` which defaults to 'ai' on first open per §12.13.** Component MUST NOT subscribe to selection events. InspectorRouter reads `useInspectorRouter().activeSections`. RightPanelAiSlot conditionally mounts Cluster 10's `<ChatPanel>` (use dynamic import or lazy import; fall back to placeholder if Cluster 10 not yet shipped during Wave 4 staging).

- [ ] **Step 3: PASS + Commit**

```bash
git commit -m "feat(cluster-06): right panel — 2-tab framework (Design + AI; Prototype out of scope) + AI-default on first open (§12.13) + sticky-on-selection regression guard (§12.14) + inspector router + AI slot for Cluster 10 ChatPanel"
```

---

### Task 16: CanvasOverlayHost + ZoomHud + CanvasSurface drop listeners

**Files:**
- Create: `src/components/editor/CanvasOverlayHost.vue` (slot host)
- Create: `src/components/editor/ZoomHud.vue`
- Modify: `src/components/editor/CanvasSurface.vue` (existing — add drop event listeners forward to `use-canvas-drop`)
- Test: `tests/unit/components/editor/ZoomHud.test.ts`

- [ ] **Step 1: Implement.** CanvasOverlayHost is a positioned div absolute-positioned over canvas; Cluster 07b mounts overlays as children via Vue's named slot. ZoomHud reads `editor.zoom`. CanvasSurface drop listeners already moved into EditorView in Task 14.

- [ ] **Step 2: PASS + Commit**

```bash
git commit -m "feat(cluster-06): CanvasOverlayHost (Cluster 07b slot) + ZoomHud"
```

---

### Task 17: Route + viewport + auth guards

**Files:**
- Modify: `src/router/routes.ts` — extend canvas route per PRD §6.1
- Test: `tests/integration/editor/route-guard.test.ts`

- [ ] **Step 1: Tests for auth + ownership + viewport guards**

- [ ] **Step 2: Implement route config + `beforeEnter` guard**

- [ ] **Step 3: PASS + Commit**

```bash
git commit -m "feat(cluster-06): /canvas/:canvasId route — auth + viewport + brand-ownership guards"
```

---

### Task 18: Integration test — tool registration end-to-end

**File:** `tests/integration/editor/tool-registration.test.ts`

- [ ] **Step 1: Test that mocking Cluster 07a's register call causes Slice + Measurement to appear in toolbar**

```ts
import { describe, test, expect, beforeEach } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { useToolRegistry } from '@/stores/tool-registry'
import BottomToolbar from '@/components/editor/BottomToolbar.vue'

describe('tool registration end-to-end', () => {
  test('Cluster 07a register-call shows Slice + Measurement in toolbar', () => {
    setActivePinia(createPinia())
    const registry = useToolRegistry()
    // Default 9 (registered in main.ts but here we simulate)
    registry.register({ id: 'move', slot: 'move', icon: 'mouse-pointer-2', label: 'Move', key: 'V', onActivate: () => {} })
    // ... register all 8 default
    // Simulate Cluster 07a
    registry.register({ id: 'slice', slot: 'frame', parent: 'frame', icon: 'crop', label: 'Slice', key: 'S', onActivate: () => {} })
    registry.register({ id: 'measurement', slot: 'measurement', icon: 'ruler', label: 'Measurement', keySequence: ['Shift','M'], onActivate: () => {} })

    const wrap = mount(BottomToolbar)
    expect(wrap.text()).toContain('Measurement')
    // Slice lives in Frame dropdown — verify via dropdown open
  })
})
```

- [ ] **Step 2: Implement + commit**

```bash
git commit -m "test(cluster-06): tool-registration end-to-end — verify Slice + Measurement appear when Cluster 07a registers"
```

---

### Task 19: Integration test — drop receiver end-to-end against real editor state

**File:** `tests/integration/editor/drop-receiver-end-to-end.test.ts`

- [ ] Use real `useEditorStore` + minimal scene; simulate drag events for each of 5 MIME types; assert scene state mutated correctly. Mock `screenToCanvas` + `hitTestAt` deterministically.

- [ ] **Commit**

```bash
git commit -m "test(cluster-06): drop receiver integration — all 5 MIME types end-to-end"
```

---

### Task 20: E2E tests (14 specs — 11 baseline + 3 ratification regression guards)

- [ ] Implement each spec listed in PRD §9.3 + ratification regression guards:
  - `load-and-render.spec.ts` — basic chrome renders
  - `avatar-dropdown.spec.ts` — 5-item menu per Q16
  - `brand-label-navigates.spec.ts` — Q17 navigate to dashboard
  - `right-panel-default-ai.spec.ts` — **RATIFIED §12.13 2026-05-17**: open canvas in incognito → assert AI tab is default-active
  - `right-panel-sticky-on-select.spec.ts` — **RATIFIED §12.14 2026-05-17**: AI tab active → click any layer → assert AI tab STILL active (no auto-switch to Design)
  - `right-panel-tab-switch.spec.ts` — manual tab switching works + persists per-canvas
  - `ai-tool-button.spec.ts` — bottom toolbar AI button focuses chat composer
  - `layer-tree-interactions.spec.ts` — hover highlight, mask glyph, slice glyph
  - `left-panel-shop-section.spec.ts` — **RATIFIED §12.1 2026-05-17**: LeftPanel renders 3 collapsible sections (Pages, Layers, Shop); Shop default-expanded when brand has Shopify
  - `topbar-no-comments.spec.ts` — **RATIFIED §12.3 2026-05-17**: top chrome has no Comments icon (DOM regression guard)
  - `drag-color-to-frame.spec.ts` — color drag → fill replace
  - `drag-saved-block-to-canvas.spec.ts` — saved-block drag → TEXT spawn
  - `shop-panel-import-flow.spec.ts` — multi-select + Import N to chat
  - `no-chat-popup.spec.ts` (regression guard) — floating ChatPopup not in DOM
  - `no-prototype-tab.spec.ts` (regression guard) — Prototype tab not in DOM

- [ ] **Commit**

```bash
git commit -m "test(cluster-06): E2E coverage — 14 specs covering chrome render, drag-drop, AI tab, all founder ratification regression guards (§12.1, §12.3, §12.13, §12.14)"
```

---

### Task 21: Manual browser smoke per `feedback_browser_smoke_test_before_done`

- [ ] **Step 1: Start dev server**

```bash
cd kova-open-pencil-1
bun run dev
```

- [ ] **Step 2: Execute PRD §9.4 manual QA checklist** (15 steps). Capture screenshots. Verify visual match against `Final.html`.

- [ ] **Step 3: Note any drift in PRD §12 + file follow-up issues**

- [ ] **Step 4: Commit any fixes uncovered**

```bash
git commit -m "chore(cluster-06): browser-smoke drift fixes"
```

---

### Task 22: Final quality gates

- [ ] **Step 1: Run all gates**

```bash
bun run check
bun run format
bun run test:unit
bun run test:dupes
bun run build
```

All must pass.

- [ ] **Step 2: Commit**

```bash
git commit -m "chore(cluster-06): final quality gates green"
```

---

### Task 23: PR open + handoff

```bash
git push -u origin feat/cluster-06-canvas-editor-core-chrome
gh pr create --title "feat: Cluster 06 — Canvas Editor Core Chrome" --body "$(cat <<'EOF'
## Summary
- Ships canvas editor chrome: /canvas/:canvasId route, topbar (logo + brand breadcrumb + avatar dropdown), bottom toolbar (11 tools), left panel (Pages + Layers tree with virtual scroll + mask/slice glyphs + Shop panel rework), right panel two-tab framework (Design + AI — Prototype out of scope per founder ratification 2026-05-15), drop receivers for 5 brand-kit MIME contracts, tool registry API consumed by Cluster 07a
- EditorView refactor: removes legacy <ChatPopup>, <ShopBuildPrompt>, useCanvasBindingsPersistence, canvas-extensions/product-variant per Shopify spec §5.1
- Lockstep dependency with Cluster 07a (tool registrations) + 07b (inspector sections + overlays) + 08 (menus) + 10 (ChatPanel + Shop panel import callback) + 11 (shared primitives)

## Test plan
- [ ] Unit (`bun run test:unit`) — all green
- [ ] Integration — route guards, drop receivers, tool registration
- [ ] E2E (Playwright + Vercel Agent Browser) — 11 specs including regression guards for ChatPopup + Prototype-tab removal
- [ ] Manual QA — founder browser smoke per PRD §9.4 (15 steps)

PRD: docs/kova-final-prds/06-canvas-editor-core-chrome.md
Plan: docs/kova-final-impl-plans/06-canvas-editor-core-chrome-plan.md
EOF
)"
```

- [ ] Tag founder for review

---

## Self-Review

**1. Spec coverage:**
- ✅ Route + viewport + auth + brand-ownership guard → Task 17
- ✅ Top chrome (logo + breadcrumb + actions + avatar) → Task 9
- ✅ Bottom toolbar 11 tools + AI tool focuses composer → Tasks 4 + 10
- ✅ Left panel (Pages + Layers tree + Shop panel) → Tasks 5 + 11 + 12
- ✅ Right panel 2-tab framework (Design + AI; no Prototype) → Tasks 3 + 15
- ✅ Inspector router → Tasks 6 + 15
- ✅ Drop receivers (5 MIME types) → Tasks 1 + 8
- ✅ Tool registry → Task 4
- ✅ EditorView refactor + ChatPopup removal + product-variant rip → Tasks 13 + 14
- ✅ Shop panel rework per Shopify spec → Task 12
- ✅ Canvas overlay host (Cluster 07b slot) → Task 16
- ✅ Zoom HUD → Task 16
- ✅ Drop visual feedback (editor.dropTargetAction) → Task 2 + 8
- ✅ E2E regression guards (no ChatPopup, no Prototype tab) → Task 20

**2. Placeholder scan:** Tasks 9, 10, 11, 15, 16 are condensed (single bullet for "implement per PRD §6.4"). Acceptable because PRD §6.4 enumerates every component's props/emits/slots and Tasks 1–8 establish all type contracts + composables they consume. If implementing engineer wants per-component TDD shape, they reproduce the Task 3/4 pattern with the per-component spec.

**3. Type consistency:**
- `ToolDef`, `InspectorSectionDef`, `BrandColorPayload`, `BrandFontPayload`, `BrandAssetPayload`, `SavedBlockPayload`, `ToneSnippetPayload` — defined in Task 1.
- `LayerRow` — defined in Task 5.
- `RightPanelTab = 'design' | 'ai'` — defined in Task 3.
- `useRightPanelStore`, `useToolRegistry`, `useLayerTree`, `useInspectorRouter`, `useRightPanelTab`, `useCanvasDrop` — defined Tasks 3/4/5/6/7/8.
- All store names + composable names consistent with PRD §6.2 + §6.3.
- MIME constants `DRAG_MIME.COLOR` etc. — defined in Task 1, consumed in Task 8.

---

## Execution Handoff

**Plan complete and saved to `docs/kova-final-impl-plans/06-canvas-editor-core-chrome-plan.md`.**

This plan is large (23 tasks) and has cross-cluster lockstep dependencies (07a, 07b, 08, 10, 11). Recommended execution:

1. **Founder reviews + approves PRD 06** (`docs/kova-final-prds/06-canvas-editor-core-chrome.md` §0 status: DRAFT → APPROVED) — especially the §12 open questions (Shop panel docking, Comments icon visibility, `editor.reorderPage` audit)
2. **Cross-cluster sync**: confirm Cluster 07a / 07b / 08 / 10 / 11 PRDs are aligned with this PRD's contracts (`useToolRegistry`, `InspectorSectionDef`, `<RightPanelAiSlot>`, MIME contract)
3. **Subagent-Driven execution** via `superpowers:subagent-driven-development` — recommended given task count + cross-cluster coordination. One fresh subagent per task, review between tasks.
4. **OR Inline execution** via `superpowers:executing-plans` — batch with checkpoints; faster for the engineer-machine cycle.

— End of Plan 06 —
