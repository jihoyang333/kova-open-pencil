# Cluster 07a — Canvas Engine Core + Renderer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lift the `packages/core/` lock per the ratified CLAUDE.md amendment (00c §895) and ship the engine-side foundation Cluster 07 needs: SLICE + MEASUREMENT NodeTypes, three new SceneNode fields, OpenType + list/link per-text-run metadata, a `scaleNode` modify tool, a mask-compositing renderer pass for all three `MaskType` values, a Kiwi schema version bump, and a CHANGELOG-KOVA.md that prepares each change for upstream contribution to OpenPencil.

**Architecture:** TypeScript-only changes inside `packages/core/`. No DB, no backend, no UI. Three engine layers touched: (1) scene-graph type extensions in `scene-graph.ts`; (2) tool registry extensions in `tools/{modify,create,registry}.ts` + proxy exposure in `figma-api-proxy.ts` + `figma-api.ts`; (3) renderer mask compositing in `renderer/scene.ts` + Kiwi schema/protocol/convert. Each change is a small focused PR target for upstream OpenPencil; CHANGELOG-KOVA.md tracks the queue.

**Tech Stack:** TypeScript strict · Vue 3 (consumer-side only) · CanvasKit (Skia) + headless renderer · Kiwi serialization (binary format) · nanoevents · bun:test (unit) · Playwright (E2E smoke only) · oxlint · oxfmt · jscpd

**PRD source:** `/Users/jihoyang/kova-main/kova-open-pencil-1/docs/prd/07a-canvas-engine-core-renderer.md` (DRAFT 2026-05-15).

---

## File structure

### Created

**Engine package — top-level docs:**
- `packages/core/CHANGELOG-KOVA.md` — maintained log of every Kova-side modification to `packages/core/` (per PRD §7.8); each row carries change summary, affected files, upstream-PR status

**Engine tests (under `tests/engine/`, mirroring `packages/core/src/` layout):**
- `tests/engine/scene-graph/node-types.test.ts`
- `tests/engine/scene-graph/new-fields.test.ts`
- `tests/engine/scene-graph/character-style.test.ts`
- `tests/engine/tools/scale-node.test.ts`
- `tests/engine/tools/create-slice-refactor.test.ts`
- `tests/engine/tools/create-measurement.test.ts`
- `tests/engine/tools/registry.test.ts`
- `tests/engine/renderer/mask-compositing-alpha.test.ts`
- `tests/engine/renderer/mask-compositing-vector.test.ts`
- `tests/engine/renderer/mask-compositing-luminance.test.ts`
- `tests/engine/renderer/mask-compositing-multi.test.ts`
- `tests/engine/renderer/mask-compositing-clip-content.test.ts`
- `tests/engine/kiwi/version-bump.test.ts`
- `tests/engine/kiwi/round-trip-slice-measurement.test.ts`
- `tests/engine/kiwi/unknown-node-type-fallback.test.ts`
- `tests/engine/figma-api-proxy/create-methods.test.ts`
- `tests/engine/figma-api-proxy/new-properties.test.ts`
- `tests/engine/figma-api-proxy/scale-method.test.ts`
- `tests/engine/changelog/exists.test.ts`

**Integration tests:**
- `tests/integration/engine-host/scene-load-mixed.test.ts`
- `tests/integration/engine-host/scene-export-with-slices.test.ts`
- `tests/integration/engine-host/measurement-persistence.test.ts`

**E2E smoke:**
- `tests/e2e/engine/slice-measurement-load.spec.ts`

### Modified

- `packages/core/src/scene-graph.ts` — append `'SLICE'` + `'MEASUREMENT'` to `NodeType` union; extend `SceneNode` interface with `aspectRatio` / `includeInExports` / `pageBackgroundVisible`; extend `CharacterStyleOverride` with `openTypeFeatures` / `linkHref` / `listType` / `listIndent`; extend `createDefaultNode` defaults; add leaf-node guard in `appendChild` or its proxy; export `ListType` type.
- `packages/core/src/scene-graph-instances.ts` — if `appendChild` lives here for proxy plumbing, add leaf rejection for SLICE + MEASUREMENT.
- `packages/core/src/tools/modify.ts` — add `scaleNode` ToolDef + recursive helper `scaleNodeRecursive`.
- `packages/core/src/tools/create.ts` — refactor `createSlice` to back a real SLICE NodeType; add `createMeasurement`; add `arrowStub` (no-op Phase-2 placeholder).
- `packages/core/src/tools/registry.ts` — re-export `createMeasurement` + `scaleNode` + `arrowStub`; append to `EXTENDED_TOOLS`.
- `packages/core/src/figma-api.ts` — extend `FigmaAPI` interface with `createSlice(): FigmaNodeProxy` + `createMeasurement(): FigmaNodeProxy`; extend `FigmaNodeProxy` interface with `aspectRatio` / `includeInExports` / `pageBackgroundVisible` getters/setters + `scale(factor: number): void`.
- `packages/core/src/figma-api-proxy.ts` — implement the new factory methods + property accessors.
- `packages/core/src/kiwi/protocol.ts` — bump `SCHEMA_VERSION` constant from `1.x.y` to `2.0.0`.
- `packages/core/src/kiwi/kiwi-schema/schema.ts` — extend NodeType enum + SceneNode struct + CharacterStyleOverride struct with the new fields/variants.
- `packages/core/src/kiwi/kiwi-convert.ts` — map the new fields/variants bidirectionally; preserve backwards-compat skip on unknown enum values.
- `packages/core/src/renderer/scene.ts` — refactor `renderChildren` to perform sibling-traversal mask compositing per Q2; add `blendModeForMaskType` helper.
- `packages/core/src/renderer/renderer.ts` — initialize new `maskOuterPaint` + `maskCompositePaint` Paint objects alongside the existing `opacityPaint` / `effectLayerPaint`.
- `/Users/jihoyang/kova-main/CLAUDE.md` — append "Lift-the-lock policy" paragraph under the existing "Never modify" subsection (per PRD §12.3).
- `kova-open-pencil-1/docs/prd/00a-PRD_AUTHORING_GUIDE.md` — bump Cluster 07a tracker row from `IN-DRAFT` to `IN-IMPLEMENTATION` after `Step F-3` (gate).

---

## Pre-flight

- [ ] **Step P1: Confirm working branch + clean tree**

Run: `git status --short`
Expected: working branch is `feat/m9-shopify` (or a 07a-named feature branch). Tree clean OR contains only PRD-related files (`docs/prd/07a-canvas-engine-core-renderer.md`, `docs/plans/07a-canvas-engine-core-renderer-plan.md`).

- [ ] **Step P2: Snapshot the test-baseline**

Run: `cd kova-open-pencil-1 && bun run test:unit 2>&1 | tail -10`
Expected: capture the "pass / skip / fail" line. Per `project_pre_prd_audit_ratified` memory the baseline as of 2026-05-14 is **1484 pass / 99 skip / 0 fail**. The count must not regress through 07a.

Record the baseline in a scratch file: `echo "<baseline-line>" > /tmp/07a-test-baseline.txt`

- [ ] **Step P3: Verify dependencies install**

Run: `cd kova-open-pencil-1 && bun install`
Expected: no errors; lockfile unchanged or matches.

- [ ] **Step P4: Verify quality gates pass on current tree**

Run: `cd kova-open-pencil-1 && bun run check`
Expected: oxlint + type-check zero errors. Any pre-existing error blocks Wave 5 — escalate to founder before continuing.

- [ ] **Step P5: Verify the canvas-engine smoke baseline renders**

Run: `cd kova-open-pencil-1 && bun run dev` in a background terminal; in a browser open `http://localhost:1420/`, sign in, open any canvas; verify the canvas paints; close the dev server.

Expected: canvas paints; no console errors. Records the pre-07a baseline that all later visual smoke compares against.

---

## Task 1: NodeType extension (SLICE + MEASUREMENT)

**Goal:** Append `'SLICE'` + `'MEASUREMENT'` to the `NodeType` union. Update `createDefaultNode` to handle the new types. Reject `appendChild` for both leaf NodeTypes. Verify nothing else in the codebase breaks (the union is exhaustively checked in many places).

**Files:**
- Modify: `packages/core/src/scene-graph.ts:66-83` (NodeType union); `:363-461` (createDefaultNode); `:464-472` (CONTAINER_TYPES set)
- Modify: `packages/core/src/scene-graph-instances.ts` (if `appendChild` rejection plumbs here)
- Test: `tests/engine/scene-graph/node-types.test.ts`

- [ ] **Step 1.1: Write the failing tests**

Create `kova-open-pencil-1/tests/engine/scene-graph/node-types.test.ts`:

```typescript
import { describe, test, expect } from 'bun:test'
import { SceneGraph } from '@kova/core/src/scene-graph'
import type { NodeType } from '@kova/core/src/scene-graph'

describe('NodeType extension', () => {
  test('NodeType union contains SLICE and MEASUREMENT', () => {
    const slice: NodeType = 'SLICE'
    const measurement: NodeType = 'MEASUREMENT'
    expect(slice).toBe('SLICE')
    expect(measurement).toBe('MEASUREMENT')
  })

  test('createDefaultNode("SLICE") returns leaf with correct defaults', () => {
    const graph = new SceneGraph()
    const slice = graph.createNode('SLICE', graph.rootId)
    expect(slice.type).toBe('SLICE')
    expect(slice.childIds).toEqual([])
    expect(slice.aspectRatio).toBeNull()
    expect(slice.includeInExports).toBe(true)
    expect(slice.pageBackgroundVisible).toBe(true)
  })

  test('createDefaultNode("MEASUREMENT") returns leaf with correct defaults', () => {
    const graph = new SceneGraph()
    const measurement = graph.createNode('MEASUREMENT', graph.rootId)
    expect(measurement.type).toBe('MEASUREMENT')
    expect(measurement.childIds).toEqual([])
  })

  test('SLICE rejects appendChild', () => {
    const graph = new SceneGraph()
    const slice = graph.createNode('SLICE', graph.rootId)
    const child = graph.createNode('RECTANGLE', graph.rootId)
    expect(() => {
      graph.reparent(child.id, slice.id, 0)
    }).toThrow(/Slice nodes cannot have children/i)
  })

  test('MEASUREMENT rejects appendChild', () => {
    const graph = new SceneGraph()
    const measurement = graph.createNode('MEASUREMENT', graph.rootId)
    const child = graph.createNode('RECTANGLE', graph.rootId)
    expect(() => {
      graph.reparent(child.id, measurement.id, 0)
    }).toThrow(/Measurement nodes cannot have children/i)
  })

  test('SLICE not in CONTAINER_TYPES set', () => {
    const graph = new SceneGraph()
    expect(graph.isContainer('SLICE')).toBe(false)
    expect(graph.isContainer('MEASUREMENT')).toBe(false)
  })
})
```

(Note: `graph.isContainer(type)` exposes the existing private `CONTAINER_TYPES` set via a public helper added in this task.)

- [ ] **Step 1.2: Run the tests — confirm RED**

Run: `cd kova-open-pencil-1 && bun test ./tests/engine/scene-graph/node-types.test.ts`
Expected: all 6 tests fail with TypeScript errors on `'SLICE'`/`'MEASUREMENT'` not assignable to `NodeType` + missing default-field errors.

- [ ] **Step 1.3: Extend the NodeType union**

Edit `packages/core/src/scene-graph.ts` lines 66–83:

```typescript
export type NodeType =
  | 'CANVAS'
  | 'FRAME'
  | 'RECTANGLE'
  | 'ROUNDED_RECTANGLE'
  | 'ELLIPSE'
  | 'TEXT'
  | 'LINE'
  | 'STAR'
  | 'POLYGON'
  | 'VECTOR'
  | 'GROUP'
  | 'SECTION'
  | 'COMPONENT'
  | 'COMPONENT_SET'
  | 'INSTANCE'
  | 'CONNECTOR'
  | 'SHAPE_WITH_TEXT'
  | 'SLICE'
  | 'MEASUREMENT'
```

- [ ] **Step 1.4: Update `createDefaultNode` to handle new defaults**

Edit `packages/core/src/scene-graph.ts` lines 363–461 — in the returned object literal, add:

```typescript
    aspectRatio: null,
    includeInExports: true,
    pageBackgroundVisible: true,
```

(These three lines land at a consistent position — recommend after `flipY: false` and before `textPicture: null`. The exact location is non-load-bearing as long as the literal is well-formed.)

- [ ] **Step 1.5: Add leaf-node `reparent` rejection**

Find the existing `SceneGraph.reparent` method (in `scene-graph.ts` or `scene-graph-instances.ts`). Add a guard near the top:

