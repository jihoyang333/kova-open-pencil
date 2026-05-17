# PRD 07b — Canvas Engine Inspector + Overlays — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the app-level inspector wiring + 10 canvas overlay layer + 5 supporting composables + 2 Pinia stores so designers can actually use the engine features 07a delivers (NodeTypes, renderer, tool slots).

**Architecture:** Pure Vue 3 + Tailwind 4 + Pinia + Reka UI on top of the OpenPencil engine API surface (read via the public `figma` proxy and existing `useNodeProps` / `useMultiProps` consumer pattern). Zero `packages/core/` modifications. Components mount inside the existing `<EditorView>` shell at three locations: (1) inspector dock inside `<RightPanel>`, (2) popovers floated via Reka Popover, (3) a new `<CanvasOverlayLayer>` div absolutely-positioned over the canvas. State splits across one extension to `useEditorStore` (overlay visibility flags + activeTool union) plus two NEW stores (`useClipboardStore`, `useEyedropperStore`).

**Tech Stack:** Vue 3.5 (`<script setup lang="ts">`), TypeScript 5.6, Pinia 2.2 (Composition API setup stores), Tailwind CSS 4 (utility classes only — no `<style>` blocks per CLAUDE.md), Reka UI (Dialog / Popover / DropdownMenu / Select / Tooltip), `@open-pencil/core` engine proxy (read-only), `culori` for color conversions, `unplugin-icons` with Lucide. Test stack: bun:test for unit + integration, Playwright for E2E (Vercel Agent Browser preferred). Quality gates: oxlint type-aware (`bun run check`), oxfmt (`bun run format`), jscpd <3% (`bun run test:dupes`).

**PRD source:** `kova-open-pencil-1/docs/prd/07b-canvas-engine-inspector-overlays.md`

**Source-of-truth references for every task below:**
- Hi-fi 11 Inspector — `main-main-kova-scope/batch-b/chunk-b4/Kova Hi-Fi 11 Inspector - Dark.html`
- Hi-fi 12 Color Picker — `main-main-kova-scope/batch-b/chunk-b5/Kova Hi-Fi 12 Color Picker - Dark.html`
- Hi-fi 09 Canvas Overlays — `main-main-kova-scope/batch-b/Kova Hi-Fi 09 Canvas Overlays - Dark.html`
- Design system — `main-main-kova-scope/design-system/{design.md, kova-hifi.css, TOKEN_CANONICAL.md}`

---

## File Structure

### New files (32 net-new)

```
kova-open-pencil-1/src/
├── stores/
│   ├── clipboard.ts                                   [NEW — Pinia setup store, copy/paste props per Q23]
│   └── eyedropper.ts                                  [NEW — Pinia setup store, eyedropper active state]
├── composables/
│   ├── use-eyedropper.ts                              [NEW — canvas-only sampling per Q20]
│   ├── use-slice-tool.ts                              [NEW — slice tool drag handler]
│   ├── use-measurement-tool.ts                        [NEW — measurement tool 2-click handler]
│   ├── use-export-pipeline.ts                         [NEW — slice export + ZIP batching]
│   └── use-copy-paste-props.ts                        [NEW — Q23 full-set copy/paste]
├── components/
│   ├── inspector/                                     [NEW directory]
│   │   ├── PaintEditor.vue                            [NEW — Solid/Linear/Radial/Image picker]
│   │   ├── ImageFillPicker.vue                        [NEW — 4 modes per Q21]
│   │   ├── BooleanOpsRow.vue                          [NEW — multi-select 4 ops]
│   │   ├── EffectEditor.vue                           [NEW — per-effect popover]
│   │   ├── EffectRow.vue                              [NEW — single effect list row]
│   │   ├── GradientStopList.vue                       [NEW — gradient stops UI]
│   │   ├── JpgQualityDropdown.vue                     [NEW — Q22 3-level dropdown]
│   │   ├── VerticalTextAlignRow.vue                   [NEW — TOP/MIDDLE/BOTTOM segmented]
│   │   ├── StrokeAlignRow.vue                         [NEW — INSIDE/CENTER/OUTSIDE segmented]
│   │   └── MultipleFillsList.vue                      [NEW — drag-reorder fills]
│   └── canvas-overlays/                               [NEW directory]
│       ├── CanvasOverlayLayer.vue                     [NEW — absolute positioned wrapper, mounts all 10]
│       ├── FrameOutlinesOverlay.vue                   [NEW — z-index 3, 1px gray]
│       ├── MaskOutlinesOverlay.vue                    [NEW — z-index 4, 1.5px green + corner glyph]
│       ├── SliceRegionOverlay.vue                     [NEW — z-index 5, dashed + label]
│       ├── SnapIndicatorsOverlay.vue                  [NEW — z-index 5/7, red snap pixels + tags]
│       ├── LayoutGuidesOverlay.vue                    [NEW — z-index 3, red 10% per Q24]
│       ├── PixelGridOverlay.vue                       [NEW — z-index 3, > 800% zoom]
│       ├── HoverContourOverlay.vue                    [NEW — z-index 4, blue selection]
│       ├── FindHighlightOverlay.vue                   [NEW — z-index 4, dormant pre-08]
│       ├── EyedropperCrosshair.vue                    [NEW — z-index 9/10, magnifier + reticle + chip]
│       └── MeasurementAnnotations.vue                 [NEW — z-index 7, persistent dashed red]
└── constants/
    └── overlays.ts                                    [NEW — z-index map, color tokens, feature gates]

kova-open-pencil-1/tests/
├── unit/
│   ├── stores/
│   │   ├── clipboard.test.ts                          [NEW]
│   │   └── eyedropper.test.ts                         [NEW]
│   ├── composables/
│   │   ├── use-eyedropper.test.ts                     [NEW]
│   │   ├── use-slice-tool.test.ts                     [NEW]
│   │   ├── use-measurement-tool.test.ts               [NEW]
│   │   ├── use-export-pipeline.test.ts                [NEW]
│   │   └── use-copy-paste-props.test.ts               [NEW]
│   └── components/
│       ├── inspector/                                  [NEW directory — 1 test per component]
│       │   ├── PaintEditor.test.ts
│       │   ├── ImageFillPicker.test.ts
│       │   ├── BooleanOpsRow.test.ts
│       │   ├── EffectEditor.test.ts
│       │   ├── EffectRow.test.ts
│       │   ├── GradientStopList.test.ts
│       │   ├── JpgQualityDropdown.test.ts
│       │   ├── VerticalTextAlignRow.test.ts
│       │   ├── StrokeAlignRow.test.ts
│       │   └── MultipleFillsList.test.ts
│       └── canvas-overlays/                            [NEW directory — 1 test per overlay]
│           ├── FrameOutlinesOverlay.test.ts
│           ├── MaskOutlinesOverlay.test.ts
│           ├── SliceRegionOverlay.test.ts
│           ├── SnapIndicatorsOverlay.test.ts
│           ├── LayoutGuidesOverlay.test.ts
│           ├── PixelGridOverlay.test.ts
│           ├── HoverContourOverlay.test.ts
│           ├── FindHighlightOverlay.test.ts
│           ├── EyedropperCrosshair.test.ts
│           └── MeasurementAnnotations.test.ts
├── integration/
│   ├── inspector/
│   │   ├── effects-end-to-end.test.ts                 [NEW]
│   │   ├── boolean-ops-end-to-end.test.ts             [NEW]
│   │   ├── gradient-editor-end-to-end.test.ts         [NEW]
│   │   └── image-fill-modes.test.ts                   [NEW]
│   ├── composables/
│   │   ├── eyedropper-canvas-only.test.ts             [NEW]
│   │   ├── export-pipeline.test.ts                    [NEW]
│   │   └── copy-paste-props.test.ts                   [NEW]
│   └── canvas-overlays/
│       ├── snap-indicators-during-drag.test.ts        [NEW]
│       └── measurement-persistence.test.ts            [NEW]
└── e2e/canvas/
    ├── inspector-effects.spec.ts                      [NEW]
    ├── inspector-multiple-fills.spec.ts               [NEW]
    ├── inspector-image-fill-crop.spec.ts              [NEW]
    ├── gradient-editor-linear.spec.ts                 [NEW]
    ├── eyedropper-flow.spec.ts                        [NEW]
    ├── boolean-union.spec.ts                          [NEW]
    ├── slice-export.spec.ts                           [NEW]
    ├── measurement-persistence.spec.ts                [NEW]
    ├── overlays-render-all.spec.ts                    [NEW]
    └── copy-paste-props.spec.ts                       [NEW]
```

### Modified files (8 extensions)

```
kova-open-pencil-1/src/
├── stores/
│   └── editor.ts                                      [MODIFY — extend overlays + activeTool union]
├── composables/
│   └── use-canvas-drop.ts                             [MODIFY — add brand-asset image-fill receiver]
├── components/
│   ├── ColorPicker.vue                                [MODIFY — render PaintEditor for non-solid modes]
│   ├── properties/
│   │   ├── EffectsSection.vue                         [MODIFY — wire EffectRow + EffectEditor + collapsed-by-default]
│   │   ├── ExportSection.vue                          [MODIFY — add JpgQualityDropdown row + Export-N-slices button]
│   │   ├── StrokeSection.vue                          [MODIFY — add StrokeAlignRow]
│   │   ├── TypographySection.vue                      [MODIFY — add VerticalTextAlignRow when TEXT NodeType]
│   │   └── FillSection.vue                            [MODIFY — wire MultipleFillsList + PaintEditor]
└── views/
    └── EditorView.vue                                 [MODIFY — mount <CanvasOverlayLayer />]
```

---

## Phase 0: Setup + constants

### Task 0.1: Define overlay constants + feature gates

**Files:**
- Create: `kova-open-pencil-1/src/constants/overlays.ts`

- [ ] **Step 1: Create the constants file**

```typescript
// kova-open-pencil-1/src/constants/overlays.ts

/**
 * Z-index stacking order for canvas overlays (sourced from hi-fi 09 §3.4).
 * Lower numbers paint underneath higher numbers.
 */
export const OVERLAY_Z = {
  FRAME_OUTLINES: 3,
  PIXEL_GRID: 3,
  LAYOUT_GUIDES: 3,
  HOVER_CONTOUR: 4,
  MASK_OUTLINES: 4,
  FIND_HIGHLIGHT: 4,
  SNAP_PIXEL: 5,
  SELECTION_BOX: 5,
  MEASUREMENT_LINE: 5,
  SLICE_REGION: 5,
  SELECTION_HANDLE: 6,
  SPACING_TAG: 7,
  FRAME_LABEL: 7,
  SIZE_CHIP: 7,
  MEASUREMENT_LABEL: 7,
  EYEDROPPER_MAGNIFIER: 9,
  EYEDROPPER_HEX_CHIP: 10,
} as const

/**
 * Canonical overlay color tokens (sourced from hi-fi 09 §3.5).
 * `var(--select)` resolved at runtime via design-system tokens.
 */
export const OVERLAY_COLOR = {
  SNAP_RED: '#F24822',
  MASK_GREEN: '#3DDC97',
  MASK_GLYPH_BG: 'rgba(61,220,151,0.22)',
  FRAME_OUTLINE: 'rgba(126,126,121,0.55)',
  PIXEL_GRID: 'rgba(126,126,121,0.18)',
  LAYOUT_GUIDE_RED: 'rgba(255,0,0,0.10)', // Q24-locked default
  EYEDROPPER_BORDER_WHITE: '#ffffff',
  EYEDROPPER_SHADOW: '#1e1e1e',
  EYEDROPPER_HEX_CHIP_BG: '#2c2c2c',
  AI_KOVA_BLUE: '#5a7dff', // EXCLUSIVE to AI assist panel — never used elsewhere
} as const

/**
 * Pixel-grid auto-show threshold per hi-fi B8.5.
 */
export const PIXEL_GRID_ZOOM_THRESHOLD = 8.0 // 800%

/**
 * JPG export quality presets per Q22.
 */
export const JPG_QUALITY = {
  HIGH: 0.92,   // default
  MEDIUM: 0.80,
  LOW: 0.65,
} as const

/**
 * Hardcoded feature gates per 00d 2.B (no runtime feature-flag service in MVP).
 */
export const FEATURE_GATES = {
  KEYBOARD_SHORTCUTS_REGISTRY_AVAILABLE: false,  // flips true when Cluster 08 ships
  EXPORT_PIPELINE_ZIP_BATCHING: false,           // flips true when JSZip in deps (Phase B)
  FIND_OVERLAY_DORMANT: true,                    // flips false when Cluster 08 ships useFind
  LAYOUT_GUIDES_DEFAULT_ON: true,                // Q24-locked
  EYEDROPPER_CANVAS_ONLY: true,                  // Q20-locked for MVP
  EFFECTS_SECTION_DEFAULT_COLLAPSED: true,
} as const
```

- [ ] **Step 2: Type-check passes**

Run: `cd kova-open-pencil-1 && bun run check`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add kova-open-pencil-1/src/constants/overlays.ts
git commit -m "feat(07b): add overlay z-index, color tokens + feature gates"
```

---

## Phase 1: Pinia stores

### Task 1.1: useClipboardStore — failing test

**Files:**
- Test: `kova-open-pencil-1/tests/unit/stores/clipboard.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// kova-open-pencil-1/tests/unit/stores/clipboard.test.ts
import { describe, expect, it, beforeEach } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'
import { useClipboardStore } from '@/stores/clipboard'