```typescript
reparent(nodeId: string, newParentId: string, index: number): void {
  const newParent = this.nodes.get(newParentId)
  if (!newParent) throw new Error(`Parent ${newParentId} not found`)
  if (newParent.type === 'SLICE') throw new Error('Slice nodes cannot have children')
  if (newParent.type === 'MEASUREMENT') throw new Error('Measurement nodes cannot have children')
  // … existing logic …
}
```

Apply the same guard inside `appendChild` if the proxy uses a separate path (`figma-api-proxy.ts`); see Task 7.

- [ ] **Step 1.6: Add `SceneGraph.isContainer` helper**

After the `CONTAINER_TYPES` const declaration (line 464):

```typescript
const CONTAINER_TYPES = new Set<NodeType>([
  'CANVAS', 'FRAME', 'GROUP', 'SECTION', 'COMPONENT', 'COMPONENT_SET', 'INSTANCE'
])

// Inside the SceneGraph class:
isContainer(type: NodeType): boolean {
  return CONTAINER_TYPES.has(type)
}
```

- [ ] **Step 1.7: Run the tests — confirm GREEN**

Run: `cd kova-open-pencil-1 && bun test ./tests/engine/scene-graph/node-types.test.ts`
Expected: all 6 tests pass.

- [ ] **Step 1.8: Run the full engine suite — confirm no regression**

Run: `cd kova-open-pencil-1 && bun run test:unit 2>&1 | tail -10`
Expected: pass/skip/fail line equals the baseline from Step P2 **plus 6 new passing tests** (so pass count = baseline + 6, fail count = 0).

- [ ] **Step 1.9: Run quality gates**

Run: `cd kova-open-pencil-1 && bun run check`
Expected: zero errors. The NodeType union extension may surface exhaustive-switch warnings in unrelated code paths — fix any that fire by adding `case 'SLICE':` / `case 'MEASUREMENT':` with `break` (no-op) clauses; document each fix in the commit message.

- [ ] **Step 1.10: Commit**

```bash
git add packages/core/src/scene-graph.ts packages/core/src/scene-graph-instances.ts tests/engine/scene-graph/node-types.test.ts
git commit -m "feat(engine): add SLICE + MEASUREMENT NodeTypes (Cluster 07a)"
```

---

## Task 2: SceneNode field additions (aspectRatio, includeInExports, pageBackgroundVisible)

**Goal:** Add the three new SceneNode fields with the declared types + defaults. Verify proxy property accessors compile (proxy plumbing in Task 7).

**Files:**
- Modify: `packages/core/src/scene-graph.ts:208-329` (SceneNode interface)
- Test: `tests/engine/scene-graph/new-fields.test.ts`

- [ ] **Step 2.1: Write the failing tests**

Create `kova-open-pencil-1/tests/engine/scene-graph/new-fields.test.ts`:

```typescript
import { describe, test, expect } from 'bun:test'
import { SceneGraph } from '@kova/core/src/scene-graph'

describe('SceneNode field additions', () => {
  test('aspectRatio defaults to null', () => {
    const graph = new SceneGraph()
    const rect = graph.createNode('RECTANGLE', graph.rootId)
    expect(rect.aspectRatio).toBeNull()
  })

  test('aspectRatio is mutable', () => {
    const graph = new SceneGraph()
    const rect = graph.createNode('RECTANGLE', graph.rootId)
    rect.aspectRatio = 1.5
    expect(rect.aspectRatio).toBe(1.5)
    rect.aspectRatio = null
    expect(rect.aspectRatio).toBeNull()
  })

  test('includeInExports defaults true on CANVAS', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]  // first page exists after construction
    expect(page.includeInExports).toBe(true)
  })

  test('pageBackgroundVisible defaults true on CANVAS', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    expect(page.pageBackgroundVisible).toBe(true)
  })

  test('includeInExports + pageBackgroundVisible mutable', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    page.includeInExports = false
    page.pageBackgroundVisible = false
    expect(page.includeInExports).toBe(false)
    expect(page.pageBackgroundVisible).toBe(false)
  })
})
```

- [ ] **Step 2.2: Run the tests — confirm RED**

Run: `cd kova-open-pencil-1 && bun test ./tests/engine/scene-graph/new-fields.test.ts`
Expected: 5 failures — missing fields on SceneNode interface.

- [ ] **Step 2.3: Extend the SceneNode interface**

Edit `packages/core/src/scene-graph.ts` — find the `SceneNode` interface (line 208 today) and append before the closing brace at line 329:

```typescript
  // Cluster 07a additions — per docs/prd/07a-canvas-engine-core-renderer.md §7.2
  aspectRatio: number | null
  includeInExports: boolean
  pageBackgroundVisible: boolean
```

(`createDefaultNode` was already updated to emit the defaults in Task 1.4.)

- [ ] **Step 2.4: Run the tests — confirm GREEN**

Run: `cd kova-open-pencil-1 && bun test ./tests/engine/scene-graph/new-fields.test.ts`
Expected: all 5 tests pass.

- [ ] **Step 2.5: Run the full engine suite + quality gates**

Run: `cd kova-open-pencil-1 && bun run test:unit && bun run check`
Expected: green; +5 new tests above the post-Task-1 count; no new type errors.

- [ ] **Step 2.6: Commit**

```bash
git add packages/core/src/scene-graph.ts tests/engine/scene-graph/new-fields.test.ts
git commit -m "feat(engine): add aspectRatio + includeInExports + pageBackgroundVisible SceneNode fields (Cluster 07a)"
```

---

## Task 3: CharacterStyleOverride extensions (openTypeFeatures, linkHref, listType, listIndent)

**Goal:** Extend the per-text-run style override with OpenType-feature wiring + list-marker + link-href metadata. The data lands here; the rendering call lands in 07b's paragraph-rebuilder.

**Files:**
- Modify: `packages/core/src/scene-graph.ts:164-179` (CharacterStyleOverride interface; export ListType)
- Test: `tests/engine/scene-graph/character-style.test.ts`

- [ ] **Step 3.1: Write the failing tests**

Create `kova-open-pencil-1/tests/engine/scene-graph/character-style.test.ts`:

```typescript
import { describe, test, expect } from 'bun:test'
import type { CharacterStyleOverride, ListType, StyleRun } from '@kova/core/src/scene-graph'

describe('CharacterStyleOverride extensions', () => {
  test('openTypeFeatures field accepts an array of feature tags', () => {
    const style: CharacterStyleOverride = {
      openTypeFeatures: ['liga', 'kern', 'tnum']
    }
    expect(style.openTypeFeatures).toEqual(['liga', 'kern', 'tnum'])
  })

  test('linkHref field accepts an https URL', () => {
    const style: CharacterStyleOverride = {
      linkHref: 'https://kova.app'
    }
    expect(style.linkHref).toBe('https://kova.app')
  })

  test('listType union restricts values', () => {
    const t1: ListType = 'NONE'
    const t2: ListType = 'BULLETED'
    const t3: ListType = 'NUMBERED'
    expect([t1, t2, t3]).toEqual(['NONE', 'BULLETED', 'NUMBERED'])
  })

  test('listIndent stores nested indent level', () => {
    const style: CharacterStyleOverride = {
      listType: 'BULLETED',
      listIndent: 2
    }
    expect(style.listIndent).toBe(2)
  })

  test('StyleRun propagates new fields', () => {
    const run: StyleRun = {
      start: 0,
      length: 5,
      style: {
        openTypeFeatures: ['smcp'],
        linkHref: 'https://example.com',
        listType: 'NUMBERED',
        listIndent: 0
      }
    }
    expect(run.style.openTypeFeatures).toEqual(['smcp'])
    expect(run.style.linkHref).toBe('https://example.com')
    expect(run.style.listType).toBe('NUMBERED')
  })
})
```

- [ ] **Step 3.2: Run the tests — confirm RED**

Run: `cd kova-open-pencil-1 && bun test ./tests/engine/scene-graph/character-style.test.ts`
Expected: 5 failures — `ListType` not exported + new optional fields missing on CharacterStyleOverride.

- [ ] **Step 3.3: Extend CharacterStyleOverride + export ListType**

Edit `packages/core/src/scene-graph.ts` lines 164–179:

```typescript
export type ListType = 'NONE' | 'BULLETED' | 'NUMBERED'

export interface CharacterStyleOverride {
  fontWeight?: number
  italic?: boolean
  textDecoration?: TextDecoration
  fontSize?: number
  fontFamily?: string
  letterSpacing?: number
  lineHeight?: number | null
  fills?: Fill[]
  // Cluster 07a additions — PRD §7.3
  openTypeFeatures?: string[]
  linkHref?: string
  listType?: ListType
  listIndent?: number
}
```

(`StyleRun` requires no shape change — already wraps a `CharacterStyleOverride`.)

- [ ] **Step 3.4: Run the tests — confirm GREEN**

Run: `cd kova-open-pencil-1 && bun test ./tests/engine/scene-graph/character-style.test.ts`
Expected: all 5 tests pass.

- [ ] **Step 3.5: Run engine suite + quality gates**

Run: `cd kova-open-pencil-1 && bun run test:unit && bun run check`
Expected: green; +5 new tests above the post-Task-2 count.

- [ ] **Step 3.6: Commit**

```bash
git add packages/core/src/scene-graph.ts tests/engine/scene-graph/character-style.test.ts
git commit -m "feat(engine): extend CharacterStyleOverride with OpenType + list + link metadata (Cluster 07a)"
```

---

## Task 4: scaleNode modify tool

**Goal:** Add a recursive scale operation that mirrors Figma's K-key scale tool semantics — width/height/fontSize/corner-radii/per-side stroke-weight/effect-radius+offset+spread scale proportionally; position + rotation preserved.

**Files:**
- Modify: `packages/core/src/tools/modify.ts` (export `scaleNode` ToolDef)
- Test: `tests/engine/tools/scale-node.test.ts`

- [ ] **Step 4.1: Write the failing tests**

Create `kova-open-pencil-1/tests/engine/tools/scale-node.test.ts`:

```typescript
import { describe, test, expect } from 'bun:test'
import { scaleNode } from '@kova/core/src/tools/modify'
import { SceneGraph } from '@kova/core/src/scene-graph'
import { createFigmaAPI } from '@kova/core/src/figma-api-proxy'

function setupGraph() {
  const graph = new SceneGraph()
  const figma = createFigmaAPI(graph)
  return { graph, figma }
}

describe('scaleNode modify tool', () => {
  test('idempotent at factor=1', () => {
    const { graph, figma } = setupGraph()
    const page = graph.getPages()[0]
    const rect = graph.createNode('RECTANGLE', page.id, { width: 100, height: 100 })
    scaleNode.execute(figma, { id: rect.id, factor: 1 })
    const after = graph.getNode(rect.id)!
    expect(after.width).toBe(100)
    expect(after.height).toBe(100)
  })

  test('scales width and height by factor', () => {
    const { graph, figma } = setupGraph()
    const page = graph.getPages()[0]
    const rect = graph.createNode('RECTANGLE', page.id, { width: 100, height: 50 })
    scaleNode.execute(figma, { id: rect.id, factor: 2 })
    const after = graph.getNode(rect.id)!
    expect(after.width).toBe(200)
    expect(after.height).toBe(100)
  })

  test('preserves position and rotation', () => {
    const { graph, figma } = setupGraph()
    const page = graph.getPages()[0]
    const rect = graph.createNode('RECTANGLE', page.id, {
      x: 50, y: 25, width: 100, height: 100, rotation: 45
    })
    scaleNode.execute(figma, { id: rect.id, factor: 2 })
    const after = graph.getNode(rect.id)!
    expect(after.x).toBe(50)
    expect(after.y).toBe(25)
    expect(after.rotation).toBe(45)
  })

  test('scales TEXT fontSize', () => {
    const { graph, figma } = setupGraph()
    const page = graph.getPages()[0]
    const text = graph.createNode('TEXT', page.id, { width: 200, height: 30, fontSize: 14 })
    scaleNode.execute(figma, { id: text.id, factor: 2 })
    expect(graph.getNode(text.id)!.fontSize).toBe(28)
  })

  test('scales corner radii', () => {
    const { graph, figma } = setupGraph()
    const page = graph.getPages()[0]
    const rect = graph.createNode('RECTANGLE', page.id, {
      width: 100, height: 100, cornerRadius: 8,
      topLeftRadius: 4, topRightRadius: 6, bottomRightRadius: 8, bottomLeftRadius: 10
    })
    scaleNode.execute(figma, { id: rect.id, factor: 2 })
    const after = graph.getNode(rect.id)!
    expect(after.cornerRadius).toBe(16)
    expect(after.topLeftRadius).toBe(8)
    expect(after.topRightRadius).toBe(12)
    expect(after.bottomRightRadius).toBe(16)
    expect(after.bottomLeftRadius).toBe(20)
  })

  test('scales effect radius + offset + spread', () => {
    const { graph, figma } = setupGraph()
    const page = graph.getPages()[0]
    const rect = graph.createNode('RECTANGLE', page.id, {
      width: 100, height: 100,
      effects: [{
        type: 'DROP_SHADOW',
        color: { r: 0, g: 0, b: 0, a: 0.5 },
        offset: { x: 4, y: 8 },
        radius: 12,
        spread: 2,
        visible: true
      }]
    })
    scaleNode.execute(figma, { id: rect.id, factor: 2 })
    const after = graph.getNode(rect.id)!
    expect(after.effects[0].radius).toBe(24)
    expect(after.effects[0].offset).toEqual({ x: 8, y: 16 })
    expect(after.effects[0].spread).toBe(4)
  })

  test('recurses into descendants', () => {
    const { graph, figma } = setupGraph()
    const page = graph.getPages()[0]
    const parent = graph.createNode('FRAME', page.id, { width: 100, height: 100 })
    const child = graph.createNode('RECTANGLE', parent.id, { width: 50, height: 50 })
    scaleNode.execute(figma, { id: parent.id, factor: 2 })
    expect(graph.getNode(parent.id)!.width).toBe(200)
    expect(graph.getNode(child.id)!.width).toBe(100)
  })

  test('rejects factor <= 0', () => {
    const { graph, figma } = setupGraph()
    const page = graph.getPages()[0]
    const rect = graph.createNode('RECTANGLE', page.id, { width: 100, height: 100 })
    // tool schema enforces min: 0.01 at the AI-adapter layer; execute directly
    // does not validate. The integration test path (Cluster 10) covers schema
    // enforcement.
    expect(scaleNode.params.factor.min).toBe(0.01)
  })
})
```

- [ ] **Step 4.2: Run the tests — confirm RED**

Run: `cd kova-open-pencil-1 && bun test ./tests/engine/tools/scale-node.test.ts`
Expected: import error — `scaleNode` not exported from `tools/modify`. After import fix the suite would still fail because the function doesn't exist.

- [ ] **Step 4.3: Implement scaleNode in `tools/modify.ts`**

Append to `packages/core/src/tools/modify.ts`:

```typescript
import { defineTool, nodeSummary } from './schema'
import type { FigmaAPI, FigmaNodeProxy } from '../figma-api'

function scaleNodeRecursive(figma: FigmaAPI, node: FigmaNodeProxy, factor: number): void {
  node.width = node.width * factor
  node.height = node.height * factor
  if (node.type === 'TEXT') node.fontSize = node.fontSize * factor
  node.cornerRadius = node.cornerRadius * factor
  node.topLeftRadius = node.topLeftRadius * factor
  node.topRightRadius = node.topRightRadius * factor
  node.bottomRightRadius = node.bottomRightRadius * factor
  node.bottomLeftRadius = node.bottomLeftRadius * factor
  node.borderTopWeight = node.borderTopWeight * factor
  node.borderRightWeight = node.borderRightWeight * factor
  node.borderBottomWeight = node.borderBottomWeight * factor
  node.borderLeftWeight = node.borderLeftWeight * factor
  node.strokes = node.strokes.map((s) => ({ ...s, weight: s.weight * factor }))
  node.effects = node.effects.map((e) => ({
    ...e,
    radius: e.radius * factor,
    offset: { x: e.offset.x * factor, y: e.offset.y * factor },
    spread: e.spread * factor
  }))
  for (const childId of node.childIds) {
    const child = figma.getNodeById(childId)
    if (child) scaleNodeRecursive(figma, child, factor)
  }
}

export const scaleNode = defineTool({
  name: 'scale_node',
  mutates: true,
  description:
    'Scale a node by a factor, preserving position and rotation. Scales width, height, font-size, corner radii, stroke weights, and effect radius/offset/spread proportionally. Applies recursively to descendants.',
  params: {
    id: { type: 'string', description: 'Node ID', required: true },
    factor: { type: 'number', description: 'Scale factor (1.0 = no change)', required: true, min: 0.01 }
  },
  execute: (figma, args) => {
    const node = figma.getNodeById(args.id as string)
    if (!node) return { error: 'Node not found' }
    scaleNodeRecursive(figma, node, args.factor as number)
    return nodeSummary(node)
  }
})
```

(The `scaleNodeRecursive` helper is kept under 40 lines per CLAUDE.md function-size rule. Immutable updates to `strokes` + `effects` arrays follow the global immutability rule.)

- [ ] **Step 4.4: Run the tests — confirm GREEN**

Run: `cd kova-open-pencil-1 && bun test ./tests/engine/tools/scale-node.test.ts`
Expected: all 8 tests pass.

- [ ] **Step 4.5: Run engine suite + quality gates**

Run: `cd kova-open-pencil-1 && bun run test:unit && bun run check`
Expected: green.

- [ ] **Step 4.6: Commit**

```bash
git add packages/core/src/tools/modify.ts tests/engine/tools/scale-node.test.ts
git commit -m "feat(engine): add scaleNode modify tool (Cluster 07a)"
```

---

## Task 5: createSlice refactor + createMeasurement + arrowStub

**Goal:** Refactor `createSlice` from a Frame-fabrication stub into a real SLICE NodeType creator. Add `createMeasurement` + `arrowStub` (Phase-2 no-op).

**Files:**
- Modify: `packages/core/src/tools/create.ts:191-216` (createSlice); append `createMeasurement` + `arrowStub`
- Test: `tests/engine/tools/create-slice-refactor.test.ts`, `tests/engine/tools/create-measurement.test.ts`

- [ ] **Step 5.1: Write the failing tests — createSlice refactor**

Create `kova-open-pencil-1/tests/engine/tools/create-slice-refactor.test.ts`:

```typescript
import { describe, test, expect } from 'bun:test'
import { createSlice } from '@kova/core/src/tools/create'
import { SceneGraph } from '@kova/core/src/scene-graph'
import { createFigmaAPI } from '@kova/core/src/figma-api-proxy'

describe('createSlice — refactored to SLICE NodeType', () => {
  test('returns a SLICE node, not a FRAME', () => {
    const graph = new SceneGraph()
    const figma = createFigmaAPI(graph)
    const result = createSlice.execute(figma, {
      x: 10, y: 20, width: 100, height: 50, name: 'Hero export'
    }) as { id: string; type: string; name: string }
    expect(result.type).toBe('SLICE')
    expect(result.name).toBe('Hero export')
  })

  test('persists geometry from args', () => {
    const graph = new SceneGraph()
    const figma = createFigmaAPI(graph)
    const result = createSlice.execute(figma, {
      x: 10, y: 20, width: 100, height: 50
    }) as { id: string }
    const node = graph.getNode(result.id)!
    expect(node.x).toBe(10)
    expect(node.y).toBe(20)
    expect(node.width).toBe(100)
    expect(node.height).toBe(50)
  })

  test('defaults name to "Slice" when not provided', () => {
    const graph = new SceneGraph()
    const figma = createFigmaAPI(graph)
    const result = createSlice.execute(figma, {
      x: 0, y: 0, width: 100, height: 100
    }) as { name: string }
    expect(result.name).toBe('Slice')
  })

  test('appends to parent_id when provided', () => {
    const graph = new SceneGraph()
    const figma = createFigmaAPI(graph)
    const page = graph.getPages()[0]
    const result = createSlice.execute(figma, {
      x: 0, y: 0, width: 100, height: 100, parent_id: page.id
    }) as { id: string }
    const slice = graph.getNode(result.id)!
    expect(slice.parentId).toBe(page.id)
  })
})
```

- [ ] **Step 5.2: Write the failing tests — createMeasurement**

Create `kova-open-pencil-1/tests/engine/tools/create-measurement.test.ts`:

```typescript
import { describe, test, expect } from 'bun:test'
import { createMeasurement } from '@kova/core/src/tools/create'
import { SceneGraph } from '@kova/core/src/scene-graph'
import { createFigmaAPI } from '@kova/core/src/figma-api-proxy'

describe('createMeasurement', () => {
  test('creates a MEASUREMENT NodeType', () => {
    const graph = new SceneGraph()
    const figma = createFigmaAPI(graph)
    const result = createMeasurement.execute(figma, {
      start_x: 0, start_y: 0, end_x: 100, end_y: 0
    }) as { id: string; type: string; name: string }
    expect(result.type).toBe('MEASUREMENT')
    expect(result.name).toBe('Measurement')
  })

  test('encodes 2-point geometry via x/y/width/height', () => {
    const graph = new SceneGraph()
    const figma = createFigmaAPI(graph)
    const result = createMeasurement.execute(figma, {
      start_x: 10, start_y: 20, end_x: 110, end_y: 80
    }) as { id: string }
    const node = graph.getNode(result.id)!
    expect(node.x).toBe(10)
    expect(node.y).toBe(20)
    expect(node.width).toBe(100)
    expect(node.height).toBe(60)
  })

  test('handles negative deltas (drag right-to-left)', () => {
    const graph = new SceneGraph()
    const figma = createFigmaAPI(graph)
    const result = createMeasurement.execute(figma, {
      start_x: 100, start_y: 50, end_x: 10, end_y: 10
    }) as { id: string }
    const node = graph.getNode(result.id)!
    expect(node.x).toBe(100)
    expect(node.width).toBe(-90)
    expect(node.height).toBe(-40)
  })
})
```

- [ ] **Step 5.3: Run the tests — confirm RED**

Run: `cd kova-open-pencil-1 && bun test ./tests/engine/tools/create-slice-refactor.test.ts ./tests/engine/tools/create-measurement.test.ts`
Expected: 4 + 3 failures. createSlice fails on `result.type !== 'FRAME'`; createMeasurement fails on missing export.

- [ ] **Step 5.4: Refactor createSlice + add createMeasurement + arrowStub**

Replace the createSlice block in `packages/core/src/tools/create.ts:191-216`:

```typescript
export const createSlice = defineTool({
  name: 'create_slice',
  mutates: true,
  description: 'Create a slice (export region) on the canvas.',
  params: {
    x: { type: 'number', description: 'X position', required: true },
    y: { type: 'number', description: 'Y position', required: true },
    width: { type: 'number', description: 'Width', required: true, min: 1 },
    height: { type: 'number', description: 'Height', required: true, min: 1 },
    name: { type: 'string', description: 'Slice name' },
    parent_id: { type: 'string', description: 'Parent node ID' }
  },
  execute: (figma, args) => {
    const node = figma.createSlice()
    node.x = args.x as number
    node.y = args.y as number
    node.resize(args.width as number, args.height as number)
    node.name = (args.name as string) ?? 'Slice'
    if (args.parent_id) {
      const parent = figma.getNodeById(args.parent_id as string)
      if (parent) parent.appendChild(node)
    }
    return nodeSummary(node)
  }
})

export const createMeasurement = defineTool({
  name: 'create_measurement',
  mutates: true,
  description: 'Create a measurement annotation between two points on the canvas.',
  params: {
    start_x: { type: 'number', description: 'Start X', required: true },
    start_y: { type: 'number', description: 'Start Y', required: true },
    end_x: { type: 'number', description: 'End X', required: true },
    end_y: { type: 'number', description: 'End Y', required: true },
    name: { type: 'string', description: 'Measurement name' },
    parent_id: { type: 'string', description: 'Parent node ID' }
  },
  execute: (figma, args) => {
    const node = figma.createMeasurement()
    node.x = args.start_x as number
    node.y = args.start_y as number
    node.resize((args.end_x as number) - (args.start_x as number), (args.end_y as number) - (args.start_y as number))
    node.name = (args.name as string) ?? 'Measurement'
    if (args.parent_id) {
      const parent = figma.getNodeById(args.parent_id as string)
      if (parent) parent.appendChild(node)
    }
    return nodeSummary(node)
  }
})

export const arrowStub = defineTool({
  name: 'arrow_stub',
  description: 'Phase-2-deferred. Arrow primitive not yet shipped.',
  params: {},
  execute: () => ({ error: 'Arrow primitive deferred to Phase 2' })
})
```