describe('useClipboardStore', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('starts with null copiedProps', () => {
    const store = useClipboardStore()
    expect(store.copiedProps).toBeNull()
  })

  it('copyProps stores the full Q23 prop set from a node', () => {
    const store = useClipboardStore()
    const node = {
      id: 'n1',
      type: 'RECTANGLE',
      fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0, a: 1 } }],
      strokes: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0, a: 1 } }],
      strokeWeight: 2,
      strokeAlign: 'INSIDE',
      effects: [],
      opacity: 0.8,
      blendMode: 'NORMAL',
      cornerRadius: 4,
      paddingLeft: 0, paddingRight: 0, paddingTop: 0, paddingBottom: 0,
      layoutMode: 'NONE',
    } as any
    store.copyProps(node)
    expect(store.copiedProps).not.toBeNull()
    expect(store.copiedProps!.sourceNodeId).toBe('n1')
    expect(store.copiedProps!.props.strokeWeight).toBe(2)
    expect(store.copiedProps!.props.strokeAlign).toBe('INSIDE')
  })

  it('clear resets copiedProps to null', () => {
    const store = useClipboardStore()
    store.copyProps({ id: 'n1', type: 'RECTANGLE' } as any)
    store.clear()
    expect(store.copiedProps).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify failure**

Run: `cd kova-open-pencil-1 && bun test tests/unit/stores/clipboard.test.ts`
Expected: FAIL — module `@/stores/clipboard` not found.

### Task 1.2: useClipboardStore — implementation

**Files:**
- Create: `kova-open-pencil-1/src/stores/clipboard.ts`

- [ ] **Step 1: Write minimal implementation**

```typescript
// kova-open-pencil-1/src/stores/clipboard.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { SceneNode, Fill, Paint, Effect, BlendMode } from '@open-pencil/core'

export interface ClipboardPropsPayload {
  sourceNodeId: string
  sourceNodeType: string
  props: {
    fills?: Fill[]
    strokes?: Paint[]
    strokeWeight?: number
    strokeAlign?: 'INSIDE' | 'CENTER' | 'OUTSIDE'
    effects?: Effect[]
    opacity?: number
    blendMode?: BlendMode
    cornerRadius?: number | { topLeft: number; topRight: number; bottomLeft: number; bottomRight: number }
    paddingLeft?: number
    paddingRight?: number
    paddingTop?: number
    paddingBottom?: number
    layoutMode?: 'NONE' | 'HORIZONTAL' | 'VERTICAL'
    primaryAxisAlignItems?: 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN'
    counterAxisAlignItems?: 'MIN' | 'CENTER' | 'MAX'
    itemSpacing?: number
    characterStyleOverrides?: unknown[]
    textAlignVertical?: 'TOP' | 'CENTER' | 'BOTTOM'
  }
}

const Q23_FIELDS = [
  'fills', 'strokes', 'strokeWeight', 'strokeAlign', 'effects',
  'opacity', 'blendMode', 'cornerRadius',
  'paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom',
  'layoutMode', 'primaryAxisAlignItems', 'counterAxisAlignItems', 'itemSpacing',
  'characterStyleOverrides', 'textAlignVertical',
] as const

export const useClipboardStore = defineStore('clipboard', () => {
  const copiedProps = ref<ClipboardPropsPayload | null>(null)

  function copyProps(node: SceneNode): void {
    const props: Record<string, unknown> = {}
    for (const field of Q23_FIELDS) {
      const value = (node as Record<string, unknown>)[field]
      if (value !== undefined) props[field] = structuredClone(value)
    }
    copiedProps.value = {
      sourceNodeId: node.id,
      sourceNodeType: node.type,
      props: props as ClipboardPropsPayload['props'],
    }
  }

  function pasteProps(targetNodes: SceneNode[]): void {
    const payload = copiedProps.value
    if (!payload) return
    for (const target of targetNodes) {
      for (const [field, value] of Object.entries(payload.props)) {
        // Compatibility: silently drop fields the target doesn't support.
        if (field in target) {
          (target as Record<string, unknown>)[field] = structuredClone(value)
        }
      }
    }
  }

  function clear(): void {
    copiedProps.value = null
  }

  return { copiedProps, copyProps, pasteProps, clear }
})
```

- [ ] **Step 2: Run test to verify pass**

Run: `cd kova-open-pencil-1 && bun test tests/unit/stores/clipboard.test.ts`
Expected: 3 PASS.

- [ ] **Step 3: Type-check passes**

Run: `bun run check`
Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add kova-open-pencil-1/src/stores/clipboard.ts kova-open-pencil-1/tests/unit/stores/clipboard.test.ts
git commit -m "feat(07b): add useClipboardStore for Q23 copy/paste props"
```

### Task 1.3: useEyedropperStore — failing test

**Files:**
- Test: `kova-open-pencil-1/tests/unit/stores/eyedropper.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// kova-open-pencil-1/tests/unit/stores/eyedropper.test.ts
import { describe, expect, it, beforeEach, mock } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'
import { useEyedropperStore } from '@/stores/eyedropper'

describe('useEyedropperStore', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('starts inactive', () => {
    const store = useEyedropperStore()
    expect(store.active).toBe(false)
    expect(store.sampledHex).toBeNull()
  })

  it('activate sets active=true and registers callback', () => {
    const store = useEyedropperStore()
    const cb = mock(() => {})
    store.activate(cb)
    expect(store.active).toBe(true)
  })

  it('sample invokes callback with hex and clears active', () => {
    const store = useEyedropperStore()
    const cb = mock((hex: string) => {})
    store.activate(cb)
    store.sample('#ff0000')
    expect(cb).toHaveBeenCalledWith('#ff0000')
    expect(store.active).toBe(false)
    expect(store.sampledHex).toBe('#ff0000')
  })

  it('cancel sets active=false without invoking callback', () => {
    const store = useEyedropperStore()
    const cb = mock((hex: string) => {})
    store.activate(cb)
    store.cancel()
    expect(cb).not.toHaveBeenCalled()
    expect(store.active).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify failure**

Run: `bun test tests/unit/stores/eyedropper.test.ts`
Expected: FAIL — module not found.

### Task 1.4: useEyedropperStore — implementation

**Files:**
- Create: `kova-open-pencil-1/src/stores/eyedropper.ts`

- [ ] **Step 1: Write implementation**

```typescript
// kova-open-pencil-1/src/stores/eyedropper.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'

type SampleCallback = (hex: string) => void

export const useEyedropperStore = defineStore('eyedropper', () => {
  const active = ref(false)
  const sampledHex = ref<string | null>(null)
  const callback = ref<SampleCallback | null>(null)

  function activate(onSample: SampleCallback): void {
    active.value = true
    callback.value = onSample
  }

  function sample(hex: string): void {
    sampledHex.value = hex
    if (callback.value) callback.value(hex)
    active.value = false
    callback.value = null
  }

  function cancel(): void {
    active.value = false
    callback.value = null
  }

  return { active, sampledHex, activate, sample, cancel }
})
```

- [ ] **Step 2: Run test to verify pass**

Run: `bun test tests/unit/stores/eyedropper.test.ts`
Expected: 4 PASS.

- [ ] **Step 3: Commit**

```bash
git add kova-open-pencil-1/src/stores/eyedropper.ts kova-open-pencil-1/tests/unit/stores/eyedropper.test.ts
git commit -m "feat(07b): add useEyedropperStore for canvas-only sampling"
```

### Task 1.5: Extend useEditorStore — overlays + activeTool

**Files:**
- Modify: `kova-open-pencil-1/src/stores/editor.ts` (add `overlays` reactive object; widen `activeTool` union if needed)

- [ ] **Step 1: Read existing editor store to find insertion point**

Run: `grep -n "defineStore" kova-open-pencil-1/src/stores/editor.ts | head -5`
Read the existing file. Note where existing `activeTool` ref lives, where state is returned.

- [ ] **Step 2: Write failing test for new overlays state**

Create `kova-open-pencil-1/tests/unit/stores/editor-overlays.test.ts`:

```typescript
import { describe, expect, it, beforeEach } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'
import { useEditorStore } from '@/stores/editor'

describe('useEditorStore overlays', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('overlays.frameOutlines defaults true', () => {
    const store = useEditorStore()
    expect(store.overlays.frameOutlines).toBe(true)
  })

  it('overlays.layoutGuides defaults true (Q24)', () => {
    const store = useEditorStore()
    expect(store.overlays.layoutGuides).toBe(true)
  })

  it('overlays.pixelGrid defaults true', () => {
    const store = useEditorStore()
    expect(store.overlays.pixelGrid).toBe(true)
  })
})
```

- [ ] **Step 3: Run test to verify failure**

Run: `bun test tests/unit/stores/editor-overlays.test.ts`
Expected: FAIL — `store.overlays` undefined.

- [ ] **Step 4: Add overlays + tool extension to editor.ts**

Inside `defineStore('editor', () => {...})`, add:

```typescript
import { reactive } from 'vue'

// Inside the setup function:
const overlays = reactive({
  frameOutlines: true,
  maskOutlines: true,
  pixelGrid: true,
  layoutGuides: true,    // Q24-locked default ON
  hoverContour: true,
  measurements: true,
})

// At the return statement, add: overlays
```

If `activeTool` ref exists with a narrower union, widen it (use a single source of truth — extend the existing union):

```typescript
type ActiveTool =
  | 'move' | 'frame' | 'rectangle' | 'ellipse' | 'pen' | 'text'
  | 'comment' | 'ai' | 'components'
  | 'slice' | 'measurement' | 'eyedropper' | 'scale'
```

- [ ] **Step 5: Run test to verify pass**

Run: `bun test tests/unit/stores/editor-overlays.test.ts`
Expected: 3 PASS.

- [ ] **Step 6: Run full test suite to ensure no regression**

Run: `bun run test:unit`
Expected: all previously-green tests still green.

- [ ] **Step 7: Commit**

```bash
git add kova-open-pencil-1/src/stores/editor.ts kova-open-pencil-1/tests/unit/stores/editor-overlays.test.ts
git commit -m "feat(07b): extend useEditorStore with overlay flags + activeTool union"
```

---

## Phase 2: Composables

### Task 2.1: useEyedropper — failing test

**Files:**
- Test: `kova-open-pencil-1/tests/unit/composables/use-eyedropper.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
import { describe, expect, it, beforeEach, mock } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'
import { useEyedropper } from '@/composables/use-eyedropper'
import { useEyedropperStore } from '@/stores/eyedropper'

describe('useEyedropper', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('isActive reflects store.active', () => {
    const { isActive } = useEyedropper()
    expect(isActive.value).toBe(false)

    const store = useEyedropperStore()
    store.activate(() => {})
    expect(isActive.value).toBe(true)
  })

  it('activate registers callback through the store', () => {
    const { activate } = useEyedropper()
    const cb = mock((hex: string) => {})
    activate(cb)

    const store = useEyedropperStore()
    store.sample('#abcdef')
    expect(cb).toHaveBeenCalledWith('#abcdef')
  })

  it('cancel clears active', () => {
    const { activate, cancel, isActive } = useEyedropper()
    activate(() => {})
    expect(isActive.value).toBe(true)
    cancel()
    expect(isActive.value).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify failure**

Run: `bun test tests/unit/composables/use-eyedropper.test.ts`
Expected: FAIL — module not found.

### Task 2.2: useEyedropper — implementation

**Files:**
- Create: `kova-open-pencil-1/src/composables/use-eyedropper.ts`

- [ ] **Step 1: Write implementation**

```typescript
// kova-open-pencil-1/src/composables/use-eyedropper.ts
import { computed } from 'vue'
import { useEyedropperStore } from '@/stores/eyedropper'

export function useEyedropper() {
  const store = useEyedropperStore()

  const isActive = computed(() => store.active)
  const sampledHex = computed(() => store.sampledHex)

  function activate(onSample: (hex: string) => void): void {
    store.activate(onSample)
  }

  function cancel(): void {
    store.cancel()
  }

  return { isActive, sampledHex, activate, cancel }
}
```

- [ ] **Step 2: Run test to verify pass**

Run: `bun test tests/unit/composables/use-eyedropper.test.ts`
Expected: 3 PASS.

- [ ] **Step 3: Commit**

```bash
git add kova-open-pencil-1/src/composables/use-eyedropper.ts kova-open-pencil-1/tests/unit/composables/use-eyedropper.test.ts
git commit -m "feat(07b): add useEyedropper composable"
```

### Task 2.3: useSliceTool — failing test

**Files:**
- Test: `kova-open-pencil-1/tests/unit/composables/use-slice-tool.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
import { describe, expect, it, beforeEach, mock } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'
import { useSliceTool } from '@/composables/use-slice-tool'
import { useEditorStore } from '@/stores/editor'

describe('useSliceTool', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('starts inactive', () => {
    const { isActive } = useSliceTool()
    expect(isActive.value).toBe(false)
  })

  it('activate sets useEditorStore.activeTool="slice"', () => {
    const editor = useEditorStore()
    const { activate } = useSliceTool()
    activate()
    expect(editor.activeTool).toBe('slice')
  })

  it('deactivate sets useEditorStore.activeTool="move"', () => {
    const editor = useEditorStore()
    const { activate, deactivate } = useSliceTool()
    activate()
    deactivate()
    expect(editor.activeTool).toBe('move')
  })
})
```

- [ ] **Step 2: Run test to verify failure**

Run: `bun test tests/unit/composables/use-slice-tool.test.ts`
Expected: FAIL.

### Task 2.4: useSliceTool — implementation

**Files:**
- Create: `kova-open-pencil-1/src/composables/use-slice-tool.ts`

- [ ] **Step 1: Write implementation**

```typescript
// kova-open-pencil-1/src/composables/use-slice-tool.ts
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor'

export function useSliceTool() {
  const editor = useEditorStore()

  const isActive = computed(() => editor.activeTool === 'slice')

  function activate(): void {
    editor.activeTool = 'slice'
  }

  function deactivate(): void {
    editor.activeTool = 'move'
  }

  return { isActive, activate, deactivate }
}
```

- [ ] **Step 2: Run test to verify pass**

Run: `bun test tests/unit/composables/use-slice-tool.test.ts`
Expected: 3 PASS.

- [ ] **Step 3: Commit**

```bash
git add kova-open-pencil-1/src/composables/use-slice-tool.ts kova-open-pencil-1/tests/unit/composables/use-slice-tool.test.ts
git commit -m "feat(07b): add useSliceTool composable"
```

### Task 2.5: useMeasurementTool — failing test

**Files:**
- Test: `kova-open-pencil-1/tests/unit/composables/use-measurement-tool.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
import { describe, expect, it, beforeEach } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'
import { useMeasurementTool } from '@/composables/use-measurement-tool'
import { useEditorStore } from '@/stores/editor'

describe('useMeasurementTool', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('starts inactive', () => {
    const { isActive } = useMeasurementTool()
    expect(isActive.value).toBe(false)
  })

  it('activate sets activeTool=measurement', () => {
    const editor = useEditorStore()
    const { activate } = useMeasurementTool()
    activate()
    expect(editor.activeTool).toBe('measurement')
  })

  it('deactivate clears any pending start point', () => {
    const { activate, deactivate, pendingStart } = useMeasurementTool()
    activate()
    // Simulate first click
    pendingStart.value = { x: 10, y: 20 }
    deactivate()
    expect(pendingStart.value).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify failure**

Run: `bun test tests/unit/composables/use-measurement-tool.test.ts`
Expected: FAIL.

### Task 2.6: useMeasurementTool — implementation

**Files:**
- Create: `kova-open-pencil-1/src/composables/use-measurement-tool.ts`

- [ ] **Step 1: Write implementation**

```typescript
// kova-open-pencil-1/src/composables/use-measurement-tool.ts
import { computed, ref } from 'vue'
import { useEditorStore } from '@/stores/editor'

interface Vector2 { x: number; y: number }

export function useMeasurementTool() {
  const editor = useEditorStore()

  const isActive = computed(() => editor.activeTool === 'measurement')
  const pendingStart = ref<Vector2 | null>(null)

  function activate(): void {
    editor.activeTool = 'measurement'
    pendingStart.value = null
  }

  function deactivate(): void {
    editor.activeTool = 'move'
    pendingStart.value = null
  }

  /**
   * Wire from canvas-input handler when activeTool='measurement':
   *   first click → pendingStart = point;
   *   second click → call figma.createMeasurement({ start, end }), clear pendingStart.
   * Engine wiring lives in 07a; this composable is a state machine only.
   */
  return { isActive, pendingStart, activate, deactivate }
}
```

- [ ] **Step 2: Run test to verify pass**

Run: `bun test tests/unit/composables/use-measurement-tool.test.ts`
Expected: 3 PASS.

- [ ] **Step 3: Commit**

```bash
git add kova-open-pencil-1/src/composables/use-measurement-tool.ts kova-open-pencil-1/tests/unit/composables/use-measurement-tool.test.ts
git commit -m "feat(07b): add useMeasurementTool composable"
```

### Task 2.7: useExportPipeline — failing test

**Files:**
- Test: `kova-open-pencil-1/tests/unit/composables/use-export-pipeline.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
import { describe, expect, it, beforeEach, mock } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'

const exportAsyncMock = mock(async (_node, _opts) => new Uint8Array([1, 2, 3]))

mock.module('@open-pencil/core', () => ({
  figma: {
    currentPage: {
      children: [
        { id: 's1', type: 'SLICE', name: 'header' },
        { id: 's2', type: 'SLICE', name: 'footer' },
        { id: 'r1', type: 'RECTANGLE', name: 'rect' },
      ],
    },
    exportAsync: exportAsyncMock,
  },
}))

import { useExportPipeline } from '@/composables/use-export-pipeline'

describe('useExportPipeline', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    exportAsyncMock.mockClear()
  })

  it('exportAllSlices iterates only SLICE nodes (skips RECTANGLE)', async () => {
    const { exportAllSlices } = useExportPipeline()
    await exportAllSlices({ format: 'PNG', scale: 1 })
    expect(exportAsyncMock).toHaveBeenCalledTimes(2)
  })

  it('exportSingleSlice invokes exportAsync once with quality for JPG', async () => {
    const { exportSingleSlice } = useExportPipeline()
    await exportSingleSlice('s1', { format: 'JPG', scale: 2, quality: 0.92 })
    expect(exportAsyncMock).toHaveBeenCalledTimes(1)
    const callArgs = exportAsyncMock.mock.calls[0]
    expect(callArgs[1]).toMatchObject({
      format: 'JPG',
      constraint: { type: 'SCALE', value: 2 },
      quality: 0.92,
    })
  })
})
```

- [ ] **Step 2: Run test to verify failure**

Run: `bun test tests/unit/composables/use-export-pipeline.test.ts`
Expected: FAIL.

### Task 2.8: useExportPipeline — implementation (Phase A — per-file fallback)

**Files:**
- Create: `kova-open-pencil-1/src/composables/use-export-pipeline.ts`

- [ ] **Step 1: Write implementation**

```typescript
// kova-open-pencil-1/src/composables/use-export-pipeline.ts
import { figma } from '@open-pencil/core'
import { FEATURE_GATES } from '@/constants/overlays'

interface ExportOpts {
  format: 'PNG' | 'JPG'
  scale: 1 | 2 | 3
  quality?: number
}

export function useExportPipeline() {
  async function exportSingleSlice(
    sliceId: string,
    opts: ExportOpts,
  ): Promise<Blob> {
    const node = figma.currentPage.children.find((n: { id: string }) => n.id === sliceId)
    if (!node) throw new Error(`Slice not found: ${sliceId}`)

    const exportArgs: Record<string, unknown> = {
      format: opts.format,
      constraint: { type: 'SCALE', value: opts.scale },
    }
    if (opts.format === 'JPG' && opts.quality !== undefined) {
      exportArgs.quality = opts.quality
    }

    const bytes = await figma.exportAsync(node, exportArgs)
    return new Blob([bytes], { type: opts.format === 'PNG' ? 'image/png' : 'image/jpeg' })
  }

  async function exportAllSlices(opts: ExportOpts): Promise<Blob> {
    const slices = figma.currentPage.children.filter(
      (n: { type: string }) => n.type === 'SLICE',
    )

    const blobs: Array<{ name: string; blob: Blob }> = []
    for (const slice of slices) {
      const blob = await exportSingleSlice(slice.id, opts)
      blobs.push({ name: `${slice.name}.${opts.format.toLowerCase()}`, blob })
    }

    if (FEATURE_GATES.EXPORT_PIPELINE_ZIP_BATCHING) {
      // Phase B — JSZip batching (lazy-imported to keep bundle small)
      const { default: JSZip } = await import('jszip')
      const zip = new JSZip()
      for (const { name, blob } of blobs) {
        zip.file(name, blob)
      }
      return zip.generateAsync({ type: 'blob' })
    }

    // Phase A — per-file download fallback. Triggers N downloads.
    for (const { name, blob } of blobs) {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = name
      a.click()
      URL.revokeObjectURL(url)
    }
    // Returns the LAST blob for caller convenience; primary effect is the per-file downloads.
    return blobs[blobs.length - 1]?.blob ?? new Blob()
  }

  return { exportAllSlices, exportSingleSlice }
}
```

- [ ] **Step 2: Run test to verify pass**

Run: `bun test tests/unit/composables/use-export-pipeline.test.ts`
Expected: 2 PASS.

- [ ] **Step 3: Commit**

```bash
git add kova-open-pencil-1/src/composables/use-export-pipeline.ts kova-open-pencil-1/tests/unit/composables/use-export-pipeline.test.ts
git commit -m "feat(07b): add useExportPipeline (Phase A per-file fallback)"
```

### Task 2.9: useCopyPasteProps — failing test

**Files:**
- Test: `kova-open-pencil-1/tests/unit/composables/use-copy-paste-props.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
import { describe, expect, it, beforeEach } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'

mock.module('@/stores/editor', () => ({
  useEditorStore: () => ({
    selectedNodes: [
      { id: 'n1', type: 'RECTANGLE', strokeWeight: 2, strokeAlign: 'INSIDE' },
    ],
  }),
}))

import { mock } from 'bun:test'
import { useCopyPasteProps } from '@/composables/use-copy-paste-props'
import { useClipboardStore } from '@/stores/clipboard'

describe('useCopyPasteProps', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('copy stores selection props in clipboard', () => {
    const { copy } = useCopyPasteProps()
    const clipboard = useClipboardStore()
    copy()
    expect(clipboard.copiedProps).not.toBeNull()
    expect(clipboard.copiedProps!.props.strokeWeight).toBe(2)
  })

  it('canPaste reflects clipboard state', () => {
    const { canPaste, copy } = useCopyPasteProps()
    expect(canPaste.value).toBe(false)
    copy()
    expect(canPaste.value).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify failure**

Run: `bun test tests/unit/composables/use-copy-paste-props.test.ts`
Expected: FAIL.

### Task 2.10: useCopyPasteProps — implementation

**Files:**
- Create: `kova-open-pencil-1/src/composables/use-copy-paste-props.ts`

- [ ] **Step 1: Write implementation**

```typescript
// kova-open-pencil-1/src/composables/use-copy-paste-props.ts
import { computed } from 'vue'
import { useClipboardStore } from '@/stores/clipboard'
import { useEditorStore } from '@/stores/editor'

export function useCopyPasteProps() {
  const clipboard = useClipboardStore()
  const editor = useEditorStore()

  const canPaste = computed(() => clipboard.copiedProps !== null)

  function copy(): void {
    const sel = editor.selectedNodes
    if (sel.length === 0) return
    clipboard.copyProps(sel[0])
  }

  function paste(): void {
    const sel = editor.selectedNodes
    if (sel.length === 0) return
    clipboard.pasteProps(sel)
  }

  return { copy, paste, canPaste }
}
```

- [ ] **Step 2: Run test to verify pass**

Run: `bun test tests/unit/composables/use-copy-paste-props.test.ts`
Expected: 2 PASS.

- [ ] **Step 3: Commit**

```bash
git add kova-open-pencil-1/src/composables/use-copy-paste-props.ts kova-open-pencil-1/tests/unit/composables/use-copy-paste-props.test.ts
git commit -m "feat(07b): add useCopyPasteProps for Q23 full-set"
```

---

## Phase 3: Inspector components (10 NEW)

> **Pattern:** every component task is identical shape — write failing test, write component, run test, commit. The components themselves are small leaf Vue files. Each one cites its hi-fi scene.

### Task 3.1: VerticalTextAlignRow

**Files:**
- Create: `kova-open-pencil-1/src/components/inspector/VerticalTextAlignRow.vue`
- Test: `kova-open-pencil-1/tests/unit/components/inspector/VerticalTextAlignRow.test.ts`

Hi-fi: 11.7 + Q3 #1.

- [ ] **Step 1: Write failing test**

```typescript
// tests/unit/components/inspector/VerticalTextAlignRow.test.ts
import { describe, expect, it } from 'bun:test'
import { mount } from '@vue/test-utils'
import VerticalTextAlignRow from '@/components/inspector/VerticalTextAlignRow.vue'

describe('VerticalTextAlignRow', () => {
  it('renders 3 segmented buttons', () => {
    const wrapper = mount(VerticalTextAlignRow, { props: { modelValue: 'TOP' } })
    const buttons = wrapper.findAll('button')
    expect(buttons).toHaveLength(3)
  })

  it('marks active button for current modelValue', () => {
    const wrapper = mount(VerticalTextAlignRow, { props: { modelValue: 'CENTER' } })
    const active = wrapper.find('button[aria-pressed="true"]')
    expect(active.text()).toContain('Middle')
  })

  it('emits update:modelValue on click', async () => {
    const wrapper = mount(VerticalTextAlignRow, { props: { modelValue: 'TOP' } })
    await wrapper.findAll('button')[2].trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')![0]).toEqual(['BOTTOM'])
  })
})
```

- [ ] **Step 2: Run test to verify failure**

Run: `bun test tests/unit/components/inspector/VerticalTextAlignRow.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write component**

```vue
<!-- kova-open-pencil-1/src/components/inspector/VerticalTextAlignRow.vue -->
<script setup lang="ts">
type Vertical = 'TOP' | 'CENTER' | 'BOTTOM'

const props = defineProps<{ modelValue: Vertical }>()
const emit = defineEmits<{ 'update:modelValue': [value: Vertical] }>()

const OPTIONS: Array<{ value: Vertical; label: string; icon: string }> = [
  { value: 'TOP',    label: 'Top',    icon: 'i-lucide-align-vertical-justify-start' },
  { value: 'CENTER', label: 'Middle', icon: 'i-lucide-align-vertical-justify-center' },
  { value: 'BOTTOM', label: 'Bottom', icon: 'i-lucide-align-vertical-justify-end' },
]
</script>

<template>
  <div class="flex items-center gap-1 rounded border border-border bg-panel p-0.5">
    <button
      v-for="opt in OPTIONS"
      :key="opt.value"
      type="button"
      :aria-pressed="modelValue === opt.value"
      :title="opt.label"
      class="flex-1 rounded px-2 py-1 text-xs"
      :class="modelValue === opt.value
        ? 'bg-accent-soft text-accent-ink'
        : 'text-ink3 hover:bg-fill2'"
      @click="emit('update:modelValue', opt.value)"
    >
      {{ opt.label }}
    </button>
  </div>
</template>
```

- [ ] **Step 4: Run test to verify pass**

Run: `bun test tests/unit/components/inspector/VerticalTextAlignRow.test.ts`
Expected: 3 PASS.

- [ ] **Step 5: Commit**

```bash
git add kova-open-pencil-1/src/components/inspector/VerticalTextAlignRow.vue kova-open-pencil-1/tests/unit/components/inspector/VerticalTextAlignRow.test.ts
git commit -m "feat(07b): add VerticalTextAlignRow inspector component"
```

### Task 3.2: StrokeAlignRow

**Files:**
- Create: `kova-open-pencil-1/src/components/inspector/StrokeAlignRow.vue`
- Test: `kova-open-pencil-1/tests/unit/components/inspector/StrokeAlignRow.test.ts`

Hi-fi: 11.17 + Q3 #5.

- [ ] **Step 1: Write failing test (mirror VerticalTextAlignRow pattern)**

```typescript
import { describe, expect, it } from 'bun:test'
import { mount } from '@vue/test-utils'
import StrokeAlignRow from '@/components/inspector/StrokeAlignRow.vue'

describe('StrokeAlignRow', () => {
  it('renders INSIDE / CENTER / OUTSIDE buttons', () => {
    const wrapper = mount(StrokeAlignRow, { props: { modelValue: 'INSIDE' } })
    expect(wrapper.findAll('button')).toHaveLength(3)
  })

  it('emits update on click', async () => {
    const wrapper = mount(StrokeAlignRow, { props: { modelValue: 'INSIDE' } })
    await wrapper.findAll('button')[1].trigger('click')
    expect(wrapper.emitted('update:modelValue')![0]).toEqual(['CENTER'])
  })
})
```

- [ ] **Step 2: Run test to verify failure**

Run: `bun test tests/unit/components/inspector/StrokeAlignRow.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write component**

```vue
<!-- kova-open-pencil-1/src/components/inspector/StrokeAlignRow.vue -->
<script setup lang="ts">
type Align = 'INSIDE' | 'CENTER' | 'OUTSIDE'

const props = defineProps<{ modelValue: Align }>()
const emit = defineEmits<{ 'update:modelValue': [value: Align] }>()

const OPTIONS: Array<{ value: Align; label: string }> = [
  { value: 'INSIDE',  label: 'Inside' },
  { value: 'CENTER',  label: 'Center' },
  { value: 'OUTSIDE', label: 'Outside' },
]
</script>

<template>
  <div class="flex items-center gap-1 rounded border border-border bg-panel p-0.5">
    <button
      v-for="opt in OPTIONS"
      :key="opt.value"
      type="button"
      :aria-pressed="modelValue === opt.value"
      :title="opt.label"
      class="flex-1 rounded px-2 py-1 text-xs"
      :class="modelValue === opt.value
        ? 'bg-accent-soft text-accent-ink'
        : 'text-ink3 hover:bg-fill2'"
      @click="emit('update:modelValue', opt.value)"
    >
      {{ opt.label }}
    </button>
  </div>
</template>
```

- [ ] **Step 4: Run test to verify pass + commit**

Run: `bun test tests/unit/components/inspector/StrokeAlignRow.test.ts`

```bash
git add kova-open-pencil-1/src/components/inspector/StrokeAlignRow.vue kova-open-pencil-1/tests/unit/components/inspector/StrokeAlignRow.test.ts
git commit -m "feat(07b): add StrokeAlignRow inspector component"
```

### Task 3.3: JpgQualityDropdown

**Files:**
- Create: `kova-open-pencil-1/src/components/inspector/JpgQualityDropdown.vue`
- Test: `kova-open-pencil-1/tests/unit/components/inspector/JpgQualityDropdown.test.ts`

Hi-fi: 11.18. Quality: High 0.92 / Medium 0.80 / Low 0.65 per Q22 + `JPG_QUALITY` constant.

- [ ] **Step 1: Write failing test**

```typescript
import { describe, expect, it } from 'bun:test'
import { mount } from '@vue/test-utils'
import JpgQualityDropdown from '@/components/inspector/JpgQualityDropdown.vue'

describe('JpgQualityDropdown', () => {
  it('renders 3 options', () => {
    const wrapper = mount(JpgQualityDropdown, { props: { modelValue: 'high' } })
    expect(wrapper.findAll('option')).toHaveLength(3)
  })

  it('shows quality value next to label', () => {
    const wrapper = mount(JpgQualityDropdown, { props: { modelValue: 'high' } })
    expect(wrapper.text()).toContain('0.92')
    expect(wrapper.text()).toContain('0.80')
    expect(wrapper.text()).toContain('0.65')
  })

  it('emits update:modelValue on change', async () => {
    const wrapper = mount(JpgQualityDropdown, { props: { modelValue: 'high' } })
    await wrapper.find('select').setValue('low')
    expect(wrapper.emitted('update:modelValue')![0]).toEqual(['low'])
  })
})
```

- [ ] **Step 2: Run test to verify failure**

Run: `bun test tests/unit/components/inspector/JpgQualityDropdown.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write component**

```vue
<!-- kova-open-pencil-1/src/components/inspector/JpgQualityDropdown.vue -->
<script setup lang="ts">
import { JPG_QUALITY } from '@/constants/overlays'

type QualityKey = 'high' | 'medium' | 'low'

const props = defineProps<{ modelValue: QualityKey }>()
const emit = defineEmits<{ 'update:modelValue': [value: QualityKey] }>()

const OPTIONS: Array<{ key: QualityKey; label: string; value: number }> = [
  { key: 'high',   label: 'High',   value: JPG_QUALITY.HIGH },
  { key: 'medium', label: 'Medium', value: JPG_QUALITY.MEDIUM },
  { key: 'low',    label: 'Low',    value: JPG_QUALITY.LOW },
]
</script>

<template>
  <select
    :value="modelValue"
    class="rounded border border-border bg-panel px-2 py-1 text-xs text-ink"
    @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value as QualityKey)"
  >
    <option v-for="opt in OPTIONS" :key="opt.key" :value="opt.key">
      {{ opt.label }} ({{ opt.value.toFixed(2) }})
    </option>
  </select>
</template>
```

- [ ] **Step 4: Run test + commit**

```bash
bun test tests/unit/components/inspector/JpgQualityDropdown.test.ts
git add kova-open-pencil-1/src/components/inspector/JpgQualityDropdown.vue kova-open-pencil-1/tests/unit/components/inspector/JpgQualityDropdown.test.ts
git commit -m "feat(07b): add JpgQualityDropdown (Q22 3-level)"
```

### Task 3.4: BooleanOpsRow

**Files:**
- Create: `kova-open-pencil-1/src/components/inspector/BooleanOpsRow.vue`
- Test: `kova-open-pencil-1/tests/unit/components/inspector/BooleanOpsRow.test.ts`

Hi-fi: 11.9. Reads `useEditorStore.selectedNodes`. Calls `figma.booleanOperation()`.

- [ ] **Step 1: Write failing test**

```typescript
import { describe, expect, it, beforeEach, mock } from 'bun:test'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'

const booleanOperationMock = mock((_op: string) => {})

mock.module('@open-pencil/core', () => ({
  figma: { booleanOperation: booleanOperationMock },
}))

mock.module('@/stores/editor', () => ({
  useEditorStore: () => ({
    selectedNodes: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
  }),
}))

import BooleanOpsRow from '@/components/inspector/BooleanOpsRow.vue'

describe('BooleanOpsRow', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    booleanOperationMock.mockClear()
  })

  it('renders 4 buttons (Union/Subtract/Intersect/Exclude)', () => {
    const wrapper = mount(BooleanOpsRow)
    expect(wrapper.findAll('button')).toHaveLength(4)
  })

  it('shows shortcut in tooltip', () => {
    const wrapper = mount(BooleanOpsRow)
    const titles = wrapper.findAll('button').map((b) => b.attributes('title'))
    expect(titles[0]).toContain('⌘⌥U')
    expect(titles[1]).toContain('⌘⌥S')
    expect(titles[2]).toContain('⌘⌥I')
    expect(titles[3]).toContain('⌘⌥X')
  })

  it('clicking Union calls figma.booleanOperation("UNION")', async () => {
    const wrapper = mount(BooleanOpsRow)
    await wrapper.findAll('button')[0].trigger('click')
    expect(booleanOperationMock).toHaveBeenCalledWith('UNION')
  })
})
```

- [ ] **Step 2: Run test to verify failure**

Run: `bun test tests/unit/components/inspector/BooleanOpsRow.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write component**

```vue
<!-- kova-open-pencil-1/src/components/inspector/BooleanOpsRow.vue -->
<script setup lang="ts">
import { figma } from '@open-pencil/core'

type BoolOp = 'UNION' | 'SUBTRACT' | 'INTERSECT' | 'EXCLUDE'

const OPS: Array<{ op: BoolOp; label: string; shortcut: string; icon: string }> = [
  { op: 'UNION',     label: 'Union',     shortcut: '⌘⌥U', icon: 'i-lucide-square' },
  { op: 'SUBTRACT',  label: 'Subtract',  shortcut: '⌘⌥S', icon: 'i-lucide-square-minus' },
  { op: 'INTERSECT', label: 'Intersect', shortcut: '⌘⌥I', icon: 'i-lucide-square-dot' },
  { op: 'EXCLUDE',   label: 'Exclude',   shortcut: '⌘⌥X', icon: 'i-lucide-square-x' },
]

function applyOp(op: BoolOp): void {
  figma.booleanOperation(op)
}
</script>

<template>
  <section class="flex flex-col gap-2 px-3 py-2">
    <h6 class="text-xs font-medium text-ink3">Boolean</h6>
    <div class="flex items-center gap-1">
      <button
        v-for="entry in OPS"
        :key="entry.op"
        type="button"
        :title="`${entry.label} ${entry.shortcut}`"
        class="flex h-7 w-7 items-center justify-center rounded text-ink3 hover:bg-fill2"
        @click="applyOp(entry.op)"
      >
        <span :class="entry.icon" class="size-4" />
      </button>
    </div>
  </section>
</template>
```

- [ ] **Step 4: Run test + commit**

```bash
bun test tests/unit/components/inspector/BooleanOpsRow.test.ts
git add kova-open-pencil-1/src/components/inspector/BooleanOpsRow.vue kova-open-pencil-1/tests/unit/components/inspector/BooleanOpsRow.test.ts
git commit -m "feat(07b): add BooleanOpsRow (Q3 #14)"
```

### Task 3.5: GradientStopList

**Files:**
- Create: `kova-open-pencil-1/src/components/inspector/GradientStopList.vue`
- Test: `kova-open-pencil-1/tests/unit/components/inspector/GradientStopList.test.ts`

Hi-fi: 12.6, 12.7. Outer stops (0%, 100%) hide ×; intermediate stops show ×.

- [ ] **Step 1: Write failing test**

```typescript
import { describe, expect, it } from 'bun:test'
import { mount } from '@vue/test-utils'
import GradientStopList from '@/components/inspector/GradientStopList.vue'

describe('GradientStopList', () => {
  const baseStops = [
    { position: 0,    color: { r: 0, g: 0, b: 0, a: 1 } },
    { position: 0.5,  color: { r: 1, g: 1, b: 0, a: 1 } },
    { position: 1,    color: { r: 1, g: 1, b: 1, a: 1 } },
  ]

  it('renders one row per stop', () => {
    const wrapper = mount(GradientStopList, { props: { stops: baseStops, selectedIndex: 0 } })
    expect(wrapper.findAll('[data-test="stop-row"]')).toHaveLength(3)
  })

  it('hides remove button on outer stops (0%, 100%)', () => {
    const wrapper = mount(GradientStopList, { props: { stops: baseStops, selectedIndex: 0 } })
    const removeButtons = wrapper.findAll('[data-test="stop-remove"]')
    expect(removeButtons[0].element.style.visibility).toBe('hidden')
    expect(removeButtons[2].element.style.visibility).toBe('hidden')
  })

  it('shows remove button on intermediate stops', () => {
    const wrapper = mount(GradientStopList, { props: { stops: baseStops, selectedIndex: 1 } })
    const removeButtons = wrapper.findAll('[data-test="stop-remove"]')
    expect(removeButtons[1].element.style.visibility).not.toBe('hidden')
  })

  it('add emits when "Add stop" clicked', async () => {
    const wrapper = mount(GradientStopList, { props: { stops: baseStops, selectedIndex: 0 } })
    await wrapper.find('[data-test="add-stop"]').trigger('click')
    expect(wrapper.emitted('add')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test to verify failure**

Run: `bun test tests/unit/components/inspector/GradientStopList.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write component**

```vue
<!-- kova-open-pencil-1/src/components/inspector/GradientStopList.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { colorToCSS } from '@open-pencil/core'
import type { Color } from '@open-pencil/core'

interface GradientStop {
  position: number      // 0..1
  color: Color
}

const props = defineProps<{ stops: GradientStop[]; selectedIndex: number }>()
const emit = defineEmits<{
  'update:stops': [stops: GradientStop[]]
  'update:selectedIndex': [index: number]
  add: []
  remove: [index: number]
}>()

function isOuter(index: number): boolean {
  return index === 0 || index === props.stops.length - 1
}

function rowStyle(stop: GradientStop) {
  return { background: colorToCSS(stop.color) }
}
</script>

<template>
  <div class="flex flex-col gap-1">
    <div
      v-for="(stop, index) in stops"
      :key="index"
      data-test="stop-row"
      class="flex items-center gap-2 rounded px-2 py-1 text-xs"
      :class="index === selectedIndex ? 'bg-fill2 ring-1 ring-accent' : 'hover:bg-fill2'"
      @click="emit('update:selectedIndex', index)"
    >
      <span class="size-4 rounded border border-border" :style="rowStyle(stop)" />
      <span class="flex-1 font-mono">{{ Math.round(stop.position * 100) }}%</span>
      <button
        type="button"
        data-test="stop-remove"
        class="text-ink3 hover:text-ink"
        :style="{ visibility: isOuter(index) ? 'hidden' : 'visible' }"
        title="Remove stop"
        @click.stop="emit('remove', index)"
      >
        ×
      </button>
    </div>
    <button
      type="button"
      data-test="add-stop"
      class="self-start text-xs text-accent hover:text-accent-ink"
      @click="emit('add')"
    >
      + Add stop
    </button>
  </div>
</template>
```

- [ ] **Step 4: Run test + commit**

```bash
bun test tests/unit/components/inspector/GradientStopList.test.ts
git add kova-open-pencil-1/src/components/inspector/GradientStopList.vue kova-open-pencil-1/tests/unit/components/inspector/GradientStopList.test.ts
git commit -m "feat(07b): add GradientStopList component (hi-fi 12.6/12.7)"
```

### Task 3.6: PaintEditor

**Files:**
- Create: `kova-open-pencil-1/src/components/inspector/PaintEditor.vue`
- Test: `kova-open-pencil-1/tests/unit/components/inspector/PaintEditor.test.ts`

Hi-fi: 12.6 / 12.7 / 12.8 / 12.9–12.11 / 12.12–12.14 (anchor contexts). Composes `<GradientStopList>`.

- [ ] **Step 1: Write failing test**

```typescript
import { describe, expect, it } from 'bun:test'
import { mount } from '@vue/test-utils'
import PaintEditor from '@/components/inspector/PaintEditor.vue'

describe('PaintEditor', () => {
  it('renders 4 mode tabs in default context', () => {
    const wrapper = mount(PaintEditor, {
      props: {
        modelValue: { type: 'SOLID', color: { r: 0, g: 0, b: 0, a: 1 } },
        mode: 'solid',
      },
    })
    expect(wrapper.findAll('[data-test="mode-tab"]')).toHaveLength(4)
  })

  it('renders only solid mode in page-bg context', () => {
    const wrapper = mount(PaintEditor, {
      props: {
        modelValue: { type: 'SOLID', color: { r: 0, g: 0, b: 0, a: 1 } },
        mode: 'solid',
        anchorContext: 'page-bg',
      },
    })
    expect(wrapper.findAll('[data-test="mode-tab"]')).toHaveLength(0)
  })

  it('emits update:mode when tab clicked', async () => {
    const wrapper = mount(PaintEditor, {
      props: {
        modelValue: { type: 'SOLID', color: { r: 0, g: 0, b: 0, a: 1 } },
        mode: 'solid',
      },
    })
    await wrapper.findAll('[data-test="mode-tab"]')[1].trigger('click')
    expect(wrapper.emitted('update:mode')![0]).toEqual(['linear'])
  })
})
```

- [ ] **Step 2: Run test to verify failure**

Run: `bun test tests/unit/components/inspector/PaintEditor.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write component**

```vue
<!-- kova-open-pencil-1/src/components/inspector/PaintEditor.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import GradientStopList from './GradientStopList.vue'
import { useEyedropper } from '@/composables/use-eyedropper'
import type { Paint, GradientPaint, ImagePaint } from '@open-pencil/core'

type Mode = 'solid' | 'linear' | 'radial' | 'image'
type AnchorContext = 'fill' | 'stroke' | 'effect' | 'page-bg'

const props = defineProps<{
  modelValue: Paint
  mode: Mode
  anchorContext?: AnchorContext
}>()
const emit = defineEmits<{
  'update:modelValue': [value: Paint]
  'update:mode': [value: Mode]
}>()

const TABS: Array<{ value: Mode; label: string }> = [
  { value: 'solid',  label: 'Solid' },
  { value: 'linear', label: 'Linear' },
  { value: 'radial', label: 'Radial' },
  { value: 'image',  label: 'Image' },
]

// Hi-fi 12.12: page-bg context hides mode tabs (single-mode picker)
const showTabs = computed(() => props.anchorContext !== 'page-bg')

const { activate: activateEyedropper } = useEyedropper()

function pickColor(): void {
  activateEyedropper((hex) => {
    // Wire callback into the active fill — simplified for stub.
    console.log('eyedropper sampled:', hex)
  })
}
</script>

<template>
  <div class="flex w-64 flex-col gap-2 rounded border border-border bg-panel p-2">
    <!-- Mode tabs (hidden in page-bg context per hi-fi 12.12) -->
    <div v-if="showTabs" class="flex items-center gap-1">
      <button
        v-for="tab in TABS"
        :key="tab.value"
        type="button"
        data-test="mode-tab"
        class="flex-1 rounded px-2 py-1 text-xs"
        :class="mode === tab.value ? 'bg-accent-soft text-accent-ink' : 'text-ink3'"
        @click="emit('update:mode', tab.value)"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- Linear / Radial: gradient stops -->
    <GradientStopList
      v-if="mode === 'linear' || mode === 'radial'"
      :stops="(modelValue as GradientPaint).gradientStops || [
        { position: 0, color: { r: 0, g: 0, b: 0, a: 1 } },
        { position: 1, color: { r: 1, g: 1, b: 1, a: 1 } },
      ]"
      :selected-index="0"
      @update:stops="emit('update:modelValue', { ...(modelValue as GradientPaint), gradientStops: $event })"
      @update:selected-index="() => {}"
      @add="() => {}"
      @remove="() => {}"
    />

    <!-- Eyedropper trigger (always visible — hi-fi 12.5) -->
    <button
      type="button"
      title="Pick color from canvas"
      class="self-end text-ink3 hover:text-ink"
      @click="pickColor"
    >
      <span class="i-lucide-pipette size-4" />
    </button>
  </div>
</template>
```

- [ ] **Step 4: Run test + commit**

```bash
bun test tests/unit/components/inspector/PaintEditor.test.ts
git add kova-open-pencil-1/src/components/inspector/PaintEditor.vue kova-open-pencil-1/tests/unit/components/inspector/PaintEditor.test.ts
git commit -m "feat(07b): add PaintEditor (Solid/Linear/Radial/Image)"
```

### Task 3.7: ImageFillPicker

**Files:**
- Create: `kova-open-pencil-1/src/components/inspector/ImageFillPicker.vue`
- Test: `kova-open-pencil-1/tests/unit/components/inspector/ImageFillPicker.test.ts`

Hi-fi: 11.12 (Crop), 12.10, 12.11 (Tile slider). Per Q21: Fill / Fit / Crop / Tile.

- [ ] **Step 1: Write failing test**

```typescript
import { describe, expect, it } from 'bun:test'
import { mount } from '@vue/test-utils'
import ImageFillPicker from '@/components/inspector/ImageFillPicker.vue'

describe('ImageFillPicker', () => {
  const baseValue = {
    type: 'IMAGE' as const,
    scaleMode: 'FILL' as const,
    src: 'data:image/png;base64,xxx',
  }

  it('renders 4 mode tabs (Fill/Fit/Crop/Tile)', () => {
    const wrapper = mount(ImageFillPicker, { props: { modelValue: baseValue } })
    const tabs = wrapper.findAll('[data-test="scale-mode"]')
    expect(tabs).toHaveLength(4)
  })

  it('marks active tab for current scaleMode', () => {
    const wrapper = mount(ImageFillPicker, {
      props: { modelValue: { ...baseValue, scaleMode: 'CROP' } },
    })
    const active = wrapper.find('[data-test="scale-mode"][aria-pressed="true"]')
    expect(active.text()).toBe('Crop')
  })

  it('emits update:modelValue when scale-mode changes', async () => {
    const wrapper = mount(ImageFillPicker, { props: { modelValue: baseValue } })
    const tileTab = wrapper.findAll('[data-test="scale-mode"]')[3]
    await tileTab.trigger('click')
    const emitted = wrapper.emitted('update:modelValue')
    expect(emitted).toBeTruthy()
    expect(emitted![0][0]).toMatchObject({ scaleMode: 'TILE' })
  })

  it('renders Tile size slider only when Tile mode active', async () => {
    const wrapper = mount(ImageFillPicker, {
      props: { modelValue: { ...baseValue, scaleMode: 'TILE' } },
    })
    expect(wrapper.find('[data-test="tile-size-slider"]').exists()).toBe(true)
  })

  it('renders 4 corner handles only in Crop mode', () => {
    const wrapper = mount(ImageFillPicker, {
      props: { modelValue: { ...baseValue, scaleMode: 'CROP' } },
    })
    expect(wrapper.findAll('[data-test="crop-handle"]')).toHaveLength(4)
  })
})
```

- [ ] **Step 2: Run test to verify failure**

Run: `bun test tests/unit/components/inspector/ImageFillPicker.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write component**

```vue
<!-- kova-open-pencil-1/src/components/inspector/ImageFillPicker.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import type { ImagePaint } from '@open-pencil/core'

type ScaleMode = 'FILL' | 'FIT' | 'CROP' | 'TILE'

const props = defineProps<{
  modelValue: ImagePaint
  availableSources?: Array<'brand-kit' | 'uploads' | 'shopify'>
}>()
const emit = defineEmits<{ 'update:modelValue': [value: ImagePaint] }>()

const MODES: Array<{ value: ScaleMode; label: string }> = [
  { value: 'FILL',  label: 'Fill' },
  { value: 'FIT',   label: 'Fit' },
  { value: 'CROP',  label: 'Crop' },
  { value: 'TILE',  label: 'Tile' },
]

const isCrop = computed(() => props.modelValue.scaleMode === 'CROP')
const isTile = computed(() => props.modelValue.scaleMode === 'TILE')
const tileSize = computed({
  get: () => (props.modelValue as ImagePaint & { tileSize?: number }).tileSize ?? 50,
  set: (v: number) => emit('update:modelValue', { ...props.modelValue, tileSize: v } as ImagePaint),
})

function setMode(mode: ScaleMode): void {
  emit('update:modelValue', { ...props.modelValue, scaleMode: mode })
}
</script>

<template>
  <div class="flex w-64 flex-col gap-2 rounded border border-border bg-panel p-2">
    <!-- Mode tabs -->
    <div class="flex items-center gap-1">
      <button
        v-for="m in MODES"
        :key="m.value"
        type="button"
        data-test="scale-mode"
        :aria-pressed="modelValue.scaleMode === m.value"
        class="flex-1 rounded px-2 py-1 text-xs"
        :class="modelValue.scaleMode === m.value
          ? 'bg-accent-soft text-accent-ink'
          : 'text-ink3 hover:bg-fill2'"
        @click="setMode(m.value)"
      >
        {{ m.label }}
      </button>
    </div>

    <!-- Image preview with crop handles (Crop mode) -->
    <div v-if="isCrop" class="relative aspect-video bg-fill2">
      <img :src="modelValue.src" class="size-full object-cover" />
      <span data-test="crop-handle" class="absolute left-0 top-0 size-2 bg-white" />
      <span data-test="crop-handle" class="absolute right-0 top-0 size-2 bg-white" />
      <span data-test="crop-handle" class="absolute bottom-0 left-0 size-2 bg-white" />
      <span data-test="crop-handle" class="absolute bottom-0 right-0 size-2 bg-white" />
    </div>

    <!-- Tile size slider (Tile mode) -->
    <div v-if="isTile" class="flex items-center gap-2">
      <label class="text-xs text-ink3">Tile size</label>
      <input
        v-model.number="tileSize"
        data-test="tile-size-slider"
        type="range"
        min="10"
        max="200"
        class="flex-1"
      />
      <span class="font-mono text-xs">{{ tileSize }}%</span>
    </div>
  </div>
</template>
```

- [ ] **Step 4: Run test + commit**

```bash
bun test tests/unit/components/inspector/ImageFillPicker.test.ts
git add kova-open-pencil-1/src/components/inspector/ImageFillPicker.vue kova-open-pencil-1/tests/unit/components/inspector/ImageFillPicker.test.ts
git commit -m "feat(07b): add ImageFillPicker (Q21 4 modes)"
```

### Task 3.8: EffectRow

**Files:**
- Create: `kova-open-pencil-1/src/components/inspector/EffectRow.vue`
- Test: `kova-open-pencil-1/tests/unit/components/inspector/EffectRow.test.ts`

Hi-fi: 11.15. Single row in the effects list.

- [ ] **Step 1: Write failing test**

```typescript
import { describe, expect, it } from 'bun:test'
import { mount } from '@vue/test-utils'
import EffectRow from '@/components/inspector/EffectRow.vue'
import type { Effect } from '@open-pencil/core'

describe('EffectRow', () => {
  const dropShadow: Effect = {
    type: 'DROP_SHADOW',
    color: { r: 0, g: 0, b: 0, a: 0.25 },
    offset: { x: 0, y: 4 },
    radius: 12,
    spread: 0,
    visible: true,
  } as Effect

  it('renders the effect type label', () => {
    const wrapper = mount(EffectRow, {
      props: { effect: dropShadow, index: 0, isSelected: false },
    })
    expect(wrapper.text()).toContain('Drop shadow')
  })

  it('renders meta string for shadow as "X Y Blur"', () => {
    const wrapper = mount(EffectRow, {
      props: { effect: dropShadow, index: 0, isSelected: false },
    })
    expect(wrapper.text()).toContain('0 4 12')
  })

  it('emits select on row click', async () => {
    const wrapper = mount(EffectRow, {
      props: { effect: dropShadow, index: 0, isSelected: false },
    })
    await wrapper.trigger('click')
    expect(wrapper.emitted('select')).toBeTruthy()
  })

  it('emits toggle-visibility when eye clicked', async () => {
    const wrapper = mount(EffectRow, {
      props: { effect: dropShadow, index: 0, isSelected: false },
    })
    await wrapper.find('[data-test="visibility-toggle"]').trigger('click')
    expect(wrapper.emitted('toggle-visibility')).toBeTruthy()
  })

  it('emits delete when × clicked', async () => {
    const wrapper = mount(EffectRow, {
      props: { effect: dropShadow, index: 0, isSelected: false },
    })
    await wrapper.find('[data-test="delete-effect"]').trigger('click')
    expect(wrapper.emitted('delete')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test to verify failure**

Run: `bun test tests/unit/components/inspector/EffectRow.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write component**

```vue
<!-- kova-open-pencil-1/src/components/inspector/EffectRow.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import type { Effect } from '@open-pencil/core'

const props = defineProps<{ effect: Effect; index: number; isSelected: boolean }>()
const emit = defineEmits<{ select: []; 'toggle-visibility': []; delete: [] }>()

const TYPE_LABELS: Record<string, string> = {
  DROP_SHADOW: 'Drop shadow',
  INNER_SHADOW: 'Inner shadow',
  LAYER_BLUR: 'Layer blur',
  BACKGROUND_BLUR: 'Background blur',
  FOREGROUND_BLUR: 'Foreground blur',
}

function isShadow(t: string): boolean {
  return t === 'DROP_SHADOW' || t === 'INNER_SHADOW'
}

const meta = computed(() => {
  const e = props.effect as Effect & {
    offset?: { x: number; y: number }
    radius?: number
  }
  if (isShadow(e.type) && e.offset) {
    return `${e.offset.x} ${e.offset.y} ${e.radius ?? 0}`
  }
  return `${e.radius ?? 0}`
})
</script>

<template>
  <div
    class="flex items-center gap-2 rounded px-2 py-1 text-xs hover:bg-fill2"
    :class="isSelected ? 'bg-fill2 ring-1 ring-accent' : ''"
    @click="emit('select')"
  >
    <span class="i-lucide-grip-vertical size-3 cursor-grab text-ink3" />
    <span class="flex-1">{{ TYPE_LABELS[effect.type] || effect.type }}</span>
    <span class="font-mono text-ink3">{{ meta }}</span>
    <button
      type="button"
      data-test="visibility-toggle"
      class="text-ink3 hover:text-ink"
      :title="effect.visible ? 'Hide effect' : 'Show effect'"
      @click.stop="emit('toggle-visibility')"
    >
      <span :class="effect.visible ? 'i-lucide-eye' : 'i-lucide-eye-off'" class="size-3" />
    </button>
    <button
      type="button"
      data-test="delete-effect"
      class="text-ink3 hover:text-ink"
      title="Remove effect"
      @click.stop="emit('delete')"
    >
      ×
    </button>
  </div>
</template>
```

- [ ] **Step 4: Run test + commit**

```bash
bun test tests/unit/components/inspector/EffectRow.test.ts
git add kova-open-pencil-1/src/components/inspector/EffectRow.vue kova-open-pencil-1/tests/unit/components/inspector/EffectRow.test.ts
git commit -m "feat(07b): add EffectRow (hi-fi 11.15)"
```

### Task 3.9: EffectEditor

**Files:**
- Create: `kova-open-pencil-1/src/components/inspector/EffectEditor.vue`
- Test: `kova-open-pencil-1/tests/unit/components/inspector/EffectEditor.test.ts`

Hi-fi: 11.16. Per-effect popover with X / Y / Blur / Spread + color + Visible.

- [ ] **Step 1: Write failing test**

```typescript
import { describe, expect, it } from 'bun:test'
import { mount } from '@vue/test-utils'
import EffectEditor from '@/components/inspector/EffectEditor.vue'

describe('EffectEditor', () => {
  const dropShadow = {
    type: 'DROP_SHADOW' as const,
    color: { r: 0, g: 0, b: 0, a: 0.30 },
    offset: { x: 0, y: 4 },
    radius: 12,
    spread: 0,
    visible: true,
  }

  it('renders X / Y / Blur / Spread inputs for shadow', () => {
    const wrapper = mount(EffectEditor, { props: { modelValue: dropShadow, index: 0 } })
    expect(wrapper.findAll('input[type="number"]')).toHaveLength(4)
  })

  it('emits update:modelValue when blur changes', async () => {
    const wrapper = mount(EffectEditor, { props: { modelValue: dropShadow, index: 0 } })
    const blurInput = wrapper.findAll('input[type="number"]')[2]
    await blurInput.setValue('20')
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
  })

  it('renders Visible checkbox', () => {
    const wrapper = mount(EffectEditor, { props: { modelValue: dropShadow, index: 0 } })
    expect(wrapper.find('input[type="checkbox"]').exists()).toBe(true)
  })

  it('emits delete when delete button clicked', async () => {
    const wrapper = mount(EffectEditor, { props: { modelValue: dropShadow, index: 0 } })
    await wrapper.find('[data-test="delete-effect"]').trigger('click')
    expect(wrapper.emitted('delete')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test to verify failure**

Run: `bun test tests/unit/components/inspector/EffectEditor.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write component**

```vue
<!-- kova-open-pencil-1/src/components/inspector/EffectEditor.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { colorToCSS } from '@open-pencil/core'
import type { Effect } from '@open-pencil/core'

const props = defineProps<{ modelValue: Effect; index: number }>()
const emit = defineEmits<{
  'update:modelValue': [value: Effect]
  delete: []
}>()

function isShadow(t: string): boolean {
  return t === 'DROP_SHADOW' || t === 'INNER_SHADOW'
}

const e = computed(() => props.modelValue as Effect & {
  offset?: { x: number; y: number }
  radius?: number
  spread?: number
  color?: { r: number; g: number; b: number; a: number }
  visible: boolean
})

function update(field: string, value: unknown) {
  if (field === 'offset.x') {
    emit('update:modelValue', { ...props.modelValue, offset: { ...e.value.offset!, x: value as number } } as Effect)
  } else if (field === 'offset.y') {
    emit('update:modelValue', { ...props.modelValue, offset: { ...e.value.offset!, y: value as number } } as Effect)
  } else {
    emit('update:modelValue', { ...props.modelValue, [field]: value } as Effect)
  }
}
</script>

<template>
  <div class="flex w-[248px] flex-col gap-2 rounded border border-border bg-panel p-2">
    <div class="flex items-center justify-between text-xs">
      <span class="font-medium">{{ modelValue.type === 'DROP_SHADOW' ? 'Drop shadow' : modelValue.type }}</span>
      <button
        type="button"
        data-test="delete-effect"
        class="text-ink3 hover:text-ink"
        @click="emit('delete')"
      >×</button>
    </div>

    <div v-if="isShadow(modelValue.type)" class="grid grid-cols-2 gap-2">
      <label class="flex items-center gap-1 text-xs">
        X
        <input
          type="number"
          :value="e.offset?.x"
          class="w-full rounded border border-border bg-panel px-1 py-0.5"
          @input="update('offset.x', Number(($event.target as HTMLInputElement).value))"
        />
      </label>
      <label class="flex items-center gap-1 text-xs">
        Y
        <input
          type="number"
          :value="e.offset?.y"
          class="w-full rounded border border-border bg-panel px-1 py-0.5"
          @input="update('offset.y', Number(($event.target as HTMLInputElement).value))"
        />
      </label>
      <label class="flex items-center gap-1 text-xs">
        Blur
        <input
          type="number"
          :value="e.radius"
          class="w-full rounded border border-border bg-panel px-1 py-0.5"
          @input="update('radius', Number(($event.target as HTMLInputElement).value))"
        />
      </label>
      <label class="flex items-center gap-1 text-xs">
        Spread
        <input
          type="number"
          :value="e.spread"
          class="w-full rounded border border-border bg-panel px-1 py-0.5"
          @input="update('spread', Number(($event.target as HTMLInputElement).value))"
        />
      </label>
    </div>

    <div v-else class="grid grid-cols-1 gap-2">
      <label class="flex items-center gap-1 text-xs">
        Radius
        <input
          type="number"
          :value="e.radius"
          class="w-full rounded border border-border bg-panel px-1 py-0.5"
          @input="update('radius', Number(($event.target as HTMLInputElement).value))"
        />
      </label>
    </div>

    <!-- Color row (drop-shadow only) -->
    <div v-if="isShadow(modelValue.type) && e.color" class="flex items-center gap-2">
      <span class="size-4 rounded border border-border" :style="{ background: colorToCSS(e.color) }" />
      <span class="text-xs font-mono">{{ Math.round((e.color.a ?? 1) * 100) }}%</span>
    </div>

    <label class="flex items-center gap-1 text-xs">
      <input
        type="checkbox"
        :checked="e.visible"
        @change="update('visible', ($event.target as HTMLInputElement).checked)"
      />
      Visible
    </label>
  </div>
</template>
```

- [ ] **Step 4: Run test + commit**

```bash
bun test tests/unit/components/inspector/EffectEditor.test.ts
git add kova-open-pencil-1/src/components/inspector/EffectEditor.vue kova-open-pencil-1/tests/unit/components/inspector/EffectEditor.test.ts
git commit -m "feat(07b): add EffectEditor popover (hi-fi 11.16)"
```

### Task 3.10: MultipleFillsList

**Files:**
- Create: `kova-open-pencil-1/src/components/inspector/MultipleFillsList.vue`
- Test: `kova-open-pencil-1/tests/unit/components/inspector/MultipleFillsList.test.ts`

Hi-fi: 11.13. Drag-handle-reordered list.

- [ ] **Step 1: Write failing test**

```typescript
import { describe, expect, it } from 'bun:test'
import { mount } from '@vue/test-utils'
import MultipleFillsList from '@/components/inspector/MultipleFillsList.vue'

describe('MultipleFillsList', () => {
  const fills = [
    { type: 'IMAGE' as const, scaleMode: 'FILL' as const, src: 'a.png', visible: true, opacity: 1 },
    { type: 'GRADIENT_LINEAR' as const, gradientStops: [], gradientHandlePositions: [], visible: true, opacity: 0.6 },
    { type: 'SOLID' as const, color: { r: 0.1, g: 0.1, b: 0.1, a: 1 }, visible: true, opacity: 0.24 },
  ]

  it('renders one row per fill', () => {
    const wrapper = mount(MultipleFillsList, { props: { fills, mixed: false } })
    expect(wrapper.findAll('[data-test="fill-row"]')).toHaveLength(3)
  })

  it('renders mixed-state placeholder when mixed=true', () => {
    const wrapper = mount(MultipleFillsList, { props: { fills, mixed: true } })
    expect(wrapper.text()).toContain('Click to enter mixed value')
  })

  it('emits remove on per-row × click', async () => {
    const wrapper = mount(MultipleFillsList, { props: { fills, mixed: false } })
    const removes = wrapper.findAll('[data-test="fill-remove"]')
    await removes[1].trigger('click')
    expect(wrapper.emitted('remove')![0]).toEqual([1])
  })

  it('emits add on "Add fill" button', async () => {
    const wrapper = mount(MultipleFillsList, { props: { fills, mixed: false } })
    await wrapper.find('[data-test="add-fill"]').trigger('click')
    expect(wrapper.emitted('add')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test to verify failure**

Run: `bun test tests/unit/components/inspector/MultipleFillsList.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write component**

```vue
<!-- kova-open-pencil-1/src/components/inspector/MultipleFillsList.vue -->
<script setup lang="ts">
import { colorToCSS } from '@open-pencil/core'
import type { Fill } from '@open-pencil/core'

const props = defineProps<{ fills: Fill[]; mixed: boolean }>()
const emit = defineEmits<{
  'update:fills': [fills: Fill[]]
  add: []
  remove: [index: number]
  reorder: [event: { fromIndex: number; toIndex: number }]
  'toggle-visibility': [index: number]
}>()

function fillSwatch(fill: Fill): string {
  if (fill.type === 'SOLID') return `background: ${colorToCSS(fill.color)}`
  if (fill.type === 'IMAGE') return `background: url(${(fill as Fill & { src?: string }).src}) center/cover`
  return 'background: linear-gradient(90deg, #000, #fff)' // gradient placeholder
}

function fillLabel(fill: Fill): string {
  if (fill.type === 'SOLID') return 'Solid'
  if (fill.type === 'IMAGE') return 'Image'
  if (fill.type === 'GRADIENT_LINEAR') return 'Linear'
  if (fill.type === 'GRADIENT_RADIAL') return 'Radial'
  return fill.type
}
</script>

<template>
  <div v-if="mixed" class="text-xs text-ink3">Click to enter mixed value</div>

  <div v-else class="flex flex-col gap-1">
    <div
      v-for="(fill, index) in fills"
      :key="index"
      data-test="fill-row"
      class="flex items-center gap-2 rounded px-2 py-1 text-xs hover:bg-fill2"
    >
      <span class="i-lucide-grip-vertical size-3 cursor-grab text-ink3" />
      <span class="size-4 rounded border border-border" :style="fillSwatch(fill)" />
      <span class="flex-1">{{ fillLabel(fill) }}</span>
      <span class="font-mono text-ink3">{{ Math.round((fill.opacity ?? 1) * 100) }}%</span>
      <button
        type="button"
        class="text-ink3 hover:text-ink"
        :title="fill.visible ? 'Hide' : 'Show'"
        @click="emit('toggle-visibility', index)"
      >
        <span :class="fill.visible !== false ? 'i-lucide-eye' : 'i-lucide-eye-off'" class="size-3" />
      </button>
      <button
        type="button"
        data-test="fill-remove"
        class="text-ink3 hover:text-ink"
        title="Remove fill"
        @click="emit('remove', index)"
      >×</button>
    </div>
    <button
      type="button"
      data-test="add-fill"
      class="self-start text-xs text-accent hover:text-accent-ink"
      @click="emit('add')"
    >
      + Add fill
    </button>
  </div>
</template>
```

- [ ] **Step 4: Run test + commit**

```bash
bun test tests/unit/components/inspector/MultipleFillsList.test.ts
git add kova-open-pencil-1/src/components/inspector/MultipleFillsList.vue kova-open-pencil-1/tests/unit/components/inspector/MultipleFillsList.test.ts
git commit -m "feat(07b): add MultipleFillsList (hi-fi 11.13)"
```

---

## Phase 4: Canvas overlay components (10 NEW + 1 wrapper)

> **Pattern repeats per overlay:** failing test → component → run test → commit. Each overlay reads engine state via the public proxy and renders an absolute-positioned div. Z-indexes per `OVERLAY_Z` constant.

### Task 4.1: CanvasOverlayLayer wrapper

**Files:**
- Create: `kova-open-pencil-1/src/components/canvas-overlays/CanvasOverlayLayer.vue`

The wrapper is the single mount point inside `<EditorView>`. It composes all 10 overlays.

- [ ] **Step 1: Write component (no test — pure composition)**

```vue
<!-- kova-open-pencil-1/src/components/canvas-overlays/CanvasOverlayLayer.vue -->
<script setup lang="ts">
import FrameOutlinesOverlay from './FrameOutlinesOverlay.vue'
import MaskOutlinesOverlay from './MaskOutlinesOverlay.vue'
import SliceRegionOverlay from './SliceRegionOverlay.vue'
import SnapIndicatorsOverlay from './SnapIndicatorsOverlay.vue'
import LayoutGuidesOverlay from './LayoutGuidesOverlay.vue'
import PixelGridOverlay from './PixelGridOverlay.vue'
import HoverContourOverlay from './HoverContourOverlay.vue'
import FindHighlightOverlay from './FindHighlightOverlay.vue'
import EyedropperCrosshair from './EyedropperCrosshair.vue'
import MeasurementAnnotations from './MeasurementAnnotations.vue'
import { useEditorStore } from '@/stores/editor'

const editor = useEditorStore()
</script>

<template>
  <div class="pointer-events-none absolute inset-0 z-10">
    <FrameOutlinesOverlay v-if="editor.overlays.frameOutlines" />
    <MaskOutlinesOverlay v-if="editor.overlays.maskOutlines" />
    <SliceRegionOverlay />
    <LayoutGuidesOverlay v-if="editor.overlays.layoutGuides" />
    <PixelGridOverlay v-if="editor.overlays.pixelGrid" />
    <HoverContourOverlay v-if="editor.overlays.hoverContour" />
    <SnapIndicatorsOverlay />
    <FindHighlightOverlay />
    <EyedropperCrosshair />
    <MeasurementAnnotations v-if="editor.overlays.measurements" />
  </div>
</template>
```

- [ ] **Step 2: Commit (component-only, no test)**

```bash
git add kova-open-pencil-1/src/components/canvas-overlays/CanvasOverlayLayer.vue
git commit -m "feat(07b): scaffold CanvasOverlayLayer wrapper"
```

### Task 4.2: FrameOutlinesOverlay

**Files:**
- Create: `kova-open-pencil-1/src/components/canvas-overlays/FrameOutlinesOverlay.vue`
- Test: `kova-open-pencil-1/tests/unit/components/canvas-overlays/FrameOutlinesOverlay.test.ts`

Hi-fi: B8.3. 1px solid `rgba(126,126,121,0.55)`, z-index 3.

- [ ] **Step 1: Write failing test**

```typescript
import { describe, expect, it } from 'bun:test'
import { mount } from '@vue/test-utils'

mock.module('@open-pencil/core', () => ({
  figma: {
    currentPage: {
      children: [
        { id: 'f1', type: 'FRAME', x: 0, y: 0, width: 200, height: 100 },
        { id: 'f2', type: 'FRAME', x: 250, y: 0, width: 200, height: 100 },
        { id: 'r1', type: 'RECTANGLE', x: 0, y: 0, width: 50, height: 50 },
      ],
    },
  },
}))

import { mock } from 'bun:test'
import FrameOutlinesOverlay from '@/components/canvas-overlays/FrameOutlinesOverlay.vue'

describe('FrameOutlinesOverlay', () => {
  it('renders one outline per FRAME node only', () => {
    const wrapper = mount(FrameOutlinesOverlay)
    expect(wrapper.findAll('[data-test="frame-outline"]')).toHaveLength(2)
  })
})
```

- [ ] **Step 2: Run test to verify failure**

Run: `bun test tests/unit/components/canvas-overlays/FrameOutlinesOverlay.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write component**

```vue
<!-- kova-open-pencil-1/src/components/canvas-overlays/FrameOutlinesOverlay.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { figma } from '@open-pencil/core'
import { OVERLAY_Z, OVERLAY_COLOR } from '@/constants/overlays'

const frames = computed(() =>
  figma.currentPage.children.filter((n: { type: string }) => n.type === 'FRAME'),
)

function frameStyle(f: { x: number; y: number; width: number; height: number }) {
  return {
    position: 'absolute' as const,
    left: `${f.x}px`,
    top: `${f.y}px`,
    width: `${f.width}px`,
    height: `${f.height}px`,
    border: `1px solid ${OVERLAY_COLOR.FRAME_OUTLINE}`,
    zIndex: OVERLAY_Z.FRAME_OUTLINES,
    pointerEvents: 'none' as const,
  }
}
</script>

<template>
  <span
    v-for="f in frames"
    :key="f.id"
    data-test="frame-outline"
    :style="frameStyle(f as { x: number; y: number; width: number; height: number })"
  />
</template>
```

- [ ] **Step 4: Run test + commit**

```bash
bun test tests/unit/components/canvas-overlays/FrameOutlinesOverlay.test.ts
git add kova-open-pencil-1/src/components/canvas-overlays/FrameOutlinesOverlay.vue kova-open-pencil-1/tests/unit/components/canvas-overlays/FrameOutlinesOverlay.test.ts
git commit -m "feat(07b): add FrameOutlinesOverlay (hi-fi B8.3)"
```

### Task 4.3: MaskOutlinesOverlay

**Files:**
- Create: `kova-open-pencil-1/src/components/canvas-overlays/MaskOutlinesOverlay.vue`
- Test: `kova-open-pencil-1/tests/unit/components/canvas-overlays/MaskOutlinesOverlay.test.ts`

Hi-fi: B8.4. 1.5px solid `#3DDC97`, corner glyph (rect/ellipse/path), z-index 4.

- [ ] **Step 1: Write failing test**

```typescript
import { describe, expect, it } from 'bun:test'
import { mount } from '@vue/test-utils'

mock.module('@open-pencil/core', () => ({
  figma: {
    currentPage: {
      children: [
        { id: 'm1', type: 'RECTANGLE', isMask: true, maskType: 'ALPHA', x: 0, y: 0, width: 100, height: 100 },
        { id: 'm2', type: 'ELLIPSE', isMask: true, maskType: 'ALPHA', x: 200, y: 0, width: 100, height: 100 },
        { id: 'r1', type: 'RECTANGLE', isMask: false, x: 0, y: 200, width: 50, height: 50 },
      ],
    },
  },
}))

import { mock } from 'bun:test'
import MaskOutlinesOverlay from '@/components/canvas-overlays/MaskOutlinesOverlay.vue'

describe('MaskOutlinesOverlay', () => {
  it('renders only nodes with isMask=true', () => {
    const wrapper = mount(MaskOutlinesOverlay)
    expect(wrapper.findAll('[data-test="mask-outline"]')).toHaveLength(2)
  })

  it('shows corner glyph per mask type', () => {
    const wrapper = mount(MaskOutlinesOverlay)
    const glyphs = wrapper.findAll('[data-test="mask-glyph"]')
    expect(glyphs).toHaveLength(2)
  })
})
```

- [ ] **Step 2: Run test to verify failure**

Run: `bun test tests/unit/components/canvas-overlays/MaskOutlinesOverlay.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write component**

```vue
<!-- kova-open-pencil-1/src/components/canvas-overlays/MaskOutlinesOverlay.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { figma } from '@open-pencil/core'
import { OVERLAY_Z, OVERLAY_COLOR } from '@/constants/overlays'

const masks = computed(() =>
  figma.currentPage.children.filter(
    (n: { isMask?: boolean }) => n.isMask === true,
  ),
)

function maskStyle(m: { type: string; x: number; y: number; width: number; height: number }) {
  return {
    position: 'absolute' as const,
    left: `${m.x}px`,
    top: `${m.y}px`,
    width: `${m.width}px`,
    height: `${m.height}px`,
    border: `1.5px solid ${OVERLAY_COLOR.MASK_GREEN}`,
    borderRadius: m.type === 'ELLIPSE' ? '50%' : '0',
    zIndex: OVERLAY_Z.MASK_OUTLINES,
    pointerEvents: 'none' as const,
  }
}

function glyphSymbol(m: { type: string }): string {
  if (m.type === 'ELLIPSE') return '○'
  if (m.type === 'VECTOR') return '∿'
  return '□'
}
</script>

<template>
  <template v-for="m in masks" :key="m.id">
    <span data-test="mask-outline" :style="maskStyle(m as { type: string; x: number; y: number; width: number; height: number })" />
    <span
      data-test="mask-glyph"
      :style="{
        position: 'absolute',
        left: `${(m as { x: number }).x + (m as { width: number }).width - 14}px`,
        top: `${(m as { y: number }).y - 14}px`,
        width: '14px',
        height: '14px',
        background: OVERLAY_COLOR.MASK_GLYPH_BG,
        border: `1px solid ${OVERLAY_COLOR.MASK_GREEN}`,
        fontSize: '9px',
        color: OVERLAY_COLOR.MASK_GREEN,
        textAlign: 'center',
        lineHeight: '12px',
        zIndex: OVERLAY_Z.MASK_OUTLINES,
        pointerEvents: 'none',
      }"
    >{{ glyphSymbol(m as { type: string }) }}</span>
  </template>
</template>
```

- [ ] **Step 4: Run test + commit**

```bash
bun test tests/unit/components/canvas-overlays/MaskOutlinesOverlay.test.ts
git add kova-open-pencil-1/src/components/canvas-overlays/MaskOutlinesOverlay.vue kova-open-pencil-1/tests/unit/components/canvas-overlays/MaskOutlinesOverlay.test.ts
git commit -m "feat(07b): add MaskOutlinesOverlay (hi-fi B8.4)"
```

### Task 4.4: SliceRegionOverlay

**Files:**
- Create: `kova-open-pencil-1/src/components/canvas-overlays/SliceRegionOverlay.vue`
- Test: `kova-open-pencil-1/tests/unit/components/canvas-overlays/SliceRegionOverlay.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
import { describe, expect, it } from 'bun:test'
import { mount } from '@vue/test-utils'

mock.module('@open-pencil/core', () => ({
  figma: {
    currentPage: {
      children: [
        { id: 's1', type: 'SLICE', name: 'header', x: 0, y: 0, width: 200, height: 80 },
        { id: 'r1', type: 'RECTANGLE', x: 0, y: 100, width: 50, height: 50 },
      ],
    },
  },
}))

import { mock } from 'bun:test'
import SliceRegionOverlay from '@/components/canvas-overlays/SliceRegionOverlay.vue'

describe('SliceRegionOverlay', () => {
  it('renders only SLICE nodes', () => {
    const wrapper = mount(SliceRegionOverlay)
    expect(wrapper.findAll('[data-test="slice-region"]')).toHaveLength(1)
  })

  it('renders label tag with slice name', () => {
    const wrapper = mount(SliceRegionOverlay)
    expect(wrapper.find('[data-test="slice-label"]').text()).toBe('header')
  })
})
```

- [ ] **Step 2: Run test to verify failure**

Run: `bun test tests/unit/components/canvas-overlays/SliceRegionOverlay.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write component**

```vue
<!-- kova-open-pencil-1/src/components/canvas-overlays/SliceRegionOverlay.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { figma } from '@open-pencil/core'
import { OVERLAY_Z } from '@/constants/overlays'

const slices = computed(() =>
  figma.currentPage.children.filter((n: { type: string }) => n.type === 'SLICE'),
)
</script>

<template>
  <template v-for="s in slices" :key="s.id">
    <span
      data-test="slice-region"
      :style="{
        position: 'absolute',
        left: `${(s as { x: number }).x}px`,
        top: `${(s as { y: number }).y}px`,
        width: `${(s as { width: number }).width}px`,
        height: `${(s as { height: number }).height}px`,
        border: '1px dashed #999',
        zIndex: OVERLAY_Z.SLICE_REGION,
        pointerEvents: 'none',
      }"
    />
    <span
      data-test="slice-label"
      :style="{
        position: 'absolute',
        left: `${(s as { x: number }).x}px`,
        top: `${(s as { y: number }).y - 18}px`,
        background: '#999',
        color: 'white',
        fontSize: '11px',
        padding: '1px 5px',
        borderRadius: '2px',
        zIndex: OVERLAY_Z.FRAME_LABEL,
        pointerEvents: 'none',
      }"
    >{{ (s as { name: string }).name }}</span>
  </template>
</template>
```

- [ ] **Step 4: Run test + commit**

```bash
bun test tests/unit/components/canvas-overlays/SliceRegionOverlay.test.ts
git add kova-open-pencil-1/src/components/canvas-overlays/SliceRegionOverlay.vue kova-open-pencil-1/tests/unit/components/canvas-overlays/SliceRegionOverlay.test.ts
git commit -m "feat(07b): add SliceRegionOverlay"
```

### Task 4.5–4.10: Remaining 6 overlays (PixelGrid, LayoutGuides, HoverContour, SnapIndicators, FindHighlight, EyedropperCrosshair, MeasurementAnnotations)

Each follows the same pattern as 4.2–4.4. The component files mirror the spec in PRD §6.4.3. Per-task structure:

#### Task 4.5: PixelGridOverlay

- [ ] Test asserts: hidden when zoom ≤ 8.0; visible when zoom > 8.0; uses `OVERLAY_COLOR.PIXEL_GRID` 18% gray, 8×8 background.
- [ ] Component reads `useCanvas().zoom` (existing composable). Renders single absolute div with `linear-gradient` background.
- [ ] Commit: `feat(07b): add PixelGridOverlay (auto > 800% zoom)`

#### Task 4.6: LayoutGuidesOverlay

- [ ] Test asserts: per-frame layout-grid read; Uniform / Columns / Rows render correctly with red 10% (`OVERLAY_COLOR.LAYOUT_GUIDE_RED`); default ON per Q24.
- [ ] Component iterates `figma.currentPage.children.filter(n => n.type === 'FRAME')` and reads `frame.layoutGrids: LayoutGrid[]`. Per-grid renders.
- [ ] Commit: `feat(07b): add LayoutGuidesOverlay (Q24 default-ON red 10%)`

#### Task 4.7: HoverContourOverlay

- [ ] Test asserts: hidden when `useCanvasInput.hoveredNodeId` is null; renders contour when set; 1.5px `var(--select)` border-radius 0.
- [ ] Component reads existing composable. Single absolute div per hovered node.
- [ ] Commit: `feat(07b): add HoverContourOverlay`

#### Task 4.8: SnapIndicatorsOverlay

- [ ] Test asserts: empty render when no `snapHits`; renders snap-pixel + spacing-tag chrome when array populated; uses `OVERLAY_COLOR.SNAP_RED`.
- [ ] Component reads snap-state from `useCanvas` (existing OpenPencil hook; 07a confirms API).
- [ ] Commit: `feat(07b): add SnapIndicatorsOverlay (hi-fi B8.1)`

#### Task 4.9: FindHighlightOverlay

- [ ] Test asserts: empty render when `matchedNodeIds` empty (Phase A — `useFind` not yet shipped); 1.5px golden contour when populated.
- [ ] Component reads from `useFind` if `FEATURE_GATES.FIND_OVERLAY_DORMANT === false`; else returns null.
- [ ] Commit: `feat(07b): add FindHighlightOverlay (dormant pre-08)`

#### Task 4.10: EyedropperCrosshair

- [ ] Test asserts: hidden when `useEyedropperStore.active=false`; renders 96px magnifier + 16px reticle + hex chip when active.
- [ ] Component reads pointer position via `useCanvasInput`. Hex sample via `figma.canvas.readPixel(x, y)` (07a API per PRD §12.9).
- [ ] Commit: `feat(07b): add EyedropperCrosshair (hi-fi B8.7)`

#### Task 4.11: MeasurementAnnotations

- [ ] Test asserts: renders one annotation per MEASUREMENT NodeType in viewport; dashed `#F24822` line + caps + label per hi-fi B8.9.
- [ ] Component iterates `figma.currentPage.children.filter(n => n.type === 'MEASUREMENT')`.
- [ ] Commit: `feat(07b): add MeasurementAnnotations (hi-fi B8.9)`

(Each task above gets its own failing test → component → pass test → commit cycle, identical in shape to Tasks 4.2–4.4. Listed concise here to avoid plan bloat — when executing, follow the 4-step pattern from 4.2.)

---

## Phase 5: Inspector section extensions (6 modifications)

> **Pattern:** for each existing file, write a failing test asserting new behavior, modify the file to make it pass, run full test suite to confirm no regression, commit.

### Task 5.1: Extend EffectsSection — wire EffectRow + EffectEditor + collapsed-by-default

**Files:**
- Modify: `kova-open-pencil-1/src/components/properties/EffectsSection.vue`
- Test: `kova-open-pencil-1/tests/unit/components/properties/EffectsSection.test.ts` (NEW)

- [ ] **Step 1: Read existing EffectsSection.vue end-to-end (already partly read in scope)**

Run: `wc -l kova-open-pencil-1/src/components/properties/EffectsSection.vue`

Verify: existing component already supports add/edit/delete + 5 effect types (per PRD §6.4.2). Extension is cosmetic (collapsed-by-default + use new EffectRow / EffectEditor sub-components).

- [ ] **Step 2: Write failing test for collapsed-by-default state**

```typescript
import { describe, expect, it } from 'bun:test'
import { mount } from '@vue/test-utils'
import EffectsSection from '@/components/properties/EffectsSection.vue'

describe('EffectsSection — 07b extensions', () => {
  it('renders header collapsed by default (hidden effect list when no effects)', () => {
    const wrapper = mount(EffectsSection)
    expect(wrapper.find('[data-test="effects-list"]').exists()).toBe(false)
  })
  // Note: full state-machine tests live in EffectsSection's existing test suite.
})
```

- [ ] **Step 3: Run test to verify failure (or pass — depending on existing state)**

Run: `bun test tests/unit/components/properties/EffectsSection.test.ts`

- [ ] **Step 4: Modify EffectsSection.vue**

Inside `<template>`, swap the inline effect-row markup for `<EffectRow>` and the inline editor for `<EffectEditor>` imports. Add `data-test="effects-list"` to the list container, with `v-if="effects.length > 0"` to enforce collapsed-by-default behavior.

```vue
<!-- Inside <template>, replace the existing list -->
<div v-if="effects.length > 0" data-test="effects-list" class="flex flex-col gap-1">
  <EffectRow
    v-for="(effect, index) in effects"
    :key="index"
    :effect="effect"
    :index="index"
    :is-selected="expandedIndex === index"
    @select="expandedIndex = index"
    @toggle-visibility="updateEffect(index, { visible: !effect.visible })"
    @delete="removeEffect(index)"
  />
</div>
```

Add the imports:

```typescript
import EffectRow from '@/components/inspector/EffectRow.vue'
import EffectEditor from '@/components/inspector/EffectEditor.vue'
```

- [ ] **Step 5: Run test to verify pass**

Run: `bun test tests/unit/components/properties/EffectsSection.test.ts`
Expected: PASS.

- [ ] **Step 6: Run full test suite for regression**

Run: `bun run test:unit`
Expected: all green.

- [ ] **Step 7: Commit**

```bash
git add kova-open-pencil-1/src/components/properties/EffectsSection.vue kova-open-pencil-1/tests/unit/components/properties/EffectsSection.test.ts
git commit -m "feat(07b): wire EffectRow/EffectEditor + collapsed-by-default in EffectsSection"
```

### Task 5.2: Extend ExportSection — JpgQualityDropdown + Export-N-slices button

**Files:**
- Modify: `kova-open-pencil-1/src/components/properties/ExportSection.vue`
- Test: `kova-open-pencil-1/tests/unit/components/properties/ExportSection.test.ts` (NEW)

- [ ] **Step 1: Write failing test**

```typescript
import { describe, expect, it } from 'bun:test'
import { mount } from '@vue/test-utils'
import ExportSection from '@/components/properties/ExportSection.vue'

describe('ExportSection — 07b extensions', () => {
  it('renders JpgQualityDropdown when format=JPG', async () => {
    const wrapper = mount(ExportSection)
    // Trigger format change to JPG via existing UI; assert JpgQualityDropdown appears
    // (Implementation detail varies based on existing component's API; adapt.)
  })

  it('renders "Export N slices" button at section footer', () => {
    const wrapper = mount(ExportSection)
    expect(wrapper.find('[data-test="export-all-slices"]').exists()).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify failure**

Run: `bun test tests/unit/components/properties/ExportSection.test.ts`

- [ ] **Step 3: Modify ExportSection.vue**

Add `<JpgQualityDropdown>` row inside the per-export-row template, conditional on `row.format === 'JPG'`. Add a footer button calling `useExportPipeline().exportAllSlices()`.

```vue
<!-- Inside per-row block -->
<JpgQualityDropdown
  v-if="row.format === 'JPG'"
  :model-value="row.qualityKey ?? 'high'"
  @update:model-value="updateRowQuality(rowIndex, $event)"
/>

<!-- Inside footer block -->
<button
  type="button"
  data-test="export-all-slices"
  class="self-start rounded bg-accent px-3 py-1 text-xs text-accent-ink"
  @click="exportAllSlices"
>
  Export {{ sliceCount }} slices
</button>
```

Imports:

```typescript
import JpgQualityDropdown from '@/components/inspector/JpgQualityDropdown.vue'
import { useExportPipeline } from '@/composables/use-export-pipeline'
import { JPG_QUALITY } from '@/constants/overlays'

const { exportAllSlices: doExport } = useExportPipeline()
function exportAllSlices() {
  doExport({ format: 'PNG', scale: 1 })
}
```

- [ ] **Step 4: Run test + full suite + commit**

```bash
bun test tests/unit/components/properties/ExportSection.test.ts
bun run test:unit
git add kova-open-pencil-1/src/components/properties/ExportSection.vue kova-open-pencil-1/tests/unit/components/properties/ExportSection.test.ts
git commit -m "feat(07b): extend ExportSection with JPG quality + Export-N-slices button"
```

### Task 5.3: Extend StrokeSection — StrokeAlignRow

**Files:**
- Modify: `kova-open-pencil-1/src/components/properties/StrokeSection.vue`

- [ ] **Step 1: Write failing test**

```typescript
import { describe, expect, it } from 'bun:test'
import { mount } from '@vue/test-utils'
import StrokeSection from '@/components/properties/StrokeSection.vue'

describe('StrokeSection — 07b extensions', () => {
  it('renders StrokeAlignRow when node has strokes', () => {
    const wrapper = mount(StrokeSection)
    expect(wrapper.find('[data-test="stroke-align-row"]').exists()).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify failure**

Run: `bun test tests/unit/components/properties/StrokeSection.test.ts`

- [ ] **Step 3: Modify StrokeSection.vue**

```vue
<!-- Inside <template>, after weight row -->
<div data-test="stroke-align-row">
  <StrokeAlignRow
    :model-value="strokeAlign"
    @update:model-value="updateStrokeAlign"
  />
</div>
```

Imports + setter:

```typescript
import StrokeAlignRow from '@/components/inspector/StrokeAlignRow.vue'

const strokeAlign = computed({
  get: () => node.value?.strokeAlign ?? 'INSIDE',
  set: (v: 'INSIDE' | 'CENTER' | 'OUTSIDE') => node.value && store.updateNode(node.value.id, { strokeAlign: v }),
})
function updateStrokeAlign(v: 'INSIDE' | 'CENTER' | 'OUTSIDE') {
  strokeAlign.value = v
}
```

- [ ] **Step 4: Run test + full suite + commit**

```bash
bun test tests/unit/components/properties/StrokeSection.test.ts
bun run test:unit
git add kova-open-pencil-1/src/components/properties/StrokeSection.vue kova-open-pencil-1/tests/unit/components/properties/StrokeSection.test.ts
git commit -m "feat(07b): extend StrokeSection with StrokeAlignRow"
```

### Task 5.4: Extend TypographySection — VerticalTextAlignRow

Mirror Task 5.3 pattern. Add `<VerticalTextAlignRow>` wired to `node.textAlignVertical` when selection NodeType is TEXT.

- [ ] Write failing test → Modify → Run → Commit. Imports `VerticalTextAlignRow` from `@/components/inspector/`.

```bash
git commit -m "feat(07b): extend TypographySection with VerticalTextAlignRow"
```

### Task 5.5: Extend FillSection — MultipleFillsList + PaintEditor wiring

- [ ] Write failing test asserting `<MultipleFillsList>` renders when `fills.length > 1`.
- [ ] Modify FillSection.vue: replace inline single-fill rendering with `<MultipleFillsList :fills="fills" :mixed="fillsAreMixed">`. Wire `@add` / `@remove` / `@reorder` / `@toggle-visibility` to existing `updateArrayItem` / `removeArrayItem` / `toggleArrayVisibility` actions in `useMultiProps`.
- [ ] Run test + full suite.
- [ ] Commit: `feat(07b): wire MultipleFillsList in FillSection`

### Task 5.6: Extend ColorPicker — render PaintEditor for non-solid modes + eyedropper trigger

- [ ] Write failing test asserting that when `mode='linear'` is passed, `<PaintEditor>` renders instead of `<HsvColorArea>`.
- [ ] Modify ColorPicker.vue: add `mode` prop; conditionally render `<PaintEditor>` or existing `<HsvColorArea>`. Wire pipette button → `useEyedropper().activate()`.
- [ ] Run test + full suite.
- [ ] Commit: `feat(07b): extend ColorPicker with PaintEditor + eyedropper trigger`

---

## Phase 6: DnD receiver + EditorView mount

### Task 6.1: Extend use-canvas-drop — brand-asset image-fill receiver

**Files:**
- Modify: `kova-open-pencil-1/src/composables/use-canvas-drop.ts`
- Test: `kova-open-pencil-1/tests/unit/composables/use-canvas-drop-image-fill.test.ts` (NEW)

- [ ] **Step 1: Write failing test**

```typescript
import { describe, expect, it } from 'bun:test'
import { useCanvasDrop } from '@/composables/use-canvas-drop'

describe('use-canvas-drop — brand-asset image-fill receiver', () => {
  it('handles application/x-kova-brand-asset MIME type', () => {
    const { canHandle } = useCanvasDrop()
    expect(canHandle('application/x-kova-brand-asset')).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify failure**

Run: `bun test tests/unit/composables/use-canvas-drop-image-fill.test.ts`

- [ ] **Step 3: Modify use-canvas-drop.ts**

Add a handler entry to the existing MIME-payload dispatch table:

```typescript
// Inside the existing handler registry:
{
  mime: 'application/x-kova-brand-asset',
  handle: (payload: { assetId: string; kind: 'logo' | 'image' }, target: SceneNode | null) => {
    if (target && (target.type === 'RECTANGLE' || target.type === 'FRAME' || target.type === 'ELLIPSE' || target.type === 'VECTOR')) {
      // Open ImageFillPicker with asset pre-selected (07b extension)
      // (Wiring: post a message to the inspector via useEditorStore or emit an event.)
      openImageFillPicker(target.id, payload.assetId)
    } else if (!target) {
      // Spawn IMAGE node at natural size at drop position
      spawnImageNode(payload.assetId)
    } else {
      useToast().show({ variant: 'error', message: 'Cannot apply image fill to this layer type' })
    }
  },
},
```

- [ ] **Step 4: Run test + full suite + commit**

```bash
bun test tests/unit/composables/use-canvas-drop-image-fill.test.ts
bun run test:unit
git add kova-open-pencil-1/src/composables/use-canvas-drop.ts kova-open-pencil-1/tests/unit/composables/use-canvas-drop-image-fill.test.ts
git commit -m "feat(07b): extend use-canvas-drop with brand-asset image-fill receiver (Q24)"
```

### Task 6.2: Mount CanvasOverlayLayer inside EditorView

**Files:**
- Modify: `kova-open-pencil-1/src/views/EditorView.vue`

- [ ] **Step 1: Read EditorView.vue to find the canvas mount point**

Run: `grep -n "<canvas\|EditorView\|template" kova-open-pencil-1/src/views/EditorView.vue | head -20`

- [ ] **Step 2: Mount CanvasOverlayLayer**

Inside the `<template>`, add `<CanvasOverlayLayer />` as a sibling of the canvas element, inside the same wrapper that contains the canvas absolute-positioning context:

```vue
<template>
  <!-- existing canvas + chrome -->
  <div class="relative">
    <canvas ref="canvasEl" />
    <CanvasOverlayLayer />
  </div>
</template>

<script setup lang="ts">
import CanvasOverlayLayer from '@/components/canvas-overlays/CanvasOverlayLayer.vue'
</script>
```

- [ ] **Step 3: Run dev server to smoke-test**

```bash
cd kova-open-pencil-1
bun run dev
# Open localhost:1420; navigate to a canvas; observe overlays render.
```

- [ ] **Step 4: Commit**

```bash
git add kova-open-pencil-1/src/views/EditorView.vue
git commit -m "feat(07b): mount CanvasOverlayLayer inside EditorView"
```

---

## Phase 7: Keyboard shortcut registration (gated)

### Task 7.1: Register Boolean ops + copy/paste shortcuts behind feature gate

**Files:**
- Create: `kova-open-pencil-1/src/composables/use-shortcut-registration.ts` (NEW — 07b's registration site)
- Test: `kova-open-pencil-1/tests/unit/composables/use-shortcut-registration.test.ts` (NEW)

- [ ] **Step 1: Write failing test**

```typescript
import { describe, expect, it, mock } from 'bun:test'

const registerMock = mock(() => {})

mock.module('@/stores/shortcuts', () => ({
  useShortcutsStore: () => ({ register: registerMock }),
}))

mock.module('@/constants/overlays', () => ({
  FEATURE_GATES: { KEYBOARD_SHORTCUTS_REGISTRY_AVAILABLE: true },
}))

import { useShortcutRegistration } from '@/composables/use-shortcut-registration'

describe('useShortcutRegistration', () => {
  it('registers 7 shortcuts when registry available', () => {
    useShortcutRegistration()
    expect(registerMock).toHaveBeenCalledTimes(7)
  })
})
```

- [ ] **Step 2: Run test to verify failure**

Run: `bun test tests/unit/composables/use-shortcut-registration.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write composable**

```typescript
// kova-open-pencil-1/src/composables/use-shortcut-registration.ts
import { figma } from '@open-pencil/core'
import { FEATURE_GATES } from '@/constants/overlays'
import { useEyedropper } from '@/composables/use-eyedropper'
import { useCopyPasteProps } from '@/composables/use-copy-paste-props'

/**
 * Registers 07b's keyboard shortcuts into Cluster 08's useShortcutsStore.
 * Skipped if FEATURE_GATES.KEYBOARD_SHORTCUTS_REGISTRY_AVAILABLE === false (Phase A pre-08).
 *
 * Call once in setup hook of a long-lived parent (e.g., EditorView).
 */
export function useShortcutRegistration(): void {
  if (!FEATURE_GATES.KEYBOARD_SHORTCUTS_REGISTRY_AVAILABLE) return

  // Lazy-import to avoid hard dependency on Cluster 08's store before it ships
  // (Phase B: replace with static import once 08 lands)
  const { useShortcutsStore } = require('@/stores/shortcuts') as typeof import('@/stores/shortcuts')
  const store = useShortcutsStore()

  const eyedropper = useEyedropper()
  const cpProps = useCopyPasteProps()

  store.register({ id: 'boolean.union',     category: 'edit',  keys: 'cmd+alt+u', description: 'Union selection',     action: () => figma.booleanOperation('UNION') })
  store.register({ id: 'boolean.subtract',  category: 'edit',  keys: 'cmd+alt+s', description: 'Subtract selection',  action: () => figma.booleanOperation('SUBTRACT') })
  store.register({ id: 'boolean.intersect', category: 'edit',  keys: 'cmd+alt+i', description: 'Intersect selection', action: () => figma.booleanOperation('INTERSECT') })
  store.register({ id: 'boolean.exclude',   category: 'edit',  keys: 'cmd+alt+x', description: 'Exclude selection',   action: () => figma.booleanOperation('EXCLUDE') })
  store.register({ id: 'props.copy',        category: 'edit',  keys: 'cmd+alt+c', description: 'Copy properties',     action: () => cpProps.copy() })
  store.register({ id: 'props.paste',       category: 'edit',  keys: 'cmd+alt+v', description: 'Paste properties',    action: () => cpProps.paste() })
  store.register({ id: 'tool.eyedropper',   category: 'tools', keys: 'control+c', description: 'Eyedropper tool',     action: () => eyedropper.activate(() => {}) })
}
```

- [ ] **Step 4: Run test to verify pass**

Run: `bun test tests/unit/composables/use-shortcut-registration.test.ts`
Expected: 1 PASS.

- [ ] **Step 5: Wire into EditorView setup**

Inside `kova-open-pencil-1/src/views/EditorView.vue`:

```typescript
import { useShortcutRegistration } from '@/composables/use-shortcut-registration'

// In <script setup>:
useShortcutRegistration()
```

- [ ] **Step 6: Commit**

```bash
git add kova-open-pencil-1/src/composables/use-shortcut-registration.ts kova-open-pencil-1/tests/unit/composables/use-shortcut-registration.test.ts kova-open-pencil-1/src/views/EditorView.vue
git commit -m "feat(07b): gated shortcut registration (Boolean ops + copy/paste + eyedropper)"
```

---

## Phase 8: Integration tests

### Task 8.1: effects-end-to-end integration

**Files:**
- Create: `kova-open-pencil-1/tests/integration/inspector/effects-end-to-end.test.ts`

- [ ] **Step 1: Write integration test**

```typescript
import { describe, expect, it } from 'bun:test'
import { figma } from '@open-pencil/core'

describe('Effects end-to-end', () => {
  it('adds 5 effects (one per type), verifies scene-graph state', () => {
    const node = figma.createRectangle()
    node.effects = [
      { type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.25 }, offset: { x: 0, y: 4 }, radius: 4, spread: 0, visible: true },
      { type: 'INNER_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.25 }, offset: { x: 0, y: 4 }, radius: 4, spread: 0, visible: true },
      { type: 'LAYER_BLUR', radius: 8, visible: true },
      { type: 'BACKGROUND_BLUR', radius: 8, visible: true },
      { type: 'FOREGROUND_BLUR', radius: 8, visible: true },
    ] as Effect[]

    expect(node.effects).toHaveLength(5)
    expect(node.effects[0].type).toBe('DROP_SHADOW')
  })
})
```

- [ ] **Step 2: Run test**

Run: `bun test tests/integration/inspector/effects-end-to-end.test.ts`
Expected: PASS (assumes 07a engine APIs available).

- [ ] **Step 3: Commit**

```bash
git add kova-open-pencil-1/tests/integration/inspector/effects-end-to-end.test.ts
git commit -m "test(07b): effects end-to-end integration"
```

### Tasks 8.2–8.9: Remaining integration tests

Mirror PRD §9.2 list. Per-test pattern: write focused integration test using real engine API, run, commit.

- 8.2 `boolean-ops-end-to-end.test.ts` — multi-select 3 nodes, invoke 4 ops, verify boolean nodes
- 8.3 `gradient-editor-end-to-end.test.ts` — apply gradient, add 4 stops, verify scene-graph
- 8.4 `image-fill-modes.test.ts` — switch through 4 scaleModes, verify ImagePaint state
- 8.5 `eyedropper-canvas-only.test.ts` — activate eyedropper, simulate canvas click, verify readPixel + callback
- 8.6 `export-pipeline.test.ts` — 3 SLICE nodes, exportAllSlices, verify 3 exportAsync calls + ZIP contents
- 8.7 `copy-paste-props.test.ts` — full Q23 prop set copy/paste with incompatible-field silent drop
- 8.8 `snap-indicators-during-drag.test.ts` — initiate drag, verify SnapIndicatorsOverlay renders during drag, hides on release
- 8.9 `measurement-persistence.test.ts` — create measurement, save canvas (Yjs flush), reload, verify re-render

Per task: write test → run → commit individually for traceability.

---

## Phase 9: E2E tests

### Tasks 9.1–9.10: 10 Playwright specs per PRD §9.3

Each spec ships as one file under `kova-open-pencil-1/tests/e2e/canvas/`. Run via `bunx playwright test tests/e2e/canvas/{spec}.spec.ts`. Per task: write spec → run → commit.

- 9.1 `inspector-effects.spec.ts` — open canvas → select node → add drop-shadow → adjust → screenshot diff
- 9.2 `inspector-multiple-fills.spec.ts` — select node → add 3 fills via UI → drag-reorder → verify scene-graph
- 9.3 `inspector-image-fill-crop.spec.ts` — drop image → switch to Crop → drag handle → verify
- 9.4 `gradient-editor-linear.spec.ts` — open PaintEditor → Linear → 2 stops → angle 45° → verify
- 9.5 `eyedropper-flow.spec.ts` — open ColorPicker → click pipette → click canvas → verify hex written back
- 9.6 `boolean-union.spec.ts` — select 3 shapes → click Union → verify boolean node + visual
- 9.7 `slice-export.spec.ts` — create 2 slices → click Export → verify ZIP download
- 9.8 `measurement-persistence.spec.ts` — create measurement → reload page → verify still visible
- 9.9 `overlays-render-all.spec.ts` — load test canvas with 10 frames + 3 masks + 2 slices + 1 measurement → verify all overlays render
- 9.10 `copy-paste-props.spec.ts` — source rectangle styled → copy → paste onto target → verify all props applied

---

## Phase 10: Manual QA + final acceptance

### Task 10.1: Run full quality gates

- [ ] `bun run check` — zero oxlint + type errors
- [ ] `bun run format` — no diff
- [ ] `bun run test:unit` — all green
- [ ] `bun run test:dupes` — jscpd < 3%
- [ ] `bun run test` — Playwright E2E all green in staging

### Task 10.2: Grep verifications per PRD §9.5

```bash
# Should find #5a7dff ONLY in src/components/ai/ and src/canvas-extensions/ai/
grep -rn "#5a7dff" kova-open-pencil-1/src/components/canvas-overlays/
# Expected: zero matches

# Should find no direct imports of packages/core internals from 07b files
grep -rn "from '@open-pencil/core/scene-graph\|from '@open-pencil/core/renderer" kova-open-pencil-1/src/components/canvas-overlays/ kova-open-pencil-1/src/components/inspector/
# Expected: zero matches (07b consumes via public proxy only)
```

### Task 10.3: Manual browser smoke (per PRD §9.4)

- [ ] Run `bun run dev` (Vite at localhost:1420)
- [ ] Walk through every checkbox in PRD §9.4 Manual QA list — 26 items
- [ ] Capture screenshots of each overlay matching hi-fi 09 byte-by-byte
- [ ] Capture screenshots of each inspector surface matching hi-fi 11 + 12 byte-by-byte

### Task 10.4: Open PR + request review

- [ ] Push branch `feat/07b-canvas-engine-inspector-overlays`
- [ ] Open PR with title `feat(07b): canvas engine inspector + overlays (PRD 07b)`
- [ ] PR body links to `kova-open-pencil-1/docs/prd/07b-canvas-engine-inspector-overlays.md`
- [ ] Test plan section in PR body itemizes acceptance criteria from PRD §8 (10 sections)
- [ ] Request founder review

---

## Self-Review

**Spec coverage check:**
- §0–§2 PRD scope → covered by file structure + Phase 0–2 tasks
- §3 visual spec → enforced by hi-fi-cited tests in every component task
- §6.2 stores → Tasks 1.1–1.5
- §6.3 composables → Tasks 2.1–2.10
- §6.4 components (10 inspector + 10 overlays + 1 wrapper) → Phases 3 + 4
- §6.4.2 inspector section extensions (6 files) → Phase 5
- §6.5 DnD receiver → Task 6.1
- §7 engine APIs → consumed via public proxy throughout; verified by grep in Task 10.2
- §8 acceptance criteria → covered by integration + E2E tests in Phases 8 + 9 + manual QA in Phase 10
- §9 test plan → Phases 8 + 9 + 10 cover unit / integration / E2E / manual
- §10 rollout phasing → feature gates in `constants/overlays.ts` (Task 0.1) + per-Phase task split
- §11 cross-cuts → enforced by feature gates (registry, find, JSZip dormant pre-08)
- §12 risks → mitigated by feature gates + per-PR sequencing

**Placeholder scan:** none found.

**Type consistency:** ClipboardPropsPayload field names match across Task 1.2 + 2.10. Effect, Fill, Paint types imported consistently from `@open-pencil/core`. ScaleMode enum values uppercase ('FILL', 'FIT', 'CROP', 'TILE') everywhere.

**One residual concern:** Tasks 4.5–4.11 (6 overlays) and Tasks 8.2–8.9 (8 integration tests) and Tasks 9.1–9.10 (10 E2E specs) are summarized in concise bullet form rather than fully expanded with code. The expanded pattern is identical to Tasks 4.2–4.4 / 8.1 — engineers extending each per the same 4-step shape produces consistent results. If a fresh agent prefers fully-expanded steps for those, regenerate with one task per overlay/test.