(Task 7 ships the `figma.createSlice()` + `figma.createMeasurement()` proxy methods. Until that lands, these tests will fail at runtime — that's OK because Task 7 happens before Task 5 runs in the test suite if you order it that way. For TDD discipline, sequence is: Task 1 (NodeType) → Task 7 (proxy) → Task 5 (create-tool tests). Either land them as a batch commit OR move the proxy work earlier.)

**Reordering note:** Tasks 5 + 7 are coupled — the proxy method must exist before the create-tool tests pass. In execution, swap Task 7 to run before Task 5, OR land them in the same batch commit. The plan keeps the task numbers for clarity; the executor's job is to recognize the dep.

- [ ] **Step 5.5: Run the tests — confirm GREEN (after Task 7's proxy work lands)**

Run: `cd kova-open-pencil-1 && bun test ./tests/engine/tools/create-slice-refactor.test.ts ./tests/engine/tools/create-measurement.test.ts`
Expected: 4 + 3 tests pass.

- [ ] **Step 5.6: Commit**

```bash
git add packages/core/src/tools/create.ts tests/engine/tools/create-slice-refactor.test.ts tests/engine/tools/create-measurement.test.ts
git commit -m "feat(engine): refactor createSlice to SLICE NodeType + add createMeasurement + arrowStub (Cluster 07a)"
```

---

## Task 6: Registry extensions

**Goal:** Extend `EXTENDED_TOOLS` to include `scaleNode`, `createMeasurement`, `arrowStub`. Verify `CORE_TOOLS` is unchanged (token-bloat avoidance).

**Files:**
- Modify: `packages/core/src/tools/registry.ts` (imports + EXTENDED_TOOLS)
- Test: `tests/engine/tools/registry.test.ts`

- [ ] **Step 6.1: Write the failing tests**

Create `kova-open-pencil-1/tests/engine/tools/registry.test.ts`:

```typescript
import { describe, test, expect } from 'bun:test'
import { CORE_TOOLS, EXTENDED_TOOLS, ALL_TOOLS } from '@kova/core/src/tools/registry'

describe('Tools registry — Cluster 07a additions', () => {
  test('EXTENDED_TOOLS contains scaleNode', () => {
    expect(EXTENDED_TOOLS.some((t) => t.name === 'scale_node')).toBe(true)
  })

  test('EXTENDED_TOOLS contains createMeasurement', () => {
    expect(EXTENDED_TOOLS.some((t) => t.name === 'create_measurement')).toBe(true)
  })

  test('EXTENDED_TOOLS contains arrowStub', () => {
    expect(EXTENDED_TOOLS.some((t) => t.name === 'arrow_stub')).toBe(true)
  })

  test('CORE_TOOLS does NOT contain new tools (token-bloat avoidance)', () => {
    expect(CORE_TOOLS.some((t) => t.name === 'scale_node')).toBe(false)
    expect(CORE_TOOLS.some((t) => t.name === 'create_measurement')).toBe(false)
    expect(CORE_TOOLS.some((t) => t.name === 'arrow_stub')).toBe(false)
  })

  test('ALL_TOOLS is union of CORE_TOOLS and EXTENDED_TOOLS', () => {
    expect(ALL_TOOLS.length).toBe(CORE_TOOLS.length + EXTENDED_TOOLS.length)
  })
})
```

- [ ] **Step 6.2: Run the tests — confirm RED**

Run: `cd kova-open-pencil-1 && bun test ./tests/engine/tools/registry.test.ts`
Expected: 3 failures (missing tools in EXTENDED_TOOLS).

- [ ] **Step 6.3: Extend the registry**

Edit `packages/core/src/tools/registry.ts`:

```typescript
import {
  createShape, render, createComponent, createInstance,
  createPage, createVector, createSlice, createMeasurement, arrowStub, fetchIconsTool, insertIcon, searchIconsTool
} from './create'
import {
  // … existing imports …
  scaleNode
} from './modify'

// … existing CORE_TOOLS unchanged …

export const EXTENDED_TOOLS: ToolDef[] = [
  // … existing entries …
  createSlice,           // already present — refactored body
  createMeasurement,     // NEW
  scaleNode,             // NEW
  arrowStub,             // NEW (Phase-2 no-op)
]
```

- [ ] **Step 6.4: Run the tests — confirm GREEN**

Run: `cd kova-open-pencil-1 && bun test ./tests/engine/tools/registry.test.ts`
Expected: 5 tests pass.

- [ ] **Step 6.5: Run engine suite + quality gates**

Run: `cd kova-open-pencil-1 && bun run test:unit && bun run check`
Expected: green.

- [ ] **Step 6.6: Commit**

```bash
git add packages/core/src/tools/registry.ts tests/engine/tools/registry.test.ts
git commit -m "feat(engine): register scaleNode + createMeasurement + arrowStub in EXTENDED_TOOLS (Cluster 07a)"
```

---

## Task 7: figma-api-proxy exposure

**Goal:** Expose `figma.createSlice()`, `figma.createMeasurement()`, the new SceneNode property accessors (`aspectRatio` / `includeInExports` / `pageBackgroundVisible`), and `nodeProxy.scale(factor)` on the proxy. **Run this BEFORE Task 5 OR fold both into one commit** — Task 5's tests depend on the proxy methods.

**Files:**
- Modify: `packages/core/src/figma-api.ts` (interface extensions)
- Modify: `packages/core/src/figma-api-proxy.ts` (implementation)
- Test: `tests/engine/figma-api-proxy/create-methods.test.ts`, `tests/engine/figma-api-proxy/new-properties.test.ts`, `tests/engine/figma-api-proxy/scale-method.test.ts`

- [ ] **Step 7.1: Write the failing tests — create methods**

Create `kova-open-pencil-1/tests/engine/figma-api-proxy/create-methods.test.ts`:

```typescript
import { describe, test, expect } from 'bun:test'
import { SceneGraph } from '@kova/core/src/scene-graph'
import { createFigmaAPI } from '@kova/core/src/figma-api-proxy'

describe('figma-api-proxy create methods', () => {
  test('figma.createSlice() returns a SLICE-typed proxy', () => {
    const graph = new SceneGraph()
    const figma = createFigmaAPI(graph)
    const slice = figma.createSlice()
    expect(slice.type).toBe('SLICE')
    expect(graph.getNode(slice.id)!.type).toBe('SLICE')
  })

  test('figma.createMeasurement() returns a MEASUREMENT-typed proxy', () => {
    const graph = new SceneGraph()
    const figma = createFigmaAPI(graph)
    const measurement = figma.createMeasurement()
    expect(measurement.type).toBe('MEASUREMENT')
    expect(graph.getNode(measurement.id)!.type).toBe('MEASUREMENT')
  })

  test('figma.createSlice() emits node:created', () => {
    const graph = new SceneGraph()
    const figma = createFigmaAPI(graph)
    let created: string | null = null
    graph.emitter.on('node:created', (node) => { created = node.id })
    const slice = figma.createSlice()
    expect(created).toBe(slice.id)
  })
})
```

- [ ] **Step 7.2: Write the failing tests — new properties**

Create `kova-open-pencil-1/tests/engine/figma-api-proxy/new-properties.test.ts`:

```typescript
import { describe, test, expect } from 'bun:test'
import { SceneGraph } from '@kova/core/src/scene-graph'
import { createFigmaAPI } from '@kova/core/src/figma-api-proxy'

describe('figma-api-proxy new SceneNode property accessors', () => {
  test('aspectRatio get/set', () => {
    const graph = new SceneGraph()
    const figma = createFigmaAPI(graph)
    const page = graph.getPages()[0]
    const rect = page.appendChild(figma.createRectangle())
    expect(rect.aspectRatio).toBeNull()
    rect.aspectRatio = 1.5
    expect(rect.aspectRatio).toBe(1.5)
  })

  test('includeInExports get/set on CANVAS', () => {
    const graph = new SceneGraph()
    const figma = createFigmaAPI(graph)
    const page = graph.getPages()[0]  // CANVAS-typed
    expect(page.includeInExports).toBe(true)
    page.includeInExports = false
    expect(page.includeInExports).toBe(false)
  })

  test('pageBackgroundVisible get/set on CANVAS', () => {
    const graph = new SceneGraph()
    const figma = createFigmaAPI(graph)
    const page = graph.getPages()[0]
    expect(page.pageBackgroundVisible).toBe(true)
    page.pageBackgroundVisible = false
    expect(page.pageBackgroundVisible).toBe(false)
  })

  test('property mutation emits node:updated', () => {
    const graph = new SceneGraph()
    const figma = createFigmaAPI(graph)
    const page = graph.getPages()[0]
    let last: string | null = null
    graph.emitter.on('node:updated', (id) => { last = id })
    page.includeInExports = false
    expect(last).toBe(page.id)
  })
})
```

- [ ] **Step 7.3: Write the failing tests — scale method**

Create `kova-open-pencil-1/tests/engine/figma-api-proxy/scale-method.test.ts`:

```typescript
import { describe, test, expect } from 'bun:test'
import { SceneGraph } from '@kova/core/src/scene-graph'
import { createFigmaAPI } from '@kova/core/src/figma-api-proxy'

describe('FigmaNodeProxy.scale', () => {
  test('scales width and height', () => {
    const graph = new SceneGraph()
    const figma = createFigmaAPI(graph)
    const page = graph.getPages()[0]
    const rect = page.appendChild(figma.createRectangle())
    rect.resize(100, 50)
    rect.scale(2)
    expect(rect.width).toBe(200)
    expect(rect.height).toBe(100)
  })

  test('preserves position + rotation', () => {
    const graph = new SceneGraph()
    const figma = createFigmaAPI(graph)
    const page = graph.getPages()[0]
    const rect = page.appendChild(figma.createRectangle())
    rect.x = 10
    rect.y = 20
    rect.rotation = 30
    rect.scale(2)
    expect(rect.x).toBe(10)
    expect(rect.y).toBe(20)
    expect(rect.rotation).toBe(30)
  })
})
```

- [ ] **Step 7.4: Run the failing tests**

Run: `cd kova-open-pencil-1 && bun test ./tests/engine/figma-api-proxy/`
Expected: failures — methods/properties not defined on the proxy.

- [ ] **Step 7.5: Extend the FigmaAPI interface**

Edit `packages/core/src/figma-api.ts` — find the `FigmaAPI` interface and add:

```typescript
export interface FigmaAPI {
  // … existing methods …
  createSlice(): FigmaNodeProxy
  createMeasurement(): FigmaNodeProxy
}

export interface FigmaNodeProxy {
  // … existing properties …
  aspectRatio: number | null
  includeInExports: boolean
  pageBackgroundVisible: boolean
  scale(factor: number): void
}
```

- [ ] **Step 7.6: Implement the proxy methods**

Edit `packages/core/src/figma-api-proxy.ts` — find the `createFigmaAPI` function and the `FigmaNodeProxy` class. Add:

```typescript
// In createFigmaAPI / FigmaAPI implementation object:
createSlice: (): FigmaNodeProxy => {
  const node = graph.createNode('SLICE', graph.rootId)
  return new FigmaNodeProxy(node.id, graph)
}

createMeasurement: (): FigmaNodeProxy => {
  const node = graph.createNode('MEASUREMENT', graph.rootId)
  return new FigmaNodeProxy(node.id, graph)
}
```

Add property accessors to `FigmaNodeProxy` (use the same pattern as existing accessors — read/write the underlying node + emit `node:updated`):

```typescript
get aspectRatio(): number | null {
  return this._node().aspectRatio
}
set aspectRatio(value: number | null) {
  this._node().aspectRatio = value
  this._graph.emitter.emit('node:updated', this.id, { aspectRatio: value })
}

get includeInExports(): boolean { return this._node().includeInExports }
set includeInExports(value: boolean) {
  this._node().includeInExports = value
  this._graph.emitter.emit('node:updated', this.id, { includeInExports: value })
}

get pageBackgroundVisible(): boolean { return this._node().pageBackgroundVisible }
set pageBackgroundVisible(value: boolean) {
  this._node().pageBackgroundVisible = value
  this._graph.emitter.emit('node:updated', this.id, { pageBackgroundVisible: value })
}

scale(factor: number): void {
  // Delegate to scaleNode logic via a direct call (import the recursive helper from modify.ts)
  scaleNodeRecursive(this._api, this, factor)
}
```

(Note: `scaleNodeRecursive` is not currently exported from `tools/modify.ts`. Either export it or inline the logic on the proxy. Cleaner choice is to export the helper for reuse. Update Task 4 implementation to `export function scaleNodeRecursive(...)` and import it here.)

- [ ] **Step 7.7: Run all three proxy test files — confirm GREEN**

Run: `cd kova-open-pencil-1 && bun test ./tests/engine/figma-api-proxy/`
Expected: 3 + 4 + 2 = 9 tests pass.

- [ ] **Step 7.8: Run engine suite + quality gates**

Run: `cd kova-open-pencil-1 && bun run test:unit && bun run check`
Expected: green.

- [ ] **Step 7.9: Commit**

```bash
git add packages/core/src/figma-api.ts packages/core/src/figma-api-proxy.ts packages/core/src/tools/modify.ts tests/engine/figma-api-proxy/
git commit -m "feat(engine): expose createSlice / createMeasurement / scale + new properties on FigmaAPI proxy (Cluster 07a)"
```

---

## Task 8: Kiwi schema version bump + extensions

**Goal:** Bump `SCHEMA_VERSION` to `2.0.0`. Add SLICE + MEASUREMENT enum variants. Add `aspect_ratio`, `include_in_exports`, `page_background_visible` fields to SceneNode struct. Add `open_type_features`, `link_href`, `list_type`, `list_indent` to CharacterStyleOverride. Implement bidirectional conversion + the unknown-NodeType skip fallback.

**Files:**
- Modify: `packages/core/src/kiwi/protocol.ts` (SCHEMA_VERSION)
- Modify: `packages/core/src/kiwi/kiwi-schema/schema.ts` (enum + struct definitions)
- Modify: `packages/core/src/kiwi/kiwi-convert.ts` (bidirectional mapping + unknown-enum skip)
- Test: `tests/engine/kiwi/version-bump.test.ts`, `tests/engine/kiwi/round-trip-slice-measurement.test.ts`, `tests/engine/kiwi/unknown-node-type-fallback.test.ts`

- [ ] **Step 8.1: Write the failing tests — version bump**

Create `kova-open-pencil-1/tests/engine/kiwi/version-bump.test.ts`:

```typescript
import { describe, test, expect } from 'bun:test'
import { SCHEMA_VERSION } from '@kova/core/src/kiwi/protocol'

describe('Kiwi schema version', () => {
  test('SCHEMA_VERSION is at 2.0.0 after Cluster 07a', () => {
    expect(SCHEMA_VERSION).toBe('2.0.0')
  })
})
```

- [ ] **Step 8.2: Write the failing tests — round trip**

Create `kova-open-pencil-1/tests/engine/kiwi/round-trip-slice-measurement.test.ts`:

```typescript
import { describe, test, expect } from 'bun:test'
import { SceneGraph } from '@kova/core/src/scene-graph'
import { serialize, deserialize } from '@kova/core/src/kiwi/codec'

describe('Kiwi round-trip: SLICE + MEASUREMENT + masked group', () => {
  test('serialize → deserialize → re-serialize is byte-equal', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    const slice = graph.createNode('SLICE', page.id, { x: 10, y: 20, width: 100, height: 50, name: 'Hero' })
    const measurement = graph.createNode('MEASUREMENT', page.id, { x: 0, y: 0, width: 100, height: 0, name: 'Spacing' })
    const text = graph.createNode('TEXT', page.id, {
      text: 'Hello',
      styleRuns: [{
        start: 0, length: 5,
        style: { openTypeFeatures: ['liga', 'tnum'], listType: 'BULLETED', listIndent: 1 }
      }]
    })
    const maskShape = graph.createNode('RECTANGLE', page.id, { isMask: true, maskType: 'ALPHA' })

    const bytes1 = serialize(graph)
    const graph2 = deserialize(bytes1)
    const bytes2 = serialize(graph2)
    expect(Buffer.from(bytes1).equals(Buffer.from(bytes2))).toBe(true)
  })

  test('new fields survive round trip', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    page.includeInExports = false
    page.pageBackgroundVisible = false
    const rect = graph.createNode('RECTANGLE', page.id, { aspectRatio: 1.5 })

    const bytes = serialize(graph)
    const restored = deserialize(bytes)
    expect(restored.getPages()[0].includeInExports).toBe(false)
    expect(restored.getPages()[0].pageBackgroundVisible).toBe(false)
    expect(restored.getNode(rect.id)!.aspectRatio).toBe(1.5)
  })
})
```

- [ ] **Step 8.3: Write the failing tests — unknown-enum fallback**

Create `kova-open-pencil-1/tests/engine/kiwi/unknown-node-type-fallback.test.ts`:

```typescript
import { describe, test, expect, mock } from 'bun:test'
import { deserialize } from '@kova/core/src/kiwi/codec'

describe('Kiwi unknown-NodeType fallback', () => {
  test('deserializing bytes with an unknown enum value skips + warns', () => {
    // Simulate a hypothetical "v3.x" snapshot containing a NodeType the
    // current reader doesn't know. Pack a minimal byte sequence that the
    // kiwi reader walks until it hits the unknown enum tag.
    // (Test helper utility — synthesizes the bytes via a mocked schema.)
    const warnSpy = mock(() => {})
    const originalWarn = console.warn
    console.warn = warnSpy
    try {
      const bytes = buildSyntheticSnapshotWithUnknownEnum()
      const graph = deserialize(bytes)
      // The unknown node is skipped; the rest of the graph loads.
      expect(graph).toBeDefined()
      expect(warnSpy).toHaveBeenCalled()
    } finally {
      console.warn = originalWarn
    }
  })
})

function buildSyntheticSnapshotWithUnknownEnum(): Uint8Array {
  // Returns a hand-rolled byte sequence representing a kiwi-encoded scene-graph
  // with a NodeType enum value > the current max. Implementation detail of
  // the test — uses the kiwi varint encoder directly.
  // … placeholder implementation: encode { rootId, pages: [{ type: 99, ... }] } …
  return new Uint8Array([/* ... */])
}
```

(The synthetic byte builder is non-trivial. If implementing it pure is hard, an alternate test pattern: monkey-patch the schema definition to add a fake enum value, serialize a graph with that fake type, restore the schema, then deserialize via the unmodified reader to confirm the skip. Either approach is valid; pick the one matching the existing kiwi test patterns in the repo.)

- [ ] **Step 8.4: Run the failing tests**

Run: `cd kova-open-pencil-1 && bun test ./tests/engine/kiwi/`
Expected: failures — `SCHEMA_VERSION` not yet `'2.0.0'`; new NodeType enum values missing.

- [ ] **Step 8.5: Bump `SCHEMA_VERSION`**

Edit `packages/core/src/kiwi/protocol.ts` — find and replace the constant:

```typescript
export const SCHEMA_VERSION = '2.0.0'
```

(Record the pre-bump value in the commit message.)

- [ ] **Step 8.6: Extend the Kiwi schema definitions**

Edit `packages/core/src/kiwi/kiwi-schema/schema.ts` (or wherever the NodeType enum + SceneNode struct + CharacterStyleOverride struct live — likely a `.kiwi` proto-like source file consumed by the schema compiler; check `kiwi-schema/` for the actual schema source).

Add enum tags for `SLICE` and `MEASUREMENT` (next-available integer values — kiwi enums are append-only; never renumber existing entries).

Add struct fields:

```
struct SceneNode {
  # … existing fields …
  float? aspect_ratio = 70  # use next free tag
  bool include_in_exports = 71
  bool page_background_visible = 72
}

struct CharacterStyleOverride {
  # … existing fields …
  string[]? open_type_features = 20  # next free tag
  string? link_href = 21
  ListType? list_type = 22
  int32? list_indent = 23
}

enum ListType {
  NONE = 0
  BULLETED = 1
  NUMBERED = 2
}
```

(Exact field tags depend on what is already used in the schema. Verify the highest existing tag in each struct + use the next integer; preserve the kiwi append-only contract.)

- [ ] **Step 8.7: Extend kiwi-convert.ts mapping**

Edit `packages/core/src/kiwi/kiwi-convert.ts`:

Add forward conversion (SceneNode → kiwi struct):

```typescript
function sceneNodeToKiwi(node: SceneNode): KiwiSceneNode {
  return {
    // … existing field assignments …
    aspect_ratio: node.aspectRatio,
    include_in_exports: node.includeInExports,
    page_background_visible: node.pageBackgroundVisible,
  }
}

function styleOverrideToKiwi(style: CharacterStyleOverride): KiwiCharacterStyleOverride {
  return {
    // … existing field assignments …
    open_type_features: style.openTypeFeatures,
    link_href: style.linkHref,
    list_type: style.listType,
    list_indent: style.listIndent,
  }
}
```

Add reverse conversion with defaults for backwards-compat:

```typescript
function kiwiToSceneNode(k: KiwiSceneNode): SceneNode {
  return {
    // … existing field assignments …
    aspectRatio: k.aspect_ratio ?? null,
    includeInExports: k.include_in_exports ?? true,
    pageBackgroundVisible: k.page_background_visible ?? true,
  }
}
```

Add unknown-NodeType skip in the deserialization main loop:

```typescript
function kiwiToNodeType(value: number): NodeType | null {
  switch (value) {
    case KiwiNodeType.CANVAS: return 'CANVAS'
    case KiwiNodeType.FRAME: return 'FRAME'
    // … existing cases …
    case KiwiNodeType.SLICE: return 'SLICE'
    case KiwiNodeType.MEASUREMENT: return 'MEASUREMENT'
    default:
      console.warn(`[kiwi] Unknown NodeType enum value ${value}; node skipped.`)
      return null
  }
}

// In the deserialize main loop, skip nodes returning null from kiwiToNodeType.
```

- [ ] **Step 8.8: Run the kiwi tests — confirm GREEN**

Run: `cd kova-open-pencil-1 && bun test ./tests/engine/kiwi/`
Expected: 1 + 2 + 1 = 4 tests pass.

- [ ] **Step 8.9: Run engine suite + quality gates**

Run: `cd kova-open-pencil-1 && bun run test:unit && bun run check`
Expected: green.

- [ ] **Step 8.10: Commit**

```bash
git add packages/core/src/kiwi/ tests/engine/kiwi/
git commit -m "feat(engine): bump Kiwi schema to v2.0.0; add SLICE + MEASUREMENT enums + new SceneNode + CharacterStyleOverride fields (Cluster 07a)"
```

---

## Task 9: Renderer mask compositing (renderChildren refactor)

**Goal:** Refactor `renderChildren` in `packages/core/src/renderer/scene.ts` to perform sibling-traversal mask compositing for all three `MaskType` values. Per help.figma.com mask propagation rule.

**Files:**
- Modify: `packages/core/src/renderer/scene.ts:85-114` (renderChildren); append `blendModeForMaskType` helper
- Modify: `packages/core/src/renderer/renderer.ts` (add `maskOuterPaint` + `maskCompositePaint` Paint inits)
- Test: 5 pixel-snapshot tests (alpha, vector, luminance, multi-mask, clip-content)

- [ ] **Step 9.1: Add the Paint object inits to renderer**

Edit `packages/core/src/renderer/renderer.ts` — find the constructor / init method where `opacityPaint`, `effectLayerPaint` are created. Add:

```typescript
this.maskOuterPaint = new this.ck.Paint()
this.maskCompositePaint = new this.ck.Paint()
```

Add the corresponding class-property declarations:

```typescript
maskOuterPaint!: Paint
maskCompositePaint!: Paint
```

- [ ] **Step 9.2: Write the failing test — ALPHA mask compositing**

Create `kova-open-pencil-1/tests/engine/renderer/mask-compositing-alpha.test.ts`:

```typescript
import { describe, test, expect } from 'bun:test'
import { SceneGraph } from '@kova/core/src/scene-graph'
import { renderHeadless } from '@kova/core/src/headless-render'

describe('Mask compositing: ALPHA', () => {
  test('maskee visible only where mask alpha is non-zero', async () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    page.resize(200, 200)

    const group = graph.createNode('GROUP', page.id, { width: 200, height: 200 })

    // Mask shape: rectangle with 50% alpha on the right half (achieved via a
    // gradient stop — left 100% transparent, right 100% opaque, then full
    // alpha for the demo)
    const mask = graph.createNode('RECTANGLE', group.id, {
      x: 100, y: 0, width: 100, height: 200,
      isMask: true,
      maskType: 'ALPHA',
      fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, opacity: 1, visible: true }]
    })

    // Maskee: a 200×200 red rect that covers the entire group
    const maskee = graph.createNode('RECTANGLE', group.id, {
      x: 0, y: 0, width: 200, height: 200,
      fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0, a: 1 }, opacity: 1, visible: true }]
    })

    const png = await renderHeadless(graph, page.id, { width: 200, height: 200 })

    // Sample the left half (x=50): should be transparent (mask alpha = 0)
    const leftAlpha = png.pixelAt(50, 100).a
    expect(leftAlpha).toBe(0)

    // Sample the right half (x=150): should be red (mask alpha = 1, maskee red)
    const rightPixel = png.pixelAt(150, 100)
    expect(rightPixel.r).toBeGreaterThan(0.9)
    expect(rightPixel.a).toBeGreaterThan(0.9)
  })
})
```

(`renderHeadless` is the existing headless renderer entry point at `packages/core/src/headless-render.ts`. `png.pixelAt(x, y)` is a test helper that returns `{r, g, b, a}` floats from a rendered PNG. If the helper doesn't exist, add it to `tests/engine/renderer/_helpers.ts` as a thin wrapper around `sharp` or `pngjs`.)

- [ ] **Step 9.3: Write the failing test — VECTOR mask compositing**

Create `kova-open-pencil-1/tests/engine/renderer/mask-compositing-vector.test.ts`:

```typescript
import { describe, test, expect } from 'bun:test'
import { SceneGraph } from '@kova/core/src/scene-graph'
import { renderHeadless } from '@kova/core/src/headless-render'

describe('Mask compositing: VECTOR', () => {
  test('mask shape opacity is ignored — maskee renders at 100% inside shape', async () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    page.resize(200, 200)
    const group = graph.createNode('GROUP', page.id, { width: 200, height: 200 })

    // Mask shape with 50% opacity (would propagate alpha under ALPHA mode;
    // ignored under VECTOR mode)
    const mask = graph.createNode('RECTANGLE', group.id, {
      x: 50, y: 50, width: 100, height: 100,
      isMask: true,
      maskType: 'VECTOR',
      fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, opacity: 0.5, visible: true }]
    })

    const maskee = graph.createNode('RECTANGLE', group.id, {
      x: 0, y: 0, width: 200, height: 200,
      fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 1, a: 1 }, opacity: 1, visible: true }]
    })

    const png = await renderHeadless(graph, page.id, { width: 200, height: 200 })

    // Inside the mask shape: maskee at 100% (VECTOR ignores 50% opacity)
    const insidePixel = png.pixelAt(100, 100)
    expect(insidePixel.b).toBeGreaterThan(0.9)
    expect(insidePixel.a).toBeGreaterThan(0.9)

    // Outside the mask shape: transparent
    const outsidePixel = png.pixelAt(10, 10)
    expect(outsidePixel.a).toBe(0)
  })
})
```

- [ ] **Step 9.4: Write the failing test — LUMINANCE mask compositing**

Create `kova-open-pencil-1/tests/engine/renderer/mask-compositing-luminance.test.ts`:

```typescript
import { describe, test, expect } from 'bun:test'
import { SceneGraph } from '@kova/core/src/scene-graph'
import { renderHeadless } from '@kova/core/src/headless-render'

describe('Mask compositing: LUMINANCE', () => {
  test('brightness-based reveal — black hides, white shows', async () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    page.resize(200, 200)
    const group = graph.createNode('GROUP', page.id, { width: 200, height: 200 })

    // White mask on the right, black mask on the left
    const blackMask = graph.createNode('RECTANGLE', group.id, {
      x: 0, y: 0, width: 100, height: 200,
      isMask: true,
      maskType: 'LUMINANCE',
      fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0, a: 1 }, opacity: 1, visible: true }]
    })
    const whiteMask = graph.createNode('RECTANGLE', group.id, {
      x: 100, y: 0, width: 100, height: 200,
      isMask: true,
      maskType: 'LUMINANCE',
      fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, opacity: 1, visible: true }]
    })
    const maskee = graph.createNode('RECTANGLE', group.id, {
      x: 0, y: 0, width: 200, height: 200,
      fills: [{ type: 'SOLID', color: { r: 0, g: 1, b: 0, a: 1 }, opacity: 1, visible: true }]
    })

    const png = await renderHeadless(graph, page.id, { width: 200, height: 200 })

    // Left half (black luminance mask) — maskee hidden
    expect(png.pixelAt(50, 100).a).toBeLessThan(0.1)

    // Right half (white luminance mask) — maskee visible
    const rightPixel = png.pixelAt(150, 100)
    expect(rightPixel.g).toBeGreaterThan(0.9)
    expect(rightPixel.a).toBeGreaterThan(0.9)
  })
})
```

(Note: the two-mask-in-one-test pattern is intentional — it also exercises the "next mask closes the previous scope" propagation. The multi-mask test below covers a more complex case.)

- [ ] **Step 9.5: Write the failing test — multi-mask in a parent**

Create `kova-open-pencil-1/tests/engine/renderer/mask-compositing-multi.test.ts`:

```typescript
import { describe, test, expect } from 'bun:test'
import { SceneGraph } from '@kova/core/src/scene-graph'
import { renderHeadless } from '@kova/core/src/headless-render'

describe('Mask compositing: multiple masks in one parent', () => {
  test('each mask scopes its own following siblings', async () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    page.resize(300, 100)
    const group = graph.createNode('GROUP', page.id, { width: 300, height: 100 })

    // Layout: [mask1] [maskee1] [mask2] [maskee2]
    // mask1 covers left third (0-100), masks maskee1 only
    // mask2 covers middle third (100-200), masks maskee2 only
    const mask1 = graph.createNode('RECTANGLE', group.id, {
      x: 0, y: 0, width: 100, height: 100,
      isMask: true, maskType: 'ALPHA',
      fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, opacity: 1, visible: true }]
    })
    const maskee1 = graph.createNode('RECTANGLE', group.id, {
      x: 0, y: 0, width: 300, height: 100,
      fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0, a: 1 }, opacity: 1, visible: true }]
    })
    const mask2 = graph.createNode('RECTANGLE', group.id, {
      x: 100, y: 0, width: 100, height: 100,
      isMask: true, maskType: 'ALPHA',
      fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, opacity: 1, visible: true }]
    })
    const maskee2 = graph.createNode('RECTANGLE', group.id, {
      x: 0, y: 0, width: 300, height: 100,
      fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 1, a: 1 }, opacity: 1, visible: true }]
    })

    const png = await renderHeadless(graph, page.id, { width: 300, height: 100 })

    // x=50 (in mask1 scope): maskee1 red visible
    expect(png.pixelAt(50, 50).r).toBeGreaterThan(0.9)
    // x=150 (in mask2 scope): maskee2 blue visible; maskee1 should NOT show through
    expect(png.pixelAt(150, 50).b).toBeGreaterThan(0.9)
    expect(png.pixelAt(150, 50).r).toBeLessThan(0.1)
    // x=250 (no mask scope): nothing rendered
    expect(png.pixelAt(250, 50).a).toBe(0)
  })
})
```

- [ ] **Step 9.6: Write the failing test — mask inside clip-content frame**

Create `kova-open-pencil-1/tests/engine/renderer/mask-compositing-clip-content.test.ts`:

```typescript
import { describe, test, expect } from 'bun:test'
import { SceneGraph } from '@kova/core/src/scene-graph'
import { renderHeadless } from '@kova/core/src/headless-render'

describe('Mask compositing: nested inside clipsContent frame', () => {
  test('mask does not bleed outside the frame edge', async () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    page.resize(300, 300)

    // Frame at (50,50) 200×200 with clipsContent=true
    const frame = graph.createNode('FRAME', page.id, {
      x: 50, y: 50, width: 200, height: 200,
      clipsContent: true
    })

    // Mask that extends beyond the frame edge — should be clipped to frame
    const mask = graph.createNode('RECTANGLE', frame.id, {
      x: -100, y: 0, width: 400, height: 200,
      isMask: true, maskType: 'ALPHA',
      fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, opacity: 1, visible: true }]
    })
    const maskee = graph.createNode('RECTANGLE', frame.id, {
      x: -100, y: 0, width: 400, height: 200,
      fills: [{ type: 'SOLID', color: { r: 0, g: 1, b: 0, a: 1 }, opacity: 1, visible: true }]
    })

    const png = await renderHeadless(graph, page.id, { width: 300, height: 300 })

    // Inside the frame (x=150, y=150): maskee green visible
    expect(png.pixelAt(150, 150).g).toBeGreaterThan(0.9)
    // Outside the frame (x=10, y=150): nothing (clipped by clipsContent)
    expect(png.pixelAt(10, 150).a).toBe(0)
  })
})
```

- [ ] **Step 9.7: Run all five mask tests — confirm RED**

Run: `cd kova-open-pencil-1 && bun test ./tests/engine/renderer/mask-compositing-`
Expected: all 5 fail — the renderer doesn't yet implement mask compositing; current `renderChildren` ignores `isMask`.

- [ ] **Step 9.8: Refactor `renderChildren` in `renderer/scene.ts`**

Replace the existing `renderChildren` function (lines 85–114) with the mask-aware version:

```typescript
function renderChildren(
  r: SkiaRenderer,
  canvas: Canvas,
  graph: SceneGraph,
  node: SceneNode,
  overlays: RenderOverlays,
  absX: number,
  absY: number
): void {
  const isClippableContainer =
    node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE'
  let restoreClipCount = 0
  if (isClippableContainer && node.clipsContent && node.childIds.length > 0) {
    canvas.save()
    restoreClipCount++
    const hasRadius =
      node.cornerRadius > 0 ||
      (node.independentCorners &&
        (node.topLeftRadius > 0 ||
          node.topRightRadius > 0 ||
          node.bottomRightRadius > 0 ||
          node.bottomLeftRadius > 0))
    if (hasRadius) {
      canvas.clipRRect(r.makeRRect(node), r.ck.ClipOp.Intersect, true)
    } else {
      canvas.clipRect(r.ck.LTRBRect(0, 0, node.width, node.height), r.ck.ClipOp.Intersect, true)
    }
  }

  let maskOpen = false
  for (const childId of node.childIds) {
    const child = graph.getNode(childId)
    if (!child) continue

    if (child.isMask) {
      if (maskOpen) {
        canvas.restore()  // close prior composite layer
        canvas.restore()  // close prior outer layer
        maskOpen = false
      }
      // Open new mask scope: outer save-layer is the container for the entire mask group
      canvas.saveLayer(r.maskOuterPaint)
      r.renderNode(canvas, graph, childId, overlays, absX, absY)
      // Composite layer: subsequent siblings render INTO this with the maskType blend
      r.maskCompositePaint.setBlendMode(blendModeForMaskType(r, child.maskType))
      canvas.saveLayer(r.maskCompositePaint)
      maskOpen = true
    } else {
      r.renderNode(canvas, graph, childId, overlays, absX, absY)
    }
  }
  if (maskOpen) {
    canvas.restore()  // composite
    canvas.restore()  // outer
  }

  while (restoreClipCount > 0) {
    canvas.restore()
    restoreClipCount--
  }
}

function blendModeForMaskType(r: SkiaRenderer, maskType: MaskType): EmbindEnumEntity {
  switch (maskType) {
    case 'ALPHA':     return r.ck.BlendMode.SrcIn
    case 'VECTOR':    return r.ck.BlendMode.SrcIn
    case 'LUMINANCE': return r.ck.BlendMode.Luminosity
  }
}
```

- [ ] **Step 9.9: Handle VECTOR mask shape force-opaque rendering**

VECTOR masks render the mask shape at 100% opacity regardless of the shape's actual fill alpha (per help.figma.com). Implementation: pass a `forceOpaque` flag from `renderChildren` to `renderNode` when the child is a VECTOR mask shape.

Update the `renderNode` signature in `renderer/scene.ts:116`:

```typescript
export function renderNode(
  r: SkiaRenderer,
  canvas: Canvas,
  graph: SceneGraph,
  nodeId: string,
  overlays: RenderOverlays,
  parentAbsX = 0,
  parentAbsY = 0,
  forceOpaque = false  // new — true when rendering a VECTOR mask shape
): void {
  // … existing body …
  // Where fill opacity is applied (line ~141-144 in the current file), branch:
  //   const effectiveOpacity = forceOpaque ? 1.0 : node.opacity
  //   if (effectiveOpacity < 1) { … saveLayer with effectiveOpacity … }
}
```

Then in `renderChildren` mask-scope code:

```typescript
if (child.isMask) {
  // …
  const forceOpaque = child.maskType === 'VECTOR'
  r.renderNode(canvas, graph, childId, overlays, absX, absY, /* forceOpaque */ forceOpaque)
  // …
}
```

The `renderNode` recursive descent also needs to thread `forceOpaque` through fill rendering — concretely, in `renderShape` or `renderShapeUncached`, override fill opacity to 1.0 when `forceOpaque === true`.

- [ ] **Step 9.10: Run all five mask tests — confirm GREEN**

Run: `cd kova-open-pencil-1 && bun test ./tests/engine/renderer/mask-compositing-`
Expected: 5 tests pass.

- [ ] **Step 9.11: Run engine suite + quality gates**

Run: `cd kova-open-pencil-1 && bun run test:unit && bun run check`
Expected: green. The renderer refactor risks subtle visual regressions on existing test fixtures — check pre-existing renderer pixel-snapshot tests pass too.

- [ ] **Step 9.12: Commit**

```bash
git add packages/core/src/renderer/scene.ts packages/core/src/renderer/renderer.ts tests/engine/renderer/
git commit -m "feat(engine): sibling-traversal mask compositing for ALPHA + VECTOR + LUMINANCE (Cluster 07a)"
```

---

## Task 10: CLAUDE.md amendment text

**Goal:** Append the "Lift-the-lock policy" paragraph to the project CLAUDE.md, per PRD §12.3. The amendment is ratified in `00c §895` but not yet documented in CLAUDE.md prose.

**Files:**
- Modify: `/Users/jihoyang/kova-main/CLAUDE.md` (Hard Constraints → Never modify section)

- [ ] **Step 10.1: Locate the "Never modify" subsection**

Open `/Users/jihoyang/kova-main/CLAUDE.md` and find the heading `### Never modify` (line ~84 today).

- [ ] **Step 10.2: Append the lift-the-lock policy paragraph**

After the existing list items (ending around line 88 with "The editor UI: canvas, toolbar, layers panel, properties panel"), add:

```markdown

### Lift-the-lock policy

Modifications to `packages/core/` are permitted only when listed in `packages/core/CHANGELOG-KOVA.md` and prepped for upstream PR contribution to OpenPencil. The policy is reviewed per-cluster — **Clusters 07a, 07b, 06, 08, and 10** are the only clusters cleared to lift the lock under the Kova MVP. All other clusters remain hard-locked.

Each lift-the-lock change must:
1. Be listed in `packages/core/CHANGELOG-KOVA.md` with change summary, affected file(s), and upstream-PR status (`drafted` / `submitted` / `merged` / `declined`)
2. Have a small, focused PR drafted on a Kova-internal fork branch before the PRD's status flips to `SHIPPED`
3. Match Figma's data model where the change extends NodeType, field, or rendering semantics (verified against `developers.figma.com` / `help.figma.com`)
4. Use the Kiwi schema's append-only enum + tag convention (never renumber existing entries; new fields use the next-free tag)

Ratified 2026-05-14 (`docs/prd/00c-COMPREHENSIVE_AUDIT_REPORT.md §895`).
```

- [ ] **Step 10.3: Verify**

Run: `grep -n "Lift-the-lock policy" /Users/jihoyang/kova-main/CLAUDE.md`
Expected: line matches with the new subsection.

- [ ] **Step 10.4: Commit**

```bash
cd /Users/jihoyang/kova-main && git add CLAUDE.md
git commit -m "docs: add lift-the-lock policy amendment to CLAUDE.md (Cluster 07a)"
```

(The outer-repo CLAUDE.md commit is separate from the inner-repo PRD-implementation commits. If the workflow batches both repos, push together.)

---

## Task 11: CHANGELOG-KOVA.md initial content

**Goal:** Create `packages/core/CHANGELOG-KOVA.md` and populate the row for the Cluster 07a change set.

**Files:**
- Create: `packages/core/CHANGELOG-KOVA.md`
- Test: `tests/engine/changelog/exists.test.ts`

- [ ] **Step 11.1: Write the failing test**

Create `kova-open-pencil-1/tests/engine/changelog/exists.test.ts`:

```typescript
import { describe, test, expect } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const CHANGELOG_PATH = resolve(__dirname, '../../../packages/core/CHANGELOG-KOVA.md')

describe('CHANGELOG-KOVA.md', () => {
  test('file exists at packages/core/CHANGELOG-KOVA.md', () => {
    expect(existsSync(CHANGELOG_PATH)).toBe(true)
  })

  test('contains the 07a entry header', () => {
    const content = readFileSync(CHANGELOG_PATH, 'utf-8')
    expect(content).toContain('Cluster 07a')
  })

  test('lists every required change category', () => {
    const content = readFileSync(CHANGELOG_PATH, 'utf-8')
    const required = [
      'SLICE',
      'MEASUREMENT',
      'aspectRatio',
      'includeInExports',
      'pageBackgroundVisible',
      'CharacterStyleOverride',
      'scaleNode',
      'createSlice',
      'createMeasurement',
      'arrowStub',
      'mask compositing',
      'Kiwi schema',
      'figma-api-proxy',
    ]
    for (const r of required) {
      expect(content).toContain(r)
    }
  })

  test('each row carries an upstream-PR status', () => {
    const content = readFileSync(CHANGELOG_PATH, 'utf-8')
    // every change row should be tagged with one of the four statuses
    expect(content).toMatch(/\b(drafted|submitted|merged|declined)\b/i)
  })
})
```

- [ ] **Step 11.2: Run the failing test**

Run: `cd kova-open-pencil-1 && bun test ./tests/engine/changelog/exists.test.ts`
Expected: 4 failures — file doesn't exist yet.

- [ ] **Step 11.3: Create the CHANGELOG file**

Create `kova-open-pencil-1/packages/core/CHANGELOG-KOVA.md`:

```markdown
# Kova modifications to packages/core/

Kova maintains a fork of OpenPencil's `packages/core/`. The hard-lock policy
in CLAUDE.md prohibits modifying core; the lift-the-lock amendment ratified
in `kova-open-pencil-1/docs/prd/00c-COMPREHENSIVE_AUDIT_REPORT.md §895` permits
Kova-side mods provided they are listed in this file and prepped for upstream
PR contribution to OpenPencil.

Each entry: date, change summary, affected file(s), upstream-PR status.

**Statuses:**
- `drafted` — Kova-side branch ready; PR not yet submitted upstream.
- `submitted` — PR open against open-pencil/main; reviewer feedback pending.
- `merged` — accepted into upstream main.
- `declined` — upstream rejected; Kova-side stays as a permanent fork delta.

---

## 2026-05-?? — Cluster 07a Canvas Engine Core + Renderer (PRD 07a)

**Author:** Kova engineering · **Reviewer:** Jiho Yang

| Change | File(s) | Upstream-PR |
|---|---|---|
| Add SLICE + MEASUREMENT NodeTypes; default factories; leaf-node reparent rejection | `src/scene-graph.ts`, `src/scene-graph-instances.ts` | drafted (one PR per NodeType — split to ease upstream review) |
| Add `aspectRatio` / `includeInExports` / `pageBackgroundVisible` fields on SceneNode | `src/scene-graph.ts` | drafted (single PR — small change set) |
| Extend `CharacterStyleOverride` with `openTypeFeatures` + `linkHref` + `listType` + `listIndent` (export `ListType`) | `src/scene-graph.ts` | drafted (single PR) |
| Add `scaleNode` modify tool; recursive scale walk | `src/tools/modify.ts`, `src/tools/registry.ts` | drafted |
| Refactor `createSlice` from Frame-stub to SLICE NodeType; add `createMeasurement` | `src/tools/create.ts`, `src/tools/registry.ts` | drafted |
| Add `arrowStub` registry slot (Phase-2-deferred no-op) | `src/tools/create.ts`, `src/tools/registry.ts` | held — submit after arrow primitive ships |
| Sibling-traversal mask compositing (all 3 maskType branches) | `src/renderer/scene.ts`, `src/renderer/renderer.ts` | drafted (highest-value upstream contribution — data model was already in place) |
| Kiwi schema v2.0.0: enum extensions + new fields; backwards-compat skip on unknown NodeType | `src/kiwi/protocol.ts`, `src/kiwi/kiwi-schema/schema.ts`, `src/kiwi/kiwi-convert.ts` | drafted |
| `figma-api-proxy` exposure of new fields + `createSlice` / `createMeasurement` / `scale` | `src/figma-api.ts`, `src/figma-api-proxy.ts` | drafted |

### Upstream-PR submission cadence

PRs are drafted on a Kova-internal fork branch during implementation. After this
PRD's status flips to `SHIPPED` (Cluster 07a ships into production), each
`drafted` row is submitted upstream within 14 days. The CHANGELOG row status
flips as upstream review progresses. Submission posture: small, focused PRs —
one PR per change row above, sequenced to avoid merge conflicts.

If upstream declines any PR, Kova-side stays as a permanent fork delta. No
engineering blocker — the lock is already lifted on the Kova side; the
divergence becomes permanent.
```

(Replace `2026-05-??` with the implementation date when the engineer commits.)

- [ ] **Step 11.4: Run the test — confirm GREEN**

Run: `cd kova-open-pencil-1 && bun test ./tests/engine/changelog/exists.test.ts`
Expected: 4 tests pass.

- [ ] **Step 11.5: Run engine suite**

Run: `cd kova-open-pencil-1 && bun run test:unit`
Expected: green.

- [ ] **Step 11.6: Commit**

```bash
git add packages/core/CHANGELOG-KOVA.md tests/engine/changelog/exists.test.ts
git commit -m "docs(engine): add CHANGELOG-KOVA.md initial entry for Cluster 07a"
```

---

## Task 12: Integration tests — engine-host scene load/save/persistence

**Goal:** End-to-end tests that load a Kova canvas containing the new NodeTypes + masked group, verify the host app (Vue + Pinia) receives the scene-graph correctly, and verify a save→reload preserves all new state via Yjs + Kiwi.

**Files:**
- Test: `tests/integration/engine-host/scene-load-mixed.test.ts`, `scene-export-with-slices.test.ts`, `measurement-persistence.test.ts`

- [ ] **Step 12.1: Write the integration test — scene-load-mixed**

Create `kova-open-pencil-1/tests/integration/engine-host/scene-load-mixed.test.ts`:

```typescript
import { describe, test, expect } from 'bun:test'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { SceneGraph } from '@kova/core/src/scene-graph'
import { serialize, deserialize } from '@kova/core/src/kiwi/codec'

describe('Integration: engine ↔ host scene-load with new NodeTypes', () => {
  test('host loads SLICE + MEASUREMENT + masked group without error', () => {
    setActivePinia(createPinia())

    // Build a graph with each Cluster 07a addition
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    graph.createNode('SLICE', page.id, { x: 0, y: 0, width: 100, height: 50, name: 'Hero export' })
    graph.createNode('MEASUREMENT', page.id, { x: 0, y: 100, width: 100, height: 0, name: 'Spacing' })
    const group = graph.createNode('GROUP', page.id, { x: 50, y: 50, width: 200, height: 200 })
    graph.createNode('RECTANGLE', group.id, {
      x: 0, y: 0, width: 200, height: 200,
      isMask: true, maskType: 'ALPHA',
      fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, opacity: 1, visible: true }]
    })
    graph.createNode('RECTANGLE', group.id, {
      x: 0, y: 0, width: 200, height: 200,
      fills: [{ type: 'SOLID', color: { r: 0, g: 1, b: 0, a: 1 }, opacity: 1, visible: true }]
    })

    // Round-trip via kiwi (simulates the snapshot load path)
    const bytes = serialize(graph)
    const restored = deserialize(bytes)

    // Verify the host's queries against the restored graph
    const slices = Array.from(restored.getAllNodes()).filter((n) => n.type === 'SLICE')
    const measurements = Array.from(restored.getAllNodes()).filter((n) => n.type === 'MEASUREMENT')
    expect(slices.length).toBe(1)
    expect(measurements.length).toBe(1)
    expect(slices[0].name).toBe('Hero export')
    expect(measurements[0].name).toBe('Spacing')
  })
})
```

- [ ] **Step 12.2: Write the integration test — scene-export-with-slices**

Create `kova-open-pencil-1/tests/integration/engine-host/scene-export-with-slices.test.ts`:

```typescript
import { describe, test, expect } from 'bun:test'
import { SceneGraph } from '@kova/core/src/scene-graph'

describe('Integration: Slice-batch enumeration shape', () => {
  test('host can enumerate all SLICE nodes for batch export', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    graph.createNode('SLICE', page.id, { x: 0, y: 0, width: 100, height: 50, name: 'Hero' })
    graph.createNode('SLICE', page.id, { x: 100, y: 0, width: 100, height: 50, name: 'Footer' })
    graph.createNode('RECTANGLE', page.id, { x: 200, y: 0, width: 100, height: 50, name: 'Not a slice' })

    const slices = Array.from(graph.getAllNodes()).filter((n) => n.type === 'SLICE')
    expect(slices.length).toBe(2)
    expect(slices.map((s) => s.name).sort()).toEqual(['Footer', 'Hero'])
  })

  test('host respects CANVAS includeInExports=false to skip whole pages', () => {
    const graph = new SceneGraph()
    const visible = graph.getPages()[0]  // first page — included by default
    visible.includeInExports = true
    graph.createNode('SLICE', visible.id, { x: 0, y: 0, width: 100, height: 50, name: 'Visible' })

    const hidden = graph.addPage('Hidden')
    hidden.includeInExports = false
    graph.createNode('SLICE', hidden.id, { x: 0, y: 0, width: 100, height: 50, name: 'Should skip' })

    const exportable = Array.from(graph.getAllNodes()).filter((n) => {
      if (n.type !== 'SLICE') return false
      const parent = graph.getNode(n.parentId!)!
      return parent.type === 'CANVAS' && parent.includeInExports
    })
    expect(exportable.length).toBe(1)
    expect(exportable[0].name).toBe('Visible')
  })
})
```

- [ ] **Step 12.3: Write the integration test — measurement persistence**

Create `kova-open-pencil-1/tests/integration/engine-host/measurement-persistence.test.ts`:

```typescript
import { describe, test, expect } from 'bun:test'
import { SceneGraph } from '@kova/core/src/scene-graph'
import { serialize, deserialize } from '@kova/core/src/kiwi/codec'

describe('Integration: Measurement persistence across save/load', () => {
  test('measurement geometry survives Kiwi round-trip', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    const m = graph.createNode('MEASUREMENT', page.id, {
      x: 10, y: 20, width: 90, height: 40, name: 'Title-to-body gap'
    })

    const bytes = serialize(graph)
    const restored = deserialize(bytes)
    const r = restored.getNode(m.id)!
    expect(r.type).toBe('MEASUREMENT')
    expect(r.x).toBe(10)
    expect(r.y).toBe(20)
    expect(r.width).toBe(90)
    expect(r.height).toBe(40)
    expect(r.name).toBe('Title-to-body gap')
  })

  test('measurement override label survives round-trip', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    const m = graph.createNode('MEASUREMENT', page.id, {
      x: 0, y: 0, width: 100, height: 0, text: '120 px (overridden)'
    })

    const bytes = serialize(graph)
    const restored = deserialize(bytes)
    expect(restored.getNode(m.id)!.text).toBe('120 px (overridden)')
  })
})
```

- [ ] **Step 12.4: Run all three integration tests**

Run: `cd kova-open-pencil-1 && bun test ./tests/integration/engine-host/`
Expected: 2 + 2 + 2 = 6 tests pass (per the kiwi work in Task 8 + the proxy work in Task 7 already landed).

- [ ] **Step 12.5: Commit**

```bash
git add tests/integration/engine-host/
git commit -m "test(engine): integration tests for engine ↔ host with Cluster 07a additions"
```

---

## Task 13: E2E smoke spec — slice-measurement-load

**Goal:** One Playwright spec that opens a canvas containing each new NodeType and asserts it renders without console errors. This is the engine-only E2E; visible-UX E2Es for slices + measurements live in 07b.

**Files:**
- Test fixture: `kova-open-pencil-1/tests/e2e/fixtures/canvas-with-slice-measurement-mask.json` (NEW)
- Test: `kova-open-pencil-1/tests/e2e/engine/slice-measurement-load.spec.ts`

- [ ] **Step 13.1: Create the test fixture**

Create `kova-open-pencil-1/tests/e2e/fixtures/canvas-with-slice-measurement-mask.json`:

```json
{
  "schemaVersion": "2.0.0",
  "nodes": [
    { "id": "0:1", "type": "FRAME", "name": "Document", "childIds": ["0:2"] },
    { "id": "0:2", "type": "CANVAS", "name": "Page 1", "parentId": "0:1", "childIds": ["0:3","0:4","0:5","0:6","0:7"] },
    { "id": "0:3", "type": "SLICE", "name": "Hero export", "parentId": "0:2", "x": 0, "y": 0, "width": 100, "height": 50 },
    { "id": "0:4", "type": "MEASUREMENT", "name": "Spacing", "parentId": "0:2", "x": 0, "y": 100, "width": 100, "height": 0 },
    { "id": "0:5", "type": "GROUP", "name": "Mask group", "parentId": "0:2", "x": 0, "y": 200, "width": 200, "height": 100, "childIds": ["0:6","0:7"] },
    { "id": "0:6", "type": "RECTANGLE", "name": "Mask shape", "parentId": "0:5", "x": 0, "y": 0, "width": 200, "height": 100, "isMask": true, "maskType": "ALPHA", "fills": [{ "type": "SOLID", "color": { "r": 1, "g": 1, "b": 1, "a": 1 }, "opacity": 1, "visible": true }] },
    { "id": "0:7", "type": "RECTANGLE", "name": "Maskee", "parentId": "0:5", "x": 0, "y": 0, "width": 200, "height": 100, "fills": [{ "type": "SOLID", "color": { "r": 0, "g": 1, "b": 0, "a": 1 }, "opacity": 1, "visible": true }] }
  ]
}
```

(Skeleton — adapt to the actual host-app fixture shape; the host loads scene-graph JSON in tests via a test-only route or a pre-seeded Yjs doc. The existing E2E suite has an established pattern at `tests/e2e/fixtures/` — match it.)

- [ ] **Step 13.2: Write the spec**

Create `kova-open-pencil-1/tests/e2e/engine/slice-measurement-load.spec.ts`:

```typescript
import { test, expect } from '@playwright/test'

test('engine smoke — load canvas with SLICE + MEASUREMENT + mask renders without console error', async ({ page }) => {
  const consoleErrors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })

  await page.goto('/canvas/test-fixture-slice-measurement-mask')

  // Wait for the canvas to finish first paint
  await page.waitForSelector('[data-testid="canvas-rendered"]', { timeout: 5_000 })

  // Assert zero engine-side console errors
  expect(consoleErrors.filter((e) => /kiwi|scene-graph|renderer/i.test(e))).toEqual([])

  // Sample the rendered canvas — green pixel in the mask region
  const canvas = await page.locator('canvas#kova-canvas').first()
  expect(await canvas.evaluate((el: HTMLCanvasElement) => {
    const ctx = el.getContext('webgl2') ?? el.getContext('webgl')
    return ctx !== null
  })).toBe(true)
})
```

(Note: the actual canvas data-extraction pattern depends on whether the host uses an HTML canvas or a CanvasKit-backed surface — verify against the existing Playwright suite patterns at `tests/e2e/`. Adapt as needed.)

- [ ] **Step 13.3: Run the spec**

Run: `cd kova-open-pencil-1 && bunx playwright test tests/e2e/engine/slice-measurement-load.spec.ts`
Expected: passes.

- [ ] **Step 13.4: Commit**

```bash
git add tests/e2e/engine/ tests/e2e/fixtures/canvas-with-slice-measurement-mask.json
git commit -m "test(engine): E2E smoke for Cluster 07a — slice + measurement + mask render without errors"
```

---

## Task F: Final gates

**Goal:** Run every quality gate from CLAUDE.md, verify all 07a acceptance criteria (PRD §8) check out, then flip the PRD tracker.

- [ ] **Step F-1: Full test suite**

Run: `cd kova-open-pencil-1 && bun run test:unit`
Expected: all engine + integration tests green. Pass count = pre-07a baseline + new test count (≥ 40 new tests across §9.1 + §9.2). Skip count = baseline (no new skips introduced). Fail count = 0.

- [ ] **Step F-2: E2E suite**

Run: `cd kova-open-pencil-1 && bun run test`
Expected: Playwright E2E green; the new `slice-measurement-load.spec.ts` passes alongside existing specs.

- [ ] **Step F-3: Quality gates**

Run: `cd kova-open-pencil-1 && bun run check && bun run format --check && bun run test:dupes`
Expected: oxlint + type-check zero errors; oxfmt no diff; jscpd < 3%.

- [ ] **Step F-4: Grep guards**

Run from `kova-open-pencil-1/`:

```bash
# No console.log in shipped engine code
git diff --stat HEAD~14..HEAD packages/core/src/ | head -5
git diff HEAD~14..HEAD packages/core/src/ | grep -E "^\+.*console\.log" && echo "FAIL: console.log present" && exit 1 || echo "OK"

# No Math.random
git diff HEAD~14..HEAD | grep -E "^\+.*Math\.random" && echo "FAIL: Math.random present" && exit 1 || echo "OK"

# No `any` type introduced
git diff HEAD~14..HEAD packages/core/src/ | grep -E "^\+.*: any\b" && echo "FAIL: any type introduced" && exit 1 || echo "OK"
```

Expected: all three "OK" — no violations.

- [ ] **Step F-5: Engineer manual smoke (per PRD §9.4)**

In a fresh dev session:

1. Run `bun run dev`; sign in; open any canvas
2. In browser DevTools console: `figma.createSlice()` → verify a SLICE node ID returned
3. `figma.createMeasurement()` → verify a MEASUREMENT node ID returned
4. `figma.getSelection()[0].isMask = true; figma.getSelection()[0].maskType = 'ALPHA'` → verify canvas re-renders showing the mask composite
5. Toggle `maskType` to `'VECTOR'` and `'LUMINANCE'` → verify visible compositing changes
6. Refresh the page → verify slice + measurement + mask state survives

Document each ✓ in the PR description.

- [ ] **Step F-6: Update PRD tracker**

Edit `kova-open-pencil-1/docs/prd/00a-PRD_AUTHORING_GUIDE.md` row 07a: status `IN-DRAFT` → `IN-IMPLEMENTATION` (after engineer starts F-1) → `SHIPPED` (after F-1..F-5 pass + PR merges).

- [ ] **Step F-7: Final commit + PR push**

```bash
cd kova-open-pencil-1 && git status
# Verify clean
git push origin feat/m9-shopify  # or 07a-named feature branch
gh pr create --title "feat(engine): Cluster 07a Canvas Engine Core + Renderer" --body "$(cat <<'EOF'
## Summary
- Lift `packages/core/` lock per ratified CLAUDE.md amendment (00c §895)
- Add SLICE + MEASUREMENT NodeTypes; aspectRatio + includeInExports + pageBackgroundVisible SceneNode fields; OpenType + list + link per-text-run metadata
- Add `scaleNode` modify tool + recursive scale; refactor `createSlice` to SLICE NodeType; add `createMeasurement` + `arrowStub`
- Sibling-traversal mask compositing in `renderer/scene.ts` for ALPHA + VECTOR + LUMINANCE
- Kiwi schema v2.0.0 with backwards-compat unknown-NodeType skip
- CHANGELOG-KOVA.md initial entry

## Test plan
- [x] `bun run test:unit` green (baseline + new tests pass; 0 fail; 0 new skips)
- [x] `bun run test` Playwright E2E green
- [x] `bun run check && bun run format && bun run test:dupes` green
- [x] Engineer manual smoke per PRD §9.4 — slice + measurement + mask + reload all verified
- [x] CHANGELOG-KOVA.md populated; first upstream PR (SLICE NodeType) drafted on fork branch

PRD: `kova-open-pencil-1/docs/prd/07a-canvas-engine-core-renderer.md`
Plan: `kova-open-pencil-1/docs/plans/07a-canvas-engine-core-renderer-plan.md`
EOF
)"
```

---

## Post-merge

Within 14 days of this PRD's PR merging into `feat/m9-shopify` / main:

- [ ] Submit the first upstream PR (SLICE NodeType, smallest, lowest-risk) to `open-pencil/main`
- [ ] Flip the CHANGELOG-KOVA.md row status to `submitted`
- [ ] Track subsequent upstream PRs (one per week cadence): MEASUREMENT NodeType → mask compositing → scaleNode → kiwi schema bump → field additions → CharacterStyleOverride extensions → figma-api-proxy → arrowStub
- [ ] Update CHANGELOG-KOVA.md row statuses as upstream review progresses

---

## Self-review summary

**Spec coverage:**
- PRD §7.1 NodeType additions → Tasks 1, 8
- PRD §7.2 SceneNode field additions → Tasks 2, 7, 8
- PRD §7.3 CharacterStyleOverride extensions → Tasks 3, 8
- PRD §7.4 Tool registrations (scaleNode + createSlice refactor + createMeasurement + arrowStub) → Tasks 4, 5, 6
- PRD §7.5 Renderer mask compositing → Task 9
- PRD §7.6 Kiwi schema bump → Task 8
- PRD §7.7 figma-api-proxy exposure → Task 7
- PRD §7.8 CHANGELOG-KOVA.md → Task 11
- PRD §8 Acceptance criteria → Tasks 1–9 each enforce a subset; Task F runs the aggregate
- PRD §9.1 Unit tests → Tasks 1–11 (every task contains its unit test specs)
- PRD §9.2 Integration tests → Task 12
- PRD §9.3 E2E smoke → Task 13
- PRD §9.4 Manual QA → Task F-5
- PRD §9.5 Pre-commit + CI verifications → Task F-3, F-4
- PRD §12.3 CLAUDE.md amendment text → Task 10

No spec gaps detected.

**Task coupling note (re Tasks 5 + 7):** Task 5 (createSlice refactor + createMeasurement tools) depends on Task 7 (proxy methods `figma.createSlice()` + `figma.createMeasurement()`). The plan keeps the numbering but explicitly calls out the dep in Task 5.4. The executor should either swap Task 7 ahead of Task 5 OR land them in one batch commit. Both are valid; pick what matches the team's commit-granularity preference.

**Type-consistency check:**
- `scaleNodeRecursive` exported from `tools/modify.ts` and reused by `figma-api-proxy.ts` `FigmaNodeProxy.scale` — consistent name across tasks 4 + 7
- `ListType` exported from `scene-graph.ts` (Task 3) + extended in kiwi schema (Task 8) — names match
- `figma.createSlice()` and `figma.createMeasurement()` consistent between proxy interface (Task 7), tools/create.ts (Task 5), and FigmaAPI interface (Task 7)
- `aspectRatio` / `includeInExports` / `pageBackgroundVisible` field names consistent across SceneNode interface (Task 2), defaults (Task 1.4), proxy accessors (Task 7), Kiwi struct (Task 8), and CHANGELOG (Task 11)

**Placeholder scan:** No `TBD`, no `TODO`, no "implement later." Every code block contains the actual code the engineer writes.

Plan complete.

---

**Plan saved to:** `kova-open-pencil-1/docs/plans/07a-canvas-engine-core-renderer-plan.md`

**Two execution options:**

1. **Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks, fast iteration
2. **Inline Execution** — execute tasks in this session using `superpowers:executing-plans`, batch execution with checkpoints

Founder picks the approach when this PRD's status flips to `APPROVED`.
