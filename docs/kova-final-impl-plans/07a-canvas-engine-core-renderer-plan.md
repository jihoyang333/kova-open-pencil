# Cluster 07a — Canvas Engine Core + Renderer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lift the `packages/core/` lock per the ratified CLAUDE.md amendment (00c §895) and ship the engine-side foundation Cluster 07 needs: SLICE + MEASUREMENT NodeTypes, three new SceneNode fields, OpenType + list/link per-text-run metadata, a `scaleNode` modify tool, a mask-compositing renderer pass for all three `MaskType` values, a Kiwi schema version bump, and a CHANGELOG-KOVA.md that prepares each change for upstream contribution to OpenPencil.

**Architecture:** TypeScript-only changes inside `packages/core/`. No DB, no backend, no UI. Three engine layers touched: (1) scene-graph type extensions in `scene-graph.ts`; (2) tool registry extensions in `tools/{modify,create,registry}.ts` + proxy exposure in `figma-api-proxy.ts` + `figma-api.ts`; (3) renderer mask compositing in `renderer/scene.ts` + Kiwi schema/protocol/convert. Each change is a small focused PR target for upstream OpenPencil; CHANGELOG-KOVA.md tracks the queue.

**Tech Stack:** TypeScript strict · Vue 3 (consumer-side only) · CanvasKit (Skia) + headless renderer · Kiwi serialization (binary format) · nanoevents · bun:test (unit) · Playwright (E2E smoke only) · oxlint · oxfmt · jscpd

**PRD source:** `/Users/jihoyang/kova-main/kova-open-pencil-1/docs/kova-final-prds/07a-canvas-engine-core-renderer.md` (DRAFT 2026-05-15).

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

- `packages/core/src/scene-graph.ts` — append `'SLICE'` to `NodeType` union (only); add new types `MeasurementSide` / `MeasurementOffset` / `MeasurementAnchor` / `Measurement`; extend `SceneNode` interface with `aspectRatio` / `includeInExports` / `pageBackgroundVisible` / `measurements`; extend `CharacterStyleOverride` with `openTypeFeatures` / `linkHref` / `listType` / `listIndent`; extend `createDefaultNode` defaults; add leaf-node guard in `appendChild` or its proxy; add 5 page-level measurement methods on `SceneGraph`; instrument `removeNode` + `reparent` for `measurement:broken` / `measurement:dropped` lifecycle events; export `ListType` type.
- `packages/core/src/scene-graph-instances.ts` — if `appendChild` lives here for proxy plumbing, add leaf rejection for SLICE.
- `packages/core/src/tools/modify.ts` — add `scaleNode` ToolDef + recursive helper `scaleNodeRecursive`.
- `packages/core/src/tools/create.ts` — refactor `createSlice` to back a real SLICE NodeType; add `arrowStub` (no-op Phase-2 placeholder).
- `packages/core/src/tools/measurement.ts` — NEW file — `addMeasurement` ToolDef (page-level wrapper; calls `figma.currentPage.addMeasurement(...)`, NOT a NodeType creator).
- `packages/core/src/tools/registry.ts` — re-export `addMeasurement` + `scaleNode` + `arrowStub`; append to `EXTENDED_TOOLS`.
- `packages/core/src/figma-api.ts` — extend `FigmaAPI` interface with `createSlice(): FigmaNodeProxy` + `currentPage: FigmaPageProxy`; add `FigmaPageProxy` interface with 5 measurement methods (`addMeasurement` / `getMeasurements` / `getMeasurementsForNode` / `editMeasurement` / `deleteMeasurement`); extend `FigmaNodeProxy` interface with `aspectRatio` / `includeInExports` / `pageBackgroundVisible` getters/setters + `scale(factor: number): void`.
- `packages/core/src/figma-api-proxy.ts` — implement the new factory methods + property accessors.
- `packages/core/src/kiwi/protocol.ts` — bump `SCHEMA_VERSION` constant from `1.x.y` to `2.0.0`.
- `packages/core/src/kiwi/kiwi-schema/schema.ts` — extend NodeType enum (SLICE only); add new structs Measurement / MeasurementAnchor / MeasurementOffset + MeasurementSide enum; extend SceneNode struct with new fields including `measurements`; extend CharacterStyleOverride struct with new fields.
- `packages/core/src/kiwi/kiwi-convert.ts` — map the new fields/variants bidirectionally; preserve backwards-compat skip on unknown enum values.
- `packages/core/src/renderer/scene.ts` — refactor `renderChildren` to perform sibling-traversal mask compositing per Q2; add `blendModeForMaskType` helper.
- `packages/core/src/renderer/renderer.ts` — initialize new `maskOuterPaint` + `maskCompositePaint` Paint objects alongside the existing `opacityPaint` / `effectLayerPaint`.
- `/Users/jihoyang/kova-main/CLAUDE.md` — append "Lift-the-lock policy" paragraph under the existing "Never modify" subsection (per PRD §12.3).
- `kova-open-pencil-1/docs/kova-final-prds/00a-PRD_AUTHORING_GUIDE.md` — bump Cluster 07a tracker row from `IN-DRAFT` to `IN-IMPLEMENTATION` after `Step F-3` (gate).

---

## Hi-fi Visual Reference + Translation Method

> **Authoritative method:** `docs/execution-phase/claude-design-files/IMPLEMENTATION_PROMPT.md` (read end-to-end before any task — engine work still consumes design context for sibling tools, naming, and serialized field semantics).

**Cluster 07a is engine-only.** Per PRD 07a §3: "The engine surface this PRD ships is **invisible** to a customer — it is data shape + serialization + a sibling-traversal change in the renderer. Visual evidence... renders via overlay components + the inspector that PRD 07b ships on top of this engine surface."

**No UI surfaces ship in this cluster.** The visual evidence of engine changes (dashed slice rectangle, measurement annotation, mask corner glyphs, masked composite) renders in **Cluster 07b** via `Kova Hi-Fi 09 Canvas Overlays - Dark.html` + `Kova Hi-Fi 11 Inspector - Dark.html`. See PRD 07a §3 engine→visual evidence table.

### Kova codebase paths to consult (engine work)

- `kova-open-pencil-1/packages/core/src/scene-graph.ts` — engine NodeType union (Task 1 extends with SLICE)
- `kova-open-pencil-1/packages/core/src/codec/` — Kiwi schema (Task 8 bump)
- `kova-open-pencil-1/packages/core/src/renderer/` — renderer (Task 9 mask compositing refactor)
- `kova-open-pencil-1/packages/core/src/figma-api/` — figma-api proxy exposure (Task 7)
- `kova-open-pencil-1/CLAUDE.md` — lift-the-lock policy amendment (Task 10)

### Hi-fi reference for downstream consumers (this cluster does NOT ship UI; this table is for traceability)

| Engine surface (07a ships) | Visual evidence (07b ships) | Hi-fi file | Scene |
|---|---|---|---|
| SLICE NodeType | Dashed-line bbox + layers entry + Export entry | `design-system/hifi/canvas-chrome/Kova Hi-Fi 09 Canvas Overlays - Dark.html` + `design-system/hifi/canvas-engine/Kova Hi-Fi 11 Inspector - Dark.html` | B8.x slice region + B8 export-preview |
| Measurement system | Dashed line + auto-distance label + broken-anchor state | `design-system/hifi/canvas-chrome/Kova Hi-Fi 09 Canvas Overlays - Dark.html` | B8.9 |
| Mask compositing (all 3 maskType branches) | Mask outlines + corner glyph + masked child pixels | same | B8.4 |
| aspectRatio field | Lock icon in Position/Layout section | `design-system/hifi/canvas-engine/Kova Hi-Fi 11 Inspector - Dark.html` | Layout section |
| includeInExports + pageBackgroundVisible | Page-row toggle in no-selection Pages section | same | Pages section |

No Playwright visual-diff gate for this cluster (no UI). Integration tests at Task 12 + E2E smoke at Task 13 verify engine state survives load/save/persistence round-trip.

---

## Pre-flight

- [ ] **Step P1: Confirm working branch + clean tree**

Run: `git status --short`
Expected: working branch is `feat/m9-shopify` (or a 07a-named feature branch). Tree clean OR contains only PRD-related files (`docs/kova-final-prds/07a-canvas-engine-core-renderer.md`, `docs/kova-final-impl-plans/07a-canvas-engine-core-renderer-plan.md`).

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

## Task 1: NodeType extension (SLICE only)

**Goal:** Append `'SLICE'` to the `NodeType` union (only). Update `createDefaultNode` to handle SLICE. Reject `appendChild` on SLICE (leaf-node). Verify nothing else in the codebase breaks (the union is exhaustively checked in many places).

**MEASUREMENT is not a NodeType** — it's handled by Task 1b's separate page-level measurement system. Founder ratified 2026-05-17.

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

describe('NodeType extension — SLICE only', () => {
  test('NodeType union contains SLICE', () => {
    const slice: NodeType = 'SLICE'
    expect(slice).toBe('SLICE')
  })

  test('NodeType union does NOT contain MEASUREMENT (page-level model)', () => {
    // @ts-expect-error — MEASUREMENT is not in NodeType (it's a page-level record, not a NodeType)
    const bad: NodeType = 'MEASUREMENT'
    // type assertion alone is the test — compile-time failure if MEASUREMENT is in the union
    expect(bad).toBe('MEASUREMENT')
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

  test('SLICE rejects appendChild', () => {
    const graph = new SceneGraph()
    const slice = graph.createNode('SLICE', graph.rootId)
    const child = graph.createNode('RECTANGLE', graph.rootId)
    expect(() => {
      graph.reparent(child.id, slice.id, 0)
    }).toThrow(/Slice nodes cannot have children/i)
  })

  test('SLICE not in CONTAINER_TYPES set', () => {
    const graph = new SceneGraph()
    expect(graph.isContainer('SLICE')).toBe(false)
  })
})
```

(Note: `graph.isContainer(type)` exposes the existing private `CONTAINER_TYPES` set via a public helper added in this task.)

- [ ] **Step 1.2: Run the tests — confirm RED**

Run: `cd kova-open-pencil-1 && bun test ./tests/engine/scene-graph/node-types.test.ts`
Expected: SLICE tests fail with TypeScript errors on `'SLICE'` not assignable to `NodeType` + missing default-field errors. The `@ts-expect-error` test on MEASUREMENT passes pre-implementation (because MEASUREMENT isn't in the union yet, the suppression is satisfied).

- [ ] **Step 1.3: Extend the NodeType union (SLICE only)**

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
```

- [ ] **Step 1.4: Update `createDefaultNode` to handle new defaults**

Edit `packages/core/src/scene-graph.ts` lines 363–461 — in the returned object literal, add:

```typescript
    aspectRatio: null,
    includeInExports: true,
    pageBackgroundVisible: true,
    measurements: type === 'CANVAS' ? [] : undefined,
```

(These four lines land at a consistent position — recommend after `flipY: false` and before `textPicture: null`. The exact location is non-load-bearing as long as the literal is well-formed. The `measurements` field is only populated on CANVAS nodes per the page-level model.)

- [ ] **Step 1.5: Add leaf-node `reparent` rejection**

Find the existing `SceneGraph.reparent` method (in `scene-graph.ts` or `scene-graph-instances.ts`). Add a guard near the top:

```typescript
reparent(nodeId: string, newParentId: string, index: number): void {
  const newParent = this.nodes.get(newParentId)
  if (!newParent) throw new Error(`Parent ${newParentId} not found`)
  if (newParent.type === 'SLICE') throw new Error('Slice nodes cannot have children')
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
Expected: all 5 tests pass.

- [ ] **Step 1.8: Run the full engine suite — confirm no regression**

Run: `cd kova-open-pencil-1 && bun run test:unit 2>&1 | tail -10`
Expected: pass/skip/fail line equals the baseline from Step P2 **plus 5 new passing tests** (so pass count = baseline + 5, fail count = 0).

- [ ] **Step 1.9: Run quality gates**

Run: `cd kova-open-pencil-1 && bun run check`
Expected: zero errors. The NodeType union extension may surface exhaustive-switch warnings in unrelated code paths — fix any that fire by adding `case 'SLICE':` with `break` (no-op) clauses; document each fix in the commit message.

- [ ] **Step 1.10: Commit**

```bash
git add packages/core/src/scene-graph.ts packages/core/src/scene-graph-instances.ts tests/engine/scene-graph/node-types.test.ts
git commit -m "feat(engine): add SLICE NodeType (Cluster 07a — measurement is page-level, see Task 1b)"
```

---

## Task 1b: Measurement system — page-level on CANVAS (Figma-aligned)

**Goal:** Add the page-level measurement system that matches Figma's PageNode measurement API. This is the **new** subsystem introduced by the 2026-05-17 founder decision to match Figma exactly (PRD §7.1b, §12.10).

Adds:
- New types: `MeasurementSide`, `MeasurementOffset` (tagged union), `MeasurementAnchor`, `Measurement`
- New field on `SceneNode`: `measurements?: Measurement[]` (populated only on CANVAS-typed nodes)
- New 5 methods on `SceneGraph`: `addMeasurement`, `getMeasurements`, `getMeasurementsForNode`, `editMeasurement`, `deleteMeasurement`
- New lifecycle events: `measurement:created`, `measurement:updated`, `measurement:deleted`, `measurement:broken`, `measurement:dropped`
- Orphan-on-anchor-delete semantic + drop-on-cross-canvas-move semantic

**Files:**
- Modify: `packages/core/src/scene-graph.ts` (add types + methods + field; instrument `removeNode` and `reparent` for lifecycle events)
- Test: `tests/engine/scene-graph/measurement-system.test.ts`

- [ ] **Step 1b.1: Write the failing tests**

Create `kova-open-pencil-1/tests/engine/scene-graph/measurement-system.test.ts`:

```typescript
import { describe, test, expect, beforeEach } from 'bun:test'
import { SceneGraph } from '@kova/core/src/scene-graph'
import type {
  Measurement,
  MeasurementSide,
  MeasurementOffset
} from '@kova/core/src/scene-graph'

describe('Measurement system — page-level', () => {
  let graph: SceneGraph
  let canvasId: string
  let nodeA: string
  let nodeB: string

  beforeEach(() => {
    graph = new SceneGraph()
    const canvas = graph.createNode('CANVAS', graph.rootId)
    canvasId = canvas.id
    const a = graph.createNode('RECTANGLE', canvasId)
    const b = graph.createNode('RECTANGLE', canvasId)
    nodeA = a.id
    nodeB = b.id
  })

  test('addMeasurement creates a Measurement with a unique id', () => {
    const m = graph.addMeasurement(
      canvasId,
      { nodeId: nodeA, side: 'RIGHT' },
      { nodeId: nodeB, side: 'LEFT' }
    )
    expect(m.id).toMatch(/^[a-zA-Z0-9_-]+$/)
    expect(m.start.nodeId).toBe(nodeA)
    expect(m.start.side).toBe('RIGHT')
    expect(m.end.nodeId).toBe(nodeB)
    expect(m.end.side).toBe('LEFT')
    expect(m.freeText).toBe('')
  })

  test('addMeasurement defaults offset to INNER 0', () => {
    const m = graph.addMeasurement(
      canvasId,
      { nodeId: nodeA, side: 'TOP' },
      { nodeId: nodeB, side: 'BOTTOM' }
    )
    expect(m.offset).toEqual({ type: 'INNER', relative: 0 })
  })

  test('addMeasurement rejects cross-canvas start anchor', () => {
    const otherCanvas = graph.createNode('CANVAS', graph.rootId)
    const otherNode = graph.createNode('RECTANGLE', otherCanvas.id)
    expect(() => {
      graph.addMeasurement(
        canvasId,
        { nodeId: otherNode.id, side: 'LEFT' },
        { nodeId: nodeB, side: 'RIGHT' }
      )
    }).toThrow(/anchor node not on target canvas/i)
  })

  test('addMeasurement rejects cross-canvas end anchor', () => {
    const otherCanvas = graph.createNode('CANVAS', graph.rootId)
    const otherNode = graph.createNode('RECTANGLE', otherCanvas.id)
    expect(() => {
      graph.addMeasurement(
        canvasId,
        { nodeId: nodeA, side: 'LEFT' },
        { nodeId: otherNode.id, side: 'RIGHT' }
      )
    }).toThrow(/anchor node not on target canvas/i)
  })

  test('getMeasurements returns the canvas measurement collection', () => {
    const m1 = graph.addMeasurement(canvasId, { nodeId: nodeA, side: 'TOP' }, { nodeId: nodeB, side: 'BOTTOM' })
    const m2 = graph.addMeasurement(canvasId, { nodeId: nodeA, side: 'LEFT' }, { nodeId: nodeB, side: 'RIGHT' })
    const all = graph.getMeasurements(canvasId)
    expect(all).toHaveLength(2)
    expect(all.map((m) => m.id).sort()).toEqual([m1.id, m2.id].sort())
  })

  test('getMeasurementsForNode returns measurements where node is start OR end', () => {
    graph.addMeasurement(canvasId, { nodeId: nodeA, side: 'TOP' }, { nodeId: nodeB, side: 'BOTTOM' })
    graph.addMeasurement(canvasId, { nodeId: nodeB, side: 'LEFT' }, { nodeId: nodeA, side: 'RIGHT' })
    expect(graph.getMeasurementsForNode(nodeA)).toHaveLength(2)
    expect(graph.getMeasurementsForNode(nodeB)).toHaveLength(2)
  })

  test('editMeasurement updates offset and freeText only', () => {
    const m = graph.addMeasurement(canvasId, { nodeId: nodeA, side: 'TOP' }, { nodeId: nodeB, side: 'BOTTOM' })
    const updated = graph.editMeasurement(canvasId, m.id, {
      offset: { type: 'OUTER', fixed: 12 },
      freeText: 'gap 12px'
    })
    expect(updated.offset).toEqual({ type: 'OUTER', fixed: 12 })
    expect(updated.freeText).toBe('gap 12px')
    expect(updated.start.nodeId).toBe(nodeA) // start unchanged
  })

  test('deleteMeasurement removes the record', () => {
    const m = graph.addMeasurement(canvasId, { nodeId: nodeA, side: 'TOP' }, { nodeId: nodeB, side: 'BOTTOM' })
    expect(graph.getMeasurements(canvasId)).toHaveLength(1)
    graph.deleteMeasurement(canvasId, m.id)
    expect(graph.getMeasurements(canvasId)).toHaveLength(0)
  })

  test('orphan-on-anchor-delete: removing nodeA leaves the measurement; emits measurement:broken', () => {
    const m = graph.addMeasurement(canvasId, { nodeId: nodeA, side: 'TOP' }, { nodeId: nodeB, side: 'BOTTOM' })
    const events: unknown[] = []
    graph.emitter.on('measurement:broken', (e) => events.push(e))
    graph.removeNode(nodeA)
    // Measurement still exists with a broken anchor
    expect(graph.getMeasurements(canvasId)).toHaveLength(1)
    expect(graph.getMeasurements(canvasId)[0]!.start.nodeId).toBe(nodeA) // anchor still points to deleted ID
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({
      measurementId: m.id,
      brokenAnchorNodeId: nodeA,
      canvasId
    })
  })

  test('drop-on-cross-canvas-move: reparenting nodeA to a different CANVAS drops measurements on source', () => {
    const m = graph.addMeasurement(canvasId, { nodeId: nodeA, side: 'TOP' }, { nodeId: nodeB, side: 'BOTTOM' })
    const otherCanvas = graph.createNode('CANVAS', graph.rootId)
    const events: unknown[] = []
    graph.emitter.on('measurement:dropped', (e) => events.push(e))
    graph.reparent(nodeA, otherCanvas.id, 0)
    expect(graph.getMeasurements(canvasId)).toHaveLength(0)
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({
      measurementIds: [m.id],
      sourceCanvasId: canvasId,
      movedNodeId: nodeA
    })
  })

  test('same-canvas reparent does NOT drop measurements', () => {
    const frame = graph.createNode('FRAME', canvasId)
    graph.addMeasurement(canvasId, { nodeId: nodeA, side: 'TOP' }, { nodeId: nodeB, side: 'BOTTOM' })
    graph.reparent(nodeA, frame.id, 0)
    expect(graph.getMeasurements(canvasId)).toHaveLength(1)
  })

  // C-LOW07a.1: additional explicit trigger-condition coverage per event
  test('addMeasurement emits measurement:created with full measurement payload', () => {
    const events: unknown[] = []
    graph.emitter.on('measurement:created', (e) => events.push(e))
    const m = graph.addMeasurement(canvasId, { nodeId: nodeA, side: 'TOP' }, { nodeId: nodeB, side: 'BOTTOM' })
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({ measurementId: m.id, canvasId })
  })

  test('editMeasurement emits measurement:updated with prev + next snapshots', () => {
    const m = graph.addMeasurement(canvasId, { nodeId: nodeA, side: 'TOP' }, { nodeId: nodeB, side: 'BOTTOM' })
    const events: unknown[] = []
    graph.emitter.on('measurement:updated', (e) => events.push(e))
    graph.editMeasurement(canvasId, m.id, { offset: { type: 'INNER', relative: 0.25 } })
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({ measurementId: m.id, canvasId })
  })

  test('deleteMeasurement emits measurement:deleted', () => {
    const m = graph.addMeasurement(canvasId, { nodeId: nodeA, side: 'TOP' }, { nodeId: nodeB, side: 'BOTTOM' })
    const events: unknown[] = []
    graph.emitter.on('measurement:deleted', (e) => events.push(e))
    graph.deleteMeasurement(canvasId, m.id)
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({ measurementId: m.id, canvasId })
  })

  test('removing BOTH anchors emits measurement:broken twice (once per anchor) for the same measurement', () => {
    const m = graph.addMeasurement(canvasId, { nodeId: nodeA, side: 'TOP' }, { nodeId: nodeB, side: 'BOTTOM' })
    const events: any[] = []
    graph.emitter.on('measurement:broken', (e) => events.push(e))
    graph.removeNode(nodeA)
    graph.removeNode(nodeB)
    expect(events).toHaveLength(2)
    expect(events.map(e => e.brokenAnchorNodeId).sort()).toEqual([nodeA, nodeB].sort())
    expect(events.every(e => e.measurementId === m.id)).toBe(true)
  })

  test('deleting a CANVAS containing measurements emits measurement:dropped for ALL its measurements', () => {
    graph.addMeasurement(canvasId, { nodeId: nodeA, side: 'TOP' }, { nodeId: nodeB, side: 'BOTTOM' })
    graph.addMeasurement(canvasId, { nodeId: nodeA, side: 'LEFT' }, { nodeId: nodeB, side: 'RIGHT' })
    const events: any[] = []
    graph.emitter.on('measurement:dropped', (e) => events.push(e))
    graph.removeNode(canvasId)
    expect(events).toHaveLength(1)
    expect(events[0].measurementIds).toHaveLength(2)
    expect(events[0].sourceCanvasId).toBe(canvasId)
  })
})
```

- [ ] **Step 1b.2: Run the tests — confirm RED**

Run: `cd kova-open-pencil-1 && bun test ./tests/engine/scene-graph/measurement-system.test.ts`
Expected: all 11 tests fail with TypeScript errors on missing types + missing methods.

- [ ] **Step 1b.3: Add the new types**

Edit `packages/core/src/scene-graph.ts` — add adjacent to NodeType / SceneNode declarations:

```typescript
export type MeasurementSide = 'TOP' | 'RIGHT' | 'BOTTOM' | 'LEFT'

export type MeasurementOffset =
  | { type: 'INNER'; relative: number }
  | { type: 'OUTER'; fixed: number }

export interface MeasurementAnchor {
  nodeId: string
  side: MeasurementSide
}

export interface Measurement {
  id: string
  start: MeasurementAnchor
  end: MeasurementAnchor
  offset: MeasurementOffset
  freeText: string
}

// Lifecycle event payloads
export interface MeasurementBrokenEvent {
  measurementId: string
  brokenAnchorNodeId: string
  canvasId: string
}

export interface MeasurementDroppedEvent {
  measurementIds: string[]
  sourceCanvasId: string
  movedNodeId: string
}
```

Extend `SceneNode` interface with:

```typescript
  /** Page-level measurement collection. Populated only on CANVAS-typed nodes. */
  measurements?: Measurement[]
```

Extend `SceneGraphEvents` with the new event names: `'measurement:created'`, `'measurement:updated'`, `'measurement:deleted'`, `'measurement:broken'`, `'measurement:dropped'`.

- [ ] **Step 1b.4: Implement the 5 SceneGraph methods**

Inside the `SceneGraph` class, add:

```typescript
  private generateMeasurementId(): string {
    // Per CLAUDE.md: crypto.getRandomValues only. No Math.random.
    const bytes = new Uint8Array(8)
    crypto.getRandomValues(bytes)
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  }

  private isDescendant(canvasId: string, nodeId: string): boolean {
    let current = this.nodes.get(nodeId)
    while (current) {
      if (current.id === canvasId) return true
      if (!current.parentId) return false
      current = this.nodes.get(current.parentId)
    }
    return false
  }

  addMeasurement(
    canvasId: string,
    start: MeasurementAnchor,
    end: MeasurementAnchor,
    options?: { offset?: MeasurementOffset; freeText?: string }
  ): Measurement {
    const canvas = this.nodes.get(canvasId)
    if (!canvas || canvas.type !== 'CANVAS') {
      throw new Error(`Target ${canvasId} is not a CANVAS node`)
    }
    if (!this.isDescendant(canvasId, start.nodeId)) {
      throw new Error(`Measurement anchor node not on target canvas: ${start.nodeId}`)
    }
    if (!this.isDescendant(canvasId, end.nodeId)) {
      throw new Error(`Measurement anchor node not on target canvas: ${end.nodeId}`)
    }
    const m: Measurement = {
      id: this.generateMeasurementId(),
      start: { ...start },
      end: { ...end },
      offset: options?.offset ?? { type: 'INNER', relative: 0 },
      freeText: options?.freeText ?? ''
    }
    canvas.measurements = [...(canvas.measurements ?? []), m]
    this.emitter.emit('measurement:created', m)
    return m
  }

  getMeasurements(canvasId: string): Measurement[] {
    const canvas = this.nodes.get(canvasId)
    if (!canvas || canvas.type !== 'CANVAS') return []
    return [...(canvas.measurements ?? [])]
  }

  getMeasurementsForNode(nodeId: string): Measurement[] {
    const results: Measurement[] = []
    for (const node of this.nodes.values()) {
      if (node.type !== 'CANVAS' || !node.measurements) continue
      for (const m of node.measurements) {
        if (m.start.nodeId === nodeId || m.end.nodeId === nodeId) {
          results.push(m)
        }
      }
    }
    return results
  }

  editMeasurement(
    canvasId: string,
    id: string,
    newValue: { offset?: MeasurementOffset; freeText?: string }
  ): Measurement {
    const canvas = this.nodes.get(canvasId)
    if (!canvas || canvas.type !== 'CANVAS' || !canvas.measurements) {
      throw new Error(`Canvas ${canvasId} has no measurements`)
    }
    const idx = canvas.measurements.findIndex((m) => m.id === id)
    if (idx < 0) throw new Error(`Measurement ${id} not found`)
    const existing = canvas.measurements[idx]!
    const updated: Measurement = {
      ...existing,
      offset: newValue.offset ?? existing.offset,
      freeText: newValue.freeText ?? existing.freeText
    }
    // Immutable update — replace the array
    canvas.measurements = [
      ...canvas.measurements.slice(0, idx),
      updated,
      ...canvas.measurements.slice(idx + 1)
    ]
    this.emitter.emit('measurement:updated', updated)
    return updated
  }

  deleteMeasurement(canvasId: string, id: string): void {
    const canvas = this.nodes.get(canvasId)
    if (!canvas || canvas.type !== 'CANVAS' || !canvas.measurements) return
    const deleted = canvas.measurements.find((m) => m.id === id)
    canvas.measurements = canvas.measurements.filter((m) => m.id !== id)
    if (deleted) this.emitter.emit('measurement:deleted', deleted)
  }
```

- [ ] **Step 1b.5: Instrument `removeNode` for orphan-on-anchor-delete**

Find the existing `SceneGraph.removeNode` method. Before deleting the node from `this.nodes`, scan all CANVAS nodes for measurements whose anchors reference the node being removed; for each match, emit `measurement:broken`:

```typescript
removeNode(nodeId: string): void {
  // Detect broken-anchor measurements before the delete
  for (const canvas of this.nodes.values()) {
    if (canvas.type !== 'CANVAS' || !canvas.measurements) continue
    for (const m of canvas.measurements) {
      if (m.start.nodeId === nodeId || m.end.nodeId === nodeId) {
        this.emitter.emit('measurement:broken', {
          measurementId: m.id,
          brokenAnchorNodeId: nodeId,
          canvasId: canvas.id
        })
      }
    }
  }
  // … existing removeNode logic (the measurements are NOT deleted — orphan semantic) …
}
```

- [ ] **Step 1b.6: Instrument `reparent` for drop-on-cross-canvas-move**

Inside `reparent`, after the parent-validation guards but before mutating the tree, detect if the new parent's CANVAS ancestor differs from the old parent's CANVAS ancestor:

```typescript
reparent(nodeId: string, newParentId: string, index: number): void {
  // … existing parent-validation guards (including the SLICE rejection from Task 1.5) …

  const oldCanvasId = this.findAncestorCanvasId(nodeId)
  const newCanvasId = this.findAncestorCanvasId(newParentId)
  if (oldCanvasId && newCanvasId && oldCanvasId !== newCanvasId) {
    // Cross-canvas move — drop measurements anchored to nodeId on the source canvas
    const sourceCanvas = this.nodes.get(oldCanvasId)
    if (sourceCanvas?.type === 'CANVAS' && sourceCanvas.measurements) {
      const droppedIds: string[] = []
      sourceCanvas.measurements = sourceCanvas.measurements.filter((m) => {
        if (m.start.nodeId === nodeId || m.end.nodeId === nodeId) {
          droppedIds.push(m.id)
          return false
        }
        return true
      })
      if (droppedIds.length > 0) {
        this.emitter.emit('measurement:dropped', {
          measurementIds: droppedIds,
          sourceCanvasId: oldCanvasId,
          movedNodeId: nodeId
        })
      }
    }
  }

  // … existing reparent logic …
}

private findAncestorCanvasId(nodeId: string): string | undefined {
  let current = this.nodes.get(nodeId)
  while (current) {
    if (current.type === 'CANVAS') return current.id
    if (!current.parentId) return undefined
    current = this.nodes.get(current.parentId)
  }
  return undefined
}
```

- [ ] **Step 1b.7: Run the tests — confirm GREEN**

Run: `cd kova-open-pencil-1 && bun test ./tests/engine/scene-graph/measurement-system.test.ts`
Expected: all 11 tests pass.

- [ ] **Step 1b.8: Run the full engine suite — confirm no regression**

Run: `cd kova-open-pencil-1 && bun run test:unit 2>&1 | tail -10`
Expected: pass count = baseline + 5 (Task 1) + 11 (Task 1b) = baseline + 16, fail count = 0.

- [ ] **Step 1b.9: Run quality gates**

Run: `cd kova-open-pencil-1 && bun run check`
Expected: zero errors. No `any` types. No `Math.random()`.

- [ ] **Step 1b.10: Commit**

```bash
git add packages/core/src/scene-graph.ts tests/engine/scene-graph/measurement-system.test.ts
git commit -m "feat(engine): page-level measurement system on CANVAS (matches Figma — Cluster 07a Task 1b)"
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
  // Cluster 07a additions — per docs/kova-final-prds/07a-canvas-engine-core-renderer.md §7.2
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

## Task 5: createSlice refactor + addMeasurement tool + arrowStub

**Goal:** Refactor `createSlice` from a Frame-fabrication stub into a real SLICE NodeType creator. Add `addMeasurement` (a **page-level method wrapper** tool, not a NodeType creator — measurements live on CANVAS per Task 1b) and `arrowStub` (Phase-2 no-op).

**Files:**
- Modify: `packages/core/src/tools/create.ts:191-216` (createSlice refactor); append `arrowStub`
- Create: `packages/core/src/tools/measurement.ts` (new file — `addMeasurement` ToolDef)
- Test: `tests/engine/tools/create-slice-refactor.test.ts`, `tests/engine/tools/add-measurement-tool.test.ts`

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

- [ ] **Step 5.2: Write the failing tests — addMeasurement tool**

Create `kova-open-pencil-1/tests/engine/tools/add-measurement-tool.test.ts`:

```typescript
import { describe, test, expect } from 'bun:test'
import { addMeasurement } from '@kova/core/src/tools/measurement'
import { SceneGraph } from '@kova/core/src/scene-graph'
import { createFigmaAPI } from '@kova/core/src/figma-api-proxy'

describe('addMeasurement tool (page-level wrapper, not a NodeType creator)', () => {
  function setup() {
    const graph = new SceneGraph()
    const figma = createFigmaAPI(graph)
    const canvas = graph.createNode('CANVAS', graph.rootId)
    const nodeA = graph.createNode('RECTANGLE', canvas.id)
    const nodeB = graph.createNode('RECTANGLE', canvas.id)
    return { graph, figma, canvas, nodeA, nodeB }
  }

  test('creates a Measurement record (NOT a SceneNode)', () => {
    const { graph, figma, canvas, nodeA, nodeB } = setup()
    const result = addMeasurement.execute(figma, {
      canvas_id: canvas.id,
      start_node_id: nodeA.id,
      start_side: 'RIGHT',
      end_node_id: nodeB.id,
      end_side: 'LEFT'
    }) as { measurement_id: string }
    expect(result.measurement_id).toBeDefined()
    // The result is NOT a node — it has no `type: 'MEASUREMENT'` field
    expect((result as { type?: string }).type).toBeUndefined()
    // The Measurement record exists on the CANVAS measurement collection
    expect(graph.getMeasurements(canvas.id)).toHaveLength(1)
    expect(graph.getMeasurements(canvas.id)[0]!.id).toBe(result.measurement_id)
  })

  test('plumbs the offset_type + offset_value to a MeasurementOffset', () => {
    const { figma, canvas, nodeA, nodeB } = setup()
    const result = addMeasurement.execute(figma, {
      canvas_id: canvas.id,
      start_node_id: nodeA.id,
      start_side: 'RIGHT',
      end_node_id: nodeB.id,
      end_side: 'LEFT',
      offset_type: 'OUTER',
      offset_value: 12
    }) as { measurement_id: string }
    // Validation only — actual offset value is asserted via getMeasurements in scene-graph tests
    expect(result.measurement_id).toBeDefined()
  })

  test('returns { error } when anchor node is not on target canvas', () => {
    const { graph, figma, canvas, nodeA } = setup()
    const otherCanvas = graph.createNode('CANVAS', graph.rootId)
    const otherNode = graph.createNode('RECTANGLE', otherCanvas.id)
    const result = addMeasurement.execute(figma, {
      canvas_id: canvas.id,
      start_node_id: nodeA.id,
      start_side: 'RIGHT',
      end_node_id: otherNode.id,
      end_side: 'LEFT'
    }) as { error?: string }
    expect(result.error).toMatch(/anchor node not on target canvas/i)
  })
})
```

- [ ] **Step 5.3: Run the tests — confirm RED**

Run: `cd kova-open-pencil-1 && bun test ./tests/engine/tools/create-slice-refactor.test.ts ./tests/engine/tools/add-measurement-tool.test.ts`
Expected: 4 createSlice failures (`result.type !== 'FRAME'`) + 3 addMeasurement failures on missing export from `tools/measurement.ts`.

- [ ] **Step 5.4: Refactor createSlice + add arrowStub**

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

export const arrowStub = defineTool({
  name: 'arrow_stub',
  description: 'Phase-2-deferred. Arrow primitive not yet shipped.',
  params: {},
  execute: () => ({ error: 'Arrow primitive deferred to Phase 2' })
})
```

- [ ] **Step 5.5: Create `packages/core/src/tools/measurement.ts`**

```typescript
import { defineTool } from './schema'
import type { MeasurementOffset, MeasurementSide } from '../scene-graph'

export const addMeasurement = defineTool({
  name: 'add_measurement',
  mutates: true,
  description:
    'Add a measurement annotation between two SceneNodes on a CANVAS, anchored ' +
    'by side. Both anchor nodes must be descendants of the target canvas.',
  params: {
    canvas_id: { type: 'string', description: 'CANVAS node ID', required: true },
    start_node_id: { type: 'string', description: 'Anchor node ID for measurement start', required: true },
    start_side: {
      type: 'string',
      description: 'Edge of the start anchor: TOP, RIGHT, BOTTOM, or LEFT',
      required: true,
      enum: ['TOP', 'RIGHT', 'BOTTOM', 'LEFT']
    },
    end_node_id: { type: 'string', description: 'Anchor node ID for measurement end', required: true },
    end_side: {
      type: 'string',
      description: 'Edge of the end anchor: TOP, RIGHT, BOTTOM, or LEFT',
      required: true,
      enum: ['TOP', 'RIGHT', 'BOTTOM', 'LEFT']
    },
    offset_type: {
      type: 'string',
      description: 'Offset variant — INNER (relative to anchor bounds) or OUTER (fixed pixel distance)',
      enum: ['INNER', 'OUTER']
    },
    offset_value: {
      type: 'number',
      description: 'Offset magnitude — INNER expects -1..1, OUTER expects a non-zero pixel distance'
    },
    free_text: { type: 'string', description: 'Override label (empty = use auto-computed value)' }
  },
  execute: (figma, args) => {
    try {
      const offset: MeasurementOffset | undefined =
        args.offset_type === 'INNER'
          ? { type: 'INNER', relative: (args.offset_value as number) ?? 0 }
          : args.offset_type === 'OUTER'
          ? { type: 'OUTER', fixed: (args.offset_value as number) ?? 8 }
          : undefined
      const canvas = figma.getNodeById(args.canvas_id as string)
      if (!canvas) return { error: `CANVAS ${args.canvas_id} not found` }
      // figma.currentPage delegates to the SceneGraph measurement methods.
      // Either canvas IS currentPage, or we use the SceneGraph directly per Task 7.
      const m = figma.currentPage.addMeasurement(
        { node: figma.getNodeById(args.start_node_id as string)!, side: args.start_side as MeasurementSide },
        { node: figma.getNodeById(args.end_node_id as string)!, side: args.end_side as MeasurementSide },
        { offset, freeText: (args.free_text as string) ?? '' }
      )
      return { measurement_id: m.id }
    } catch (e) {
      return { error: (e as Error).message }
    }
  }
})
```

(Task 7 ships `figma.createSlice()` + the `figma.currentPage.*` measurement methods on the proxy. Tests in Steps 5.1 + 5.2 will not pass until Task 7 lands.)

**Reordering note:** Tasks 5 + 7 are coupled — the proxy must exist before the create-tool/add-measurement tool tests pass. In execution, swap Task 7 to run before Task 5, OR land them in the same batch commit. The plan keeps the task numbers for clarity; the executor's job is to recognize the dep.

- [ ] **Step 5.6: Run the tests — confirm GREEN (after Task 7's proxy work lands)**

Run: `cd kova-open-pencil-1 && bun test ./tests/engine/tools/create-slice-refactor.test.ts ./tests/engine/tools/add-measurement-tool.test.ts`
Expected: 4 + 3 tests pass.

- [ ] **Step 5.7: Commit**

```bash
git add packages/core/src/tools/create.ts packages/core/src/tools/measurement.ts tests/engine/tools/create-slice-refactor.test.ts tests/engine/tools/add-measurement-tool.test.ts
git commit -m "feat(engine): refactor createSlice to SLICE NodeType + add addMeasurement tool + arrowStub (Cluster 07a Task 5)"
```

---

## Task 6: Registry extensions

**Goal:** Extend `EXTENDED_TOOLS` to include `scaleNode`, `addMeasurement` (the page-level method wrapper, not a NodeType creator), `arrowStub`. Verify `CORE_TOOLS` is unchanged (token-bloat avoidance).

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

  test('EXTENDED_TOOLS contains addMeasurement', () => {
    expect(EXTENDED_TOOLS.some((t) => t.name === 'add_measurement')).toBe(true)
  })

  test('EXTENDED_TOOLS contains arrowStub', () => {
    expect(EXTENDED_TOOLS.some((t) => t.name === 'arrow_stub')).toBe(true)
  })

  test('EXTENDED_TOOLS does NOT contain a legacy create_measurement (Figma-aligned rename to add_measurement)', () => {
    expect(EXTENDED_TOOLS.some((t) => t.name === 'create_measurement')).toBe(false)
  })

  test('CORE_TOOLS does NOT contain new tools (token-bloat avoidance)', () => {
    expect(CORE_TOOLS.some((t) => t.name === 'scale_node')).toBe(false)
    expect(CORE_TOOLS.some((t) => t.name === 'add_measurement')).toBe(false)
    expect(CORE_TOOLS.some((t) => t.name === 'arrow_stub')).toBe(false)
  })

  test('ALL_TOOLS is union of CORE_TOOLS and EXTENDED_TOOLS', () => {
    expect(ALL_TOOLS.length).toBe(CORE_TOOLS.length + EXTENDED_TOOLS.length)
  })
})
```

- [ ] **Step 6.2: Run the tests — confirm RED**

Run: `cd kova-open-pencil-1 && bun test ./tests/engine/tools/registry.test.ts`
Expected: 3 failures on missing tools in EXTENDED_TOOLS; 1 success (`create_measurement` legacy-rename test passes because it's not present).

- [ ] **Step 6.3: Extend the registry**

Edit `packages/core/src/tools/registry.ts`:

```typescript
import {
  createShape, render, createComponent, createInstance,
  createPage, createVector, createSlice, arrowStub, fetchIconsTool, insertIcon, searchIconsTool
} from './create'
import {
  // … existing imports …
  scaleNode
} from './modify'
import { addMeasurement } from './measurement'

// … existing CORE_TOOLS unchanged …

export const EXTENDED_TOOLS: ToolDef[] = [
  // … existing entries …
  createSlice,           // already present — refactored body
  addMeasurement,        // NEW (page-level wrapper, not a NodeType creator)
  scaleNode,             // NEW
  arrowStub,             // NEW (Phase-2 no-op)
]
```

- [ ] **Step 6.4: Run the tests — confirm GREEN**

Run: `cd kova-open-pencil-1 && bun test ./tests/engine/tools/registry.test.ts`
Expected: 6 tests pass.

- [ ] **Step 6.5: Run engine suite + quality gates**

Run: `cd kova-open-pencil-1 && bun run test:unit && bun run check`
Expected: green.

- [ ] **Step 6.6: Commit**

```bash
git add packages/core/src/tools/registry.ts tests/engine/tools/registry.test.ts
git commit -m "feat(engine): register scaleNode + addMeasurement + arrowStub in EXTENDED_TOOLS (Cluster 07a)"
```

---

## Task 7: figma-api-proxy exposure

**Goal:** Expose `figma.createSlice()`, the 5 page-level measurement methods on `figma.currentPage` (`addMeasurement` / `getMeasurements` / `getMeasurementsForNode` / `editMeasurement` / `deleteMeasurement`), the new SceneNode property accessors (`aspectRatio` / `includeInExports` / `pageBackgroundVisible`), and `nodeProxy.scale(factor)` on the proxy. **Run this BEFORE Task 5 OR fold both into one commit** — Task 5's tests depend on the proxy methods.

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

  test('figma.currentPage.addMeasurement returns a Measurement record (NOT a node proxy)', () => {
    const graph = new SceneGraph()
    const figma = createFigmaAPI(graph)
    const canvas = figma.currentPage  // CANVAS-typed FigmaPageProxy
    const a = figma.createRectangle()
    const b = figma.createRectangle()
    canvas.appendChild(a)
    canvas.appendChild(b)
    const m = canvas.addMeasurement(
      { node: a, side: 'RIGHT' },
      { node: b, side: 'LEFT' }
    )
    // Returned shape is a Measurement record, not a FigmaNodeProxy — no `type: 'MEASUREMENT'` field
    expect(m.id).toBeDefined()
    expect(m.start.nodeId).toBe(a.id)
    expect(m.end.nodeId).toBe(b.id)
    expect((m as { type?: string }).type).toBeUndefined()
  })

  test('figma.currentPage.getMeasurements returns the canvas collection', () => {
    const graph = new SceneGraph()
    const figma = createFigmaAPI(graph)
    const canvas = figma.currentPage
    const a = figma.createRectangle()
    const b = figma.createRectangle()
    canvas.appendChild(a)
    canvas.appendChild(b)
    canvas.addMeasurement({ node: a, side: 'TOP' }, { node: b, side: 'BOTTOM' })
    expect(canvas.getMeasurements()).toHaveLength(1)
  })

  test('figma.currentPage.editMeasurement updates offset + freeText only', () => {
    const graph = new SceneGraph()
    const figma = createFigmaAPI(graph)
    const canvas = figma.currentPage
    const a = figma.createRectangle()
    const b = figma.createRectangle()
    canvas.appendChild(a)
    canvas.appendChild(b)
    const m = canvas.addMeasurement({ node: a, side: 'TOP' }, { node: b, side: 'BOTTOM' })
    const updated = canvas.editMeasurement(m.id, {
      offset: { type: 'OUTER', fixed: 16 },
      freeText: '16px'
    })
    expect(updated.offset).toEqual({ type: 'OUTER', fixed: 16 })
    expect(updated.freeText).toBe('16px')
  })

  test('figma.currentPage.deleteMeasurement removes the record', () => {
    const graph = new SceneGraph()
    const figma = createFigmaAPI(graph)
    const canvas = figma.currentPage
    const a = figma.createRectangle()
    const b = figma.createRectangle()
    canvas.appendChild(a)
    canvas.appendChild(b)
    const m = canvas.addMeasurement({ node: a, side: 'TOP' }, { node: b, side: 'BOTTOM' })
    expect(canvas.getMeasurements()).toHaveLength(1)
    canvas.deleteMeasurement(m.id)
    expect(canvas.getMeasurements()).toHaveLength(0)
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
import type {
  Measurement,
  MeasurementSide,
  MeasurementOffset
} from './scene-graph'

export interface FigmaAPI {
  // … existing methods …
  createSlice(): FigmaNodeProxy
  /** Currently-active CANVAS as a FigmaPageProxy (PageNode-equivalent). */
  currentPage: FigmaPageProxy
}

export interface FigmaNodeProxy {
  // … existing properties …
  aspectRatio: number | null
  includeInExports: boolean
  pageBackgroundVisible: boolean
  scale(factor: number): void
}

/** CANVAS-typed FigmaNodeProxy with the 5 page-level measurement methods. */
export interface FigmaPageProxy extends FigmaNodeProxy {
  addMeasurement(
    start: { node: FigmaNodeProxy; side: MeasurementSide },
    end: { node: FigmaNodeProxy; side: MeasurementSide },
    options?: { offset?: MeasurementOffset; freeText?: string }
  ): Measurement
  getMeasurements(): Measurement[]
  getMeasurementsForNode(node: FigmaNodeProxy): Measurement[]
  editMeasurement(
    id: string,
    newValue: { offset?: MeasurementOffset; freeText?: string }
  ): Measurement
  deleteMeasurement(id: string): void
}
```

- [ ] **Step 7.6: Implement the proxy methods**

Edit `packages/core/src/figma-api-proxy.ts` — find the `createFigmaAPI` function and the `FigmaNodeProxy` class. Add:

```typescript
// In createFigmaAPI / FigmaAPI implementation object:
createSlice: (): FigmaNodeProxy => {
  const node = graph.createNode('SLICE', graph.rootId)
  return new FigmaNodeProxy(node.id, graph)
},

// figma.currentPage returns a FigmaPageProxy wrapping the active CANVAS.
get currentPage(): FigmaPageProxy {
  return new FigmaPageProxy(graph.activeCanvasId, graph)
}
```

Add the `FigmaPageProxy` class (extends `FigmaNodeProxy`):

```typescript
export class FigmaPageProxy extends FigmaNodeProxy {
  addMeasurement(
    start: { node: FigmaNodeProxy; side: MeasurementSide },
    end: { node: FigmaNodeProxy; side: MeasurementSide },
    options?: { offset?: MeasurementOffset; freeText?: string }
  ): Measurement {
    return this._graph.addMeasurement(
      this.id,
      { nodeId: start.node.id, side: start.side },
      { nodeId: end.node.id, side: end.side },
      options
    )
  }

  getMeasurements(): Measurement[] {
    return this._graph.getMeasurements(this.id)
  }

  getMeasurementsForNode(node: FigmaNodeProxy): Measurement[] {
    return this._graph.getMeasurementsForNode(node.id)
  }

  editMeasurement(
    id: string,
    newValue: { offset?: MeasurementOffset; freeText?: string }
  ): Measurement {
    return this._graph.editMeasurement(this.id, id, newValue)
  }

  deleteMeasurement(id: string): void {
    this._graph.deleteMeasurement(this.id, id)
  }
}
```

(`MEASUREMENT` is **not** a NodeType, so there is no `figma.createMeasurement()` factory. Measurements are created via `figma.currentPage.addMeasurement(...)` only.)

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
git commit -m "feat(engine): expose createSlice + currentPage measurement methods + scale + new properties on FigmaAPI proxy (Cluster 07a)"
```

---

## Task 8: Kiwi schema version bump + extensions

**Goal:** Bump `SCHEMA_VERSION` to `2.0.0`. Add SLICE enum variant (only — MEASUREMENT is not a NodeType per the Figma-aligned model). Add `aspect_ratio`, `include_in_exports`, `page_background_visible`, `measurements` fields to SceneNode struct. Add new structs: `Measurement`, `MeasurementAnchor`, `MeasurementOffset` (tagged union with INNER/OUTER variants), `MeasurementSide` enum. Add `open_type_features`, `link_href`, `list_type`, `list_indent` to CharacterStyleOverride. Implement bidirectional conversion + the unknown-NodeType skip fallback + fail-soft handling for corrupt MeasurementSide enum values.

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

describe('Kiwi round-trip: SLICE + page-level measurements + masked group', () => {
  test('serialize → deserialize → re-serialize is byte-equal', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    const slice = graph.createNode('SLICE', page.id, { x: 10, y: 20, width: 100, height: 50, name: 'Hero' })
    const nodeA = graph.createNode('RECTANGLE', page.id)
    const nodeB = graph.createNode('RECTANGLE', page.id)
    // 2 measurements: one default freeText, one with override
    graph.addMeasurement(page.id, { nodeId: nodeA.id, side: 'RIGHT' }, { nodeId: nodeB.id, side: 'LEFT' })
    graph.addMeasurement(
      page.id,
      { nodeId: nodeA.id, side: 'TOP' },
      { nodeId: nodeB.id, side: 'BOTTOM' },
      { offset: { type: 'OUTER', fixed: 12 }, freeText: '120px' }
    )
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

  test('Measurement records survive round trip with both offset variants', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    const a = graph.createNode('RECTANGLE', page.id)
    const b = graph.createNode('RECTANGLE', page.id)
    const m1 = graph.addMeasurement(
      page.id,
      { nodeId: a.id, side: 'TOP' },
      { nodeId: b.id, side: 'BOTTOM' },
      { offset: { type: 'INNER', relative: 0.5 } }
    )
    const m2 = graph.addMeasurement(
      page.id,
      { nodeId: a.id, side: 'LEFT' },
      { nodeId: b.id, side: 'RIGHT' },
      { offset: { type: 'OUTER', fixed: 24 }, freeText: '24px gap' }
    )

    const bytes = serialize(graph)
    const restored = deserialize(bytes)
    const measurements = restored.getMeasurements(page.id)
    expect(measurements).toHaveLength(2)

    const r1 = measurements.find((m) => m.id === m1.id)!
    const r2 = measurements.find((m) => m.id === m2.id)!
    expect(r1.offset).toEqual({ type: 'INNER', relative: 0.5 })
    expect(r1.freeText).toBe('')
    expect(r2.offset).toEqual({ type: 'OUTER', fixed: 24 })
    expect(r2.freeText).toBe('24px gap')
    expect(r2.start.side).toBe('LEFT')
    expect(r2.end.side).toBe('RIGHT')
  })

  test('Corrupted MeasurementSide enum value fails-soft (skip that measurement, parent loads)', () => {
    // Build bytes manually with a bad MeasurementSide enum value (e.g. 99).
    // The reader must skip that measurement and load the rest of the canvas.
    // (Test helper: synthesizes the bytes via a hand-rolled kiwi encoder.)
    const bytes = buildSnapshotWithBadMeasurementSide()
    const warnSpy = mock(() => {})
    const original = console.warn
    console.warn = warnSpy
    try {
      const graph = deserialize(bytes)
      expect(graph).toBeDefined()
      expect(warnSpy).toHaveBeenCalled()
      const page = graph.getPages()[0]
      // Bad measurement was dropped; any sibling measurements survive
      const ms = graph.getMeasurements(page.id)
      expect(ms.every((m) => ['TOP', 'RIGHT', 'BOTTOM', 'LEFT'].includes(m.start.side))).toBe(true)
    } finally {
      console.warn = original
    }
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

Add enum tag for `SLICE` (next-available integer value — kiwi enums are append-only; never renumber existing entries). **MEASUREMENT is not added to the NodeType enum** per the Figma-aligned model.

Add struct fields + new structs:

```
enum NodeType {
  # … existing entries …
  SLICE = 18  # next free tag
}

enum MeasurementSide {
  TOP = 0
  RIGHT = 1
  BOTTOM = 2
  LEFT = 3
}

message MeasurementOffset {
  string type  # 'INNER' or 'OUTER'
  float? relative  # populated when type == 'INNER'
  float? fixed     # populated when type == 'OUTER'
}

struct MeasurementAnchor {
  string node_id = 1
  MeasurementSide side = 2
}

struct Measurement {
  string id = 1
  MeasurementAnchor start = 2
  MeasurementAnchor end = 3
  MeasurementOffset offset = 4
  string free_text = 5
}

struct SceneNode {
  # … existing fields …
  float? aspect_ratio = 70  # use next free tag
  bool include_in_exports = 71
  bool page_background_visible = 72
  Measurement[]? measurements = 73  # populated only on CANVAS-typed nodes
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
    measurements: node.measurements?.map(measurementToKiwi),
  }
}

function measurementToKiwi(m: Measurement): KiwiMeasurement {
  return {
    id: m.id,
    start: { node_id: m.start.nodeId, side: measurementSideToKiwi(m.start.side) },
    end: { node_id: m.end.nodeId, side: measurementSideToKiwi(m.end.side) },
    offset: measurementOffsetToKiwi(m.offset),
    free_text: m.freeText,
  }
}

function measurementOffsetToKiwi(o: MeasurementOffset): KiwiMeasurementOffset {
  if (o.type === 'INNER') return { type: 'INNER', relative: o.relative }
  return { type: 'OUTER', fixed: o.fixed }
}

function measurementSideToKiwi(side: MeasurementSide): number {
  switch (side) {
    case 'TOP': return 0
    case 'RIGHT': return 1
    case 'BOTTOM': return 2
    case 'LEFT': return 3
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
  const measurements = k.measurements
    ?.map(kiwiToMeasurement)
    .filter((m): m is Measurement => m !== null)  // drop fail-soft skips

  return {
    // … existing field assignments …
    aspectRatio: k.aspect_ratio ?? null,
    includeInExports: k.include_in_exports ?? true,
    pageBackgroundVisible: k.page_background_visible ?? true,
    measurements,
  }
}

function kiwiToMeasurement(k: KiwiMeasurement): Measurement | null {
  const startSide = kiwiToMeasurementSide(k.start.side)
  const endSide = kiwiToMeasurementSide(k.end.side)
  if (!startSide || !endSide) {
    console.warn(`[kiwi] Measurement ${k.id} has corrupted MeasurementSide enum; skipping.`)
    return null
  }
  return {
    id: k.id,
    start: { nodeId: k.start.node_id, side: startSide },
    end: { nodeId: k.end.node_id, side: endSide },
    offset: kiwiToMeasurementOffset(k.offset),
    freeText: k.free_text,
  }
}

function kiwiToMeasurementSide(value: number): MeasurementSide | null {
  switch (value) {
    case 0: return 'TOP'
    case 1: return 'RIGHT'
    case 2: return 'BOTTOM'
    case 3: return 'LEFT'
    default: return null  // fail-soft on corrupted enum
  }
}

function kiwiToMeasurementOffset(k: KiwiMeasurementOffset): MeasurementOffset {
  if (k.type === 'INNER') return { type: 'INNER', relative: k.relative ?? 0 }
  return { type: 'OUTER', fixed: k.fixed ?? 8 }
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
    default:
      console.warn(`[kiwi] Unknown NodeType enum value ${value}; node skipped.`)
      return null
  }
}

// In the deserialize main loop, skip nodes returning null from kiwiToNodeType.
```

- [ ] **Step 8.8: Run the kiwi tests — confirm GREEN**

Run: `cd kova-open-pencil-1 && bun test ./tests/engine/kiwi/`
Expected: 1 + 4 + 1 = 6 tests pass (version-bump 1, round-trip with measurement variants 4, unknown-enum 1).

- [ ] **Step 8.9: Run engine suite + quality gates**

Run: `cd kova-open-pencil-1 && bun run test:unit && bun run check`
Expected: green.

- [ ] **Step 8.10: Commit**

```bash
git add packages/core/src/kiwi/ tests/engine/kiwi/
git commit -m "feat(engine): bump Kiwi schema to v2.0.0; add SLICE enum + page-level Measurement structs + new SceneNode + CharacterStyleOverride fields (Cluster 07a)"
```

- [ ] **Step 8.11: format_version coordination with Cluster 09 snapshot migration (C-LOW07a.3)**

Files:
- Modify: `packages/core/src/kiwi/protocol.ts` (exports `FORMAT_VERSION` const matching the Kiwi schema bump from Step 8.6)
- Modify: `docs/kova-final-impl-plans/09-version-history-and-trash-plan.md` (cross-link to snapshot-migration registry; Cluster 09 W4 fix agent applies this)

Contract:
- Every Kiwi schema bump in `packages/core/src/kiwi/` MUST bump the exported `FORMAT_VERSION` const (semver — additive = minor, breaking = major).
- Every bump REQUIRES a registered migration in Cluster 09's `snapshot-migration-registry.ts` (keyed by previous `formatVersion`).
- `loadSnapshot(snap)` in Cluster 09 reads `snap.formatVersion`, looks up the registered migration chain, and applies migrations in order until `snap.formatVersion === FORMAT_VERSION`.
- Loading a snapshot with `formatVersion > FORMAT_VERSION` (newer client wrote it; current client cannot read) MUST surface `error_code: 'snapshot_format_too_new'` toast and refuse to load.

```ts
// packages/core/src/kiwi/protocol.ts (EXTEND — exported alongside schema)
export const FORMAT_VERSION = '2.0.0' as const  // bump in lockstep with Step 8.6 Kiwi schema version
```

Test (engine-side guard against silent bump drift):

```ts
// tests/engine/kiwi/format-version-coordination.test.ts
import { describe, test, expect } from 'bun:test'
import { FORMAT_VERSION, KIWI_SCHEMA_VERSION } from '@/packages/core/src/kiwi/protocol'

describe('format_version ↔ Kiwi schema lockstep (C-LOW07a.3)', () => {
  test('FORMAT_VERSION matches KIWI_SCHEMA_VERSION exactly', () => {
    expect(FORMAT_VERSION).toBe(KIWI_SCHEMA_VERSION)
  })
})
```

Commit (separate from Step 8.10):

```bash
git add packages/core/src/kiwi/protocol.ts tests/engine/kiwi/format-version-coordination.test.ts
git commit -m "feat(engine): export FORMAT_VERSION lockstep with Kiwi schema; Plan 09 snapshot migration coord (C-LOW07a.3)"
```

Cross-cluster handoff: Wave 4 Cluster 09 fix agent MUST add to Plan 09 a `snapshot-migration-registry.ts` task that includes a `'1.0.0' → '2.0.0'` migration entry for the SLICE + page-level Measurement schema additions. Reference: PR title in Plan 09 SHOULD include `(coord: Cluster 07a FORMAT_VERSION 2.0.0)`.

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

- [ ] **Step 9.13: Mask-compositing perf benchmark (C-LOW07a.2)**

Files:
- Create: `tests/bench/mask-compositing.bench.ts`

Budget: render must complete in < 16ms (60fps) for 100 / 200 / 300 masked nodes inside a single frame. Catches accidental O(n²) compositing regressions in the sibling-traversal pass.

```ts
// tests/bench/mask-compositing.bench.ts
import { describe, bench } from 'bun:test'
import { SceneGraph } from '@/packages/core/src/scene-graph'
import { Renderer } from '@/packages/core/src/renderer/renderer'

function makeMaskedScene(n: number): { graph: SceneGraph, renderer: Renderer, frameId: string } {
  const graph = new SceneGraph()
  const canvas = graph.createNode('CANVAS', graph.rootId)
  const frame = graph.createNode('FRAME', canvas.id, { width: 1200, height: 800, clipsContent: true })
  for (let i = 0; i < n; i++) {
    const mask = graph.createNode('VECTOR', frame.id, { isMask: true, maskType: 'ALPHA', x: i * 10, y: i * 10, width: 80, height: 80 })
    void mask
    graph.createNode('RECTANGLE', frame.id, { x: i * 10, y: i * 10, width: 80, height: 80, fills: [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5, a: 1 } }] })
  }
  const renderer = new Renderer({ canvas: document.createElement('canvas') })
  return { graph, renderer, frameId: frame.id }
}

describe('mask compositing perf (C-LOW07a.2 — 50–300 nodes, 60fps budget)', () => {
  for (const n of [100, 200, 300]) {
    bench(`render ${n} masked nodes < 16ms`, () => {
      const { renderer, graph, frameId } = makeMaskedScene(n)
      const t0 = performance.now()
      renderer.renderNode(graph.getNodeById(frameId)!)
      const dt = performance.now() - t0
      if (dt >= 16) throw new Error(`render exceeded budget: ${dt.toFixed(2)}ms (n=${n})`)
    })
  }
})
```

Commit (separate from Step 9.12):

```bash
git add tests/bench/mask-compositing.bench.ts
git commit -m "test(engine): mask-compositing perf benchmark — 100/200/300 nodes < 16ms (C-LOW07a.2)"
```

Wire into CI gate: extend `bun run test:bench` script in package.json to include `tests/bench/`. Add `bun run test:bench` to the `bun run check` chain or gate it behind a separate `bun run check:perf` step.

- [ ] **Step 9.14: `node:errored` event surface (C-LOW07a.4 — Cluster 11 ToastStack dep)**

Files:
- Modify: `packages/core/src/scene-graph.ts` (extend `SceneGraphEvents` union; add emit sites)
- Modify: `packages/core/src/renderer/renderer.ts` (catch render exceptions; emit `node:errored`)
- Create: `tests/engine/scene-graph/node-errored.test.ts`

Event surface:

```ts
// packages/core/src/scene-graph.ts (EXTEND SceneGraphEvents)
export interface NodeErroredEvent {
  type: 'node:errored'
  nodeId: string
  errorCode: 'render_failed' | 'invalid_state'
  message: string
}
```

Emit triggers (engine-side):
- `render_failed` — Renderer catches an exception thrown inside a node's draw function; emits `node:errored` with the error message; SKIPS the node + continues rendering siblings (defensive renderer — never let one bad node halt the frame).
- `invalid_state` — Scene-graph invariant violated (orphan parent ref, cycle detected, leaf-node received `appendChild` against the guard). Emitted from inside `appendChild`, `reparent`, and the leaf-guard check.

Subscriber (NOT in this PRD — Cluster 11 owns):
- `<ToastStack>` (Cluster 11) subscribes via `editorBus.on('node:errored', ...)`; surfaces a toast with `variant: 'error'` + `code: errorCode` + the message body. Founder ratification 2026-05-17 §12.x: per-node render failures should be a recoverable in-app surface, NOT a global crash.

Tests:

```ts
// tests/engine/scene-graph/node-errored.test.ts
import { describe, test, expect, beforeEach } from 'bun:test'
import { SceneGraph } from '@/packages/core/src/scene-graph'
import { Renderer } from '@/packages/core/src/renderer/renderer'

describe('node:errored event surface (C-LOW07a.4)', () => {
  let graph: SceneGraph
  beforeEach(() => { graph = new SceneGraph() })

  test('renderer catches draw exception; emits node:errored with render_failed; sibling renders complete', () => {
    const canvas = graph.createNode('CANVAS', graph.rootId)
    const good = graph.createNode('RECTANGLE', canvas.id, { fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0, a: 1 } }] })
    const bad = graph.createNode('RECTANGLE', canvas.id)
    // Inject a draw failure on `bad`:
    graph.patchNode(bad.id, { __drawHook: () => { throw new Error('boom') } })

    const events: any[] = []
    graph.emitter.on('node:errored', (e) => events.push(e))

    const renderer = new Renderer({ canvas: document.createElement('canvas') })
    renderer.renderNode(graph.getNodeById(canvas.id)!)

    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({
      type: 'node:errored',
      nodeId: bad.id,
      errorCode: 'render_failed',
      message: 'boom',
    })
    // sibling `good` still rendered — pixel-check or call-count assertion
    expect(renderer.lastFrameDrawnNodeIds).toContain(good.id)
  })

  test('appendChild on a leaf node emits node:errored with invalid_state and throws', () => {
    const canvas = graph.createNode('CANVAS', graph.rootId)
    const text = graph.createNode('TEXT', canvas.id)  // leaf
    const events: any[] = []
    graph.emitter.on('node:errored', (e) => events.push(e))
    expect(() => graph.appendChild(text.id, graph.createNode('RECTANGLE', canvas.id).id)).toThrow()
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({
      type: 'node:errored',
      nodeId: text.id,
      errorCode: 'invalid_state',
    })
    expect(events[0].message).toMatch(/leaf/i)
  })
})
```

Commit:

```bash
git add packages/core/src/scene-graph.ts packages/core/src/renderer/renderer.ts tests/engine/scene-graph/node-errored.test.ts
git commit -m "feat(engine): node:errored event surface for renderer + scene-graph invariant violations (C-LOW07a.4)"
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

Ratified 2026-05-14 (`docs/kova-final-prds/00c-COMPREHENSIVE_AUDIT_REPORT.md §895`).
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
      'page-level Measurement',  // NEW — Figma-aligned data model
      'MeasurementSide',
      'aspectRatio',
      'includeInExports',
      'pageBackgroundVisible',
      'CharacterStyleOverride',
      'scaleNode',
      'createSlice',
      'addMeasurement',
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
in `kova-open-pencil-1/docs/kova-final-prds/00c-COMPREHENSIVE_AUDIT_REPORT.md §895` permits
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
| Add SLICE NodeType; default factory; leaf-node reparent rejection | `src/scene-graph.ts`, `src/scene-graph-instances.ts` | drafted |
| Add page-level Measurement system on CANVAS: new types (Measurement / MeasurementSide / MeasurementOffset / MeasurementAnchor); `SceneNode.measurements` field; 5 SceneGraph methods (`addMeasurement` / `getMeasurements` / `getMeasurementsForNode` / `editMeasurement` / `deleteMeasurement`) matching Figma's PageNode API verbatim; orphan-on-anchor-delete + drop-on-cross-canvas-move lifecycle events | `src/scene-graph.ts` | drafted (separate PR — verbatim port of Figma's PageNode measurement API; high upstream value because it implements an existing Figma standard) |
| Add `aspectRatio` / `includeInExports` / `pageBackgroundVisible` fields on SceneNode | `src/scene-graph.ts` | drafted (single PR — small change set) |
| Extend `CharacterStyleOverride` with `openTypeFeatures` + `linkHref` + `listType` + `listIndent` (export `ListType`) | `src/scene-graph.ts` | drafted (single PR) |
| Add `scaleNode` modify tool; recursive scale walk | `src/tools/modify.ts`, `src/tools/registry.ts` | drafted |
| Refactor `createSlice` from Frame-stub to SLICE NodeType | `src/tools/create.ts`, `src/tools/registry.ts` | drafted |
| Add `addMeasurement` ToolDef (page-level wrapper — calls `figma.currentPage.addMeasurement`; NOT a NodeType creator) | `src/tools/measurement.ts` (NEW), `src/tools/registry.ts` | drafted |
| Add `arrowStub` registry slot (Phase-2-deferred no-op) | `src/tools/create.ts`, `src/tools/registry.ts` | held — submit after arrow primitive ships |
| Sibling-traversal mask compositing (all 3 maskType branches) | `src/renderer/scene.ts`, `src/renderer/renderer.ts` | drafted (highest-value upstream contribution — data model was already in place) |
| Kiwi schema v2.0.0: SLICE enum + new Measurement struct + MeasurementSide enum + MeasurementOffset union + new SceneNode fields; backwards-compat skip on unknown NodeType + fail-soft MeasurementSide enum | `src/kiwi/protocol.ts`, `src/kiwi/kiwi-schema/schema.ts`, `src/kiwi/kiwi-convert.ts` | drafted |
| `figma-api-proxy` exposure: `figma.createSlice()` + `figma.currentPage.*` measurement methods (5 PageNode-equivalent methods on FigmaPageProxy class) + new SceneNode property accessors + `FigmaNodeProxy.scale` | `src/figma-api.ts`, `src/figma-api-proxy.ts` | drafted |

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
  test('host loads SLICE + page-level measurements + masked group without error', () => {
    setActivePinia(createPinia())

    // Build a graph with each Cluster 07a addition
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    graph.createNode('SLICE', page.id, { x: 0, y: 0, width: 100, height: 50, name: 'Hero export' })
    // Page-level measurement anchored to two RECTANGLES
    const nodeA = graph.createNode('RECTANGLE', page.id, { x: 0, y: 0, width: 50, height: 50, name: 'A' })
    const nodeB = graph.createNode('RECTANGLE', page.id, { x: 100, y: 0, width: 50, height: 50, name: 'B' })
    graph.addMeasurement(
      page.id,
      { nodeId: nodeA.id, side: 'RIGHT' },
      { nodeId: nodeB.id, side: 'LEFT' }
    )
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
    expect(slices.length).toBe(1)
    expect(slices[0].name).toBe('Hero export')

    // Measurements are queried via the page-level API (NOT findAll over nodes)
    const restoredPage = restored.getPages()[0]
    const measurements = restored.getMeasurements(restoredPage.id)
    expect(measurements.length).toBe(1)
    expect(measurements[0]!.start.side).toBe('RIGHT')
    expect(measurements[0]!.end.side).toBe('LEFT')
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

- [ ] **Step 12.3: Write the integration test — measurement persistence + lifecycle**

Create `kova-open-pencil-1/tests/integration/engine-host/measurement-persistence.test.ts`:

```typescript
import { describe, test, expect } from 'bun:test'
import { SceneGraph } from '@kova/core/src/scene-graph'
import { serialize, deserialize } from '@kova/core/src/kiwi/codec'

describe('Integration: Measurement persistence + lifecycle across save/load', () => {
  test('measurement anchors + offset + freeText survive Kiwi round-trip', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    const a = graph.createNode('RECTANGLE', page.id, { x: 0, y: 0, width: 50, height: 50 })
    const b = graph.createNode('RECTANGLE', page.id, { x: 100, y: 100, width: 50, height: 50 })
    const m = graph.addMeasurement(
      page.id,
      { nodeId: a.id, side: 'RIGHT' },
      { nodeId: b.id, side: 'LEFT' },
      { offset: { type: 'OUTER', fixed: 16 }, freeText: '50px gap' }
    )

    const bytes = serialize(graph)
    const restored = deserialize(bytes)
    const measurements = restored.getMeasurements(restored.getPages()[0].id)
    expect(measurements).toHaveLength(1)
    const r = measurements[0]!
    expect(r.id).toBe(m.id)
    expect(r.start.nodeId).toBe(a.id)
    expect(r.start.side).toBe('RIGHT')
    expect(r.end.side).toBe('LEFT')
    expect(r.offset).toEqual({ type: 'OUTER', fixed: 16 })
    expect(r.freeText).toBe('50px gap')
  })

  test('measurement with default freeText (empty = auto-compute) round-trips', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    const a = graph.createNode('RECTANGLE', page.id)
    const b = graph.createNode('RECTANGLE', page.id)
    graph.addMeasurement(page.id, { nodeId: a.id, side: 'TOP' }, { nodeId: b.id, side: 'BOTTOM' })

    const bytes = serialize(graph)
    const restored = deserialize(bytes)
    const measurements = restored.getMeasurements(restored.getPages()[0].id)
    expect(measurements[0]!.freeText).toBe('')
  })

  test('orphan-on-anchor-delete: removing nodeA orphans the measurement (broken-anchor state); persists across save/load', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    const a = graph.createNode('RECTANGLE', page.id)
    const b = graph.createNode('RECTANGLE', page.id)
    const m = graph.addMeasurement(page.id, { nodeId: a.id, side: 'TOP' }, { nodeId: b.id, side: 'BOTTOM' })
    graph.removeNode(a.id)
    expect(graph.getMeasurements(page.id)).toHaveLength(1)
    // Anchor still points to the (now deleted) node ID

    const bytes = serialize(graph)
    const restored = deserialize(bytes)
    const restoredMs = restored.getMeasurements(restored.getPages()[0].id)
    expect(restoredMs).toHaveLength(1)
    expect(restoredMs[0]!.start.nodeId).toBe(a.id) // broken anchor preserved across reload
    expect(restored.getNode(a.id)).toBeUndefined() // node is actually gone
  })

  test('drop-on-cross-canvas-move: reparenting to another CANVAS drops source measurements; persists across save/load', () => {
    const graph = new SceneGraph()
    const sourcePage = graph.getPages()[0]
    const otherPage = graph.addPage('Other')
    const a = graph.createNode('RECTANGLE', sourcePage.id)
    const b = graph.createNode('RECTANGLE', sourcePage.id)
    graph.addMeasurement(sourcePage.id, { nodeId: a.id, side: 'TOP' }, { nodeId: b.id, side: 'BOTTOM' })
    graph.reparent(a.id, otherPage.id, 0)
    expect(graph.getMeasurements(sourcePage.id)).toHaveLength(0)

    const bytes = serialize(graph)
    const restored = deserialize(bytes)
    expect(restored.getMeasurements(sourcePage.id)).toHaveLength(0)
  })
})
```

- [ ] **Step 12.4: Run all three integration tests**

Run: `cd kova-open-pencil-1 && bun test ./tests/integration/engine-host/`
Expected: 1 + 2 + 4 = 7 tests pass (per the kiwi work in Task 8 + the proxy work in Task 7 already landed).

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
    { "id": "0:2", "type": "CANVAS", "name": "Page 1", "parentId": "0:1", "childIds": ["0:3","0:4","0:5","0:6","0:7","0:8"], "includeInExports": true, "pageBackgroundVisible": true,
      "measurements": [
        {
          "id": "m-001",
          "start": { "node_id": "0:4", "side": "RIGHT" },
          "end":   { "node_id": "0:5", "side": "LEFT" },
          "offset": { "type": "INNER", "relative": 0 },
          "free_text": ""
        }
      ]
    },
    { "id": "0:3", "type": "SLICE", "name": "Hero export", "parentId": "0:2", "x": 0, "y": 0, "width": 100, "height": 50 },
    { "id": "0:4", "type": "RECTANGLE", "name": "Anchor A", "parentId": "0:2", "x": 0, "y": 100, "width": 50, "height": 50 },
    { "id": "0:5", "type": "RECTANGLE", "name": "Anchor B", "parentId": "0:2", "x": 100, "y": 100, "width": 50, "height": 50 },
    { "id": "0:6", "type": "GROUP", "name": "Mask group", "parentId": "0:2", "x": 0, "y": 200, "width": 200, "height": 100, "childIds": ["0:7","0:8"] },
    { "id": "0:7", "type": "RECTANGLE", "name": "Mask shape", "parentId": "0:6", "x": 0, "y": 0, "width": 200, "height": 100, "isMask": true, "maskType": "ALPHA", "fills": [{ "type": "SOLID", "color": { "r": 1, "g": 1, "b": 1, "a": 1 }, "opacity": 1, "visible": true }] },
    { "id": "0:8", "type": "RECTANGLE", "name": "Maskee", "parentId": "0:6", "x": 0, "y": 0, "width": 200, "height": 100, "fills": [{ "type": "SOLID", "color": { "r": 0, "g": 1, "b": 0, "a": 1 }, "opacity": 1, "visible": true }] }
  ]
}
```

(Skeleton — adapt to the actual host-app fixture shape; the host loads scene-graph JSON in tests via a test-only route or a pre-seeded Yjs doc. The existing E2E suite has an established pattern at `tests/e2e/fixtures/` — match it. Note: the page-level `measurements` array lives on the CANVAS-typed node, not as a separate scene-tree node.)

- [ ] **Step 13.2: Write the spec**

Create `kova-open-pencil-1/tests/e2e/engine/slice-measurement-load.spec.ts`:

```typescript
import { test, expect } from '@playwright/test'

test('engine smoke — load canvas with SLICE + page-level measurement + mask renders without console error', async ({ page }) => {
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

  // Assert the page-level measurement loaded
  const measurementCount = await page.evaluate(() => {
    // Access the figma proxy via a debug global the dev build exposes
    return (window as { __figma?: { currentPage: { getMeasurements(): unknown[] } } }).__figma
      ?.currentPage.getMeasurements().length ?? 0
  })
  expect(measurementCount).toBe(1)
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
3. Create two RECTANGLES; pass their proxies to `figma.currentPage.addMeasurement({ node: a, side: 'RIGHT' }, { node: b, side: 'LEFT' })` → verify it returns a `Measurement` record with an `id`
4. `figma.currentPage.getMeasurements()` → verify the measurement appears
5. `figma.getSelection()[0].isMask = true; figma.getSelection()[0].maskType = 'ALPHA'` → verify canvas re-renders showing the mask composite
6. Toggle `maskType` to `'VECTOR'` and `'LUMINANCE'` → verify visible compositing changes
7. Refresh the page → verify slice + page-level measurement + mask state all survives
8. Remove the anchor node (`figma.getNodeById('<nodeA-id>').remove()`) → verify `figma.currentPage.getMeasurements()` still returns the measurement (orphan-not-cascade) and the engine emitted `measurement:broken`
9. Move a measurement-anchored node to a different CANVAS (cut+paste) → verify source measurements dropped + `measurement:dropped` emitted

Document each ✓ in the PR description.

- [ ] **Step F-6: Update PRD tracker**

Edit `kova-open-pencil-1/docs/kova-final-prds/00a-PRD_AUTHORING_GUIDE.md` row 07a: status `IN-DRAFT` → `IN-IMPLEMENTATION` (after engineer starts F-1) → `SHIPPED` (after F-1..F-5 pass + PR merges).

- [ ] **Step F-7: Final commit + PR push**

```bash
cd kova-open-pencil-1 && git status
# Verify clean
git push origin feat/m9-shopify  # or 07a-named feature branch
gh pr create --title "feat(engine): Cluster 07a Canvas Engine Core + Renderer" --body "$(cat <<'EOF'
## Summary
- Lift `packages/core/` lock per ratified CLAUDE.md amendment (00c §895) — amendment paragraph added to CLAUDE.md in same merge group
- Add SLICE NodeType (only — measurement is page-level per Figma model)
- Add page-level Measurement system on CANVAS: 5 SceneGraph methods (`addMeasurement`/`getMeasurements`/`getMeasurementsForNode`/`editMeasurement`/`deleteMeasurement`) matching Figma's PageNode API verbatim; new types `MeasurementSide`/`MeasurementOffset`/`MeasurementAnchor`/`Measurement`; orphan-on-anchor-delete + drop-on-cross-canvas-move semantics with `measurement:broken` / `measurement:dropped` events
- Add aspectRatio + includeInExports + pageBackgroundVisible + measurements SceneNode fields; OpenType + list + link per-text-run metadata
- Add `scaleNode` modify tool + recursive scale; refactor `createSlice` to SLICE NodeType; add `addMeasurement` ToolDef (page-level wrapper) + `arrowStub`
- Sibling-traversal mask compositing in `renderer/scene.ts` for ALPHA + VECTOR + LUMINANCE
- Kiwi schema v2.0.0 with backwards-compat unknown-NodeType skip + fail-soft MeasurementSide enum handling
- CHANGELOG-KOVA.md initial entry

## Test plan
- [x] `bun run test:unit` green (baseline + new tests pass; 0 fail; 0 new skips)
- [x] `bun run test` Playwright E2E green
- [x] `bun run check && bun run format && bun run test:dupes` green
- [x] Engineer manual smoke per PRD §9.4 — slice + page-level measurement + mask + reload + orphan-on-delete + cross-canvas-drop all verified
- [x] CHANGELOG-KOVA.md populated; first upstream PR (SLICE NodeType) drafted on fork branch

PRD: `kova-open-pencil-1/docs/kova-final-prds/07a-canvas-engine-core-renderer.md`
Plan: `kova-open-pencil-1/docs/kova-final-impl-plans/07a-canvas-engine-core-renderer-plan.md`
EOF
)"
```

---

## Post-merge

Within 14 days of this PRD's PR merging into `feat/m9-shopify` / main:

- [ ] Submit the first upstream PR (SLICE NodeType, smallest, lowest-risk) to `open-pencil/main`
- [ ] Flip the CHANGELOG-KOVA.md row status to `submitted`
- [ ] Track subsequent upstream PRs (one per week cadence): page-level Measurement system (5 PageNode methods + types + struct) → mask compositing → scaleNode → kiwi schema bump → field additions → CharacterStyleOverride extensions → figma-api-proxy → arrowStub
- [ ] Update CHANGELOG-KOVA.md row statuses as upstream review progresses

---

## Self-review summary

**Spec coverage:**
- PRD §7.1 NodeType additions (SLICE only) → Tasks 1, 8
- PRD §7.1b Page-level Measurement system (NEW post-2026-05-17) → Tasks 1b, 7, 8
- PRD §7.2 SceneNode field additions → Tasks 2, 7, 8
- PRD §7.3 CharacterStyleOverride extensions → Tasks 3, 8
- PRD §7.4 Tool registrations (scaleNode + createSlice refactor + `addMeasurement` page-level wrapper + arrowStub) → Tasks 4, 5, 6
- PRD §7.5 Renderer mask compositing → Task 9
- PRD §7.6 Kiwi schema bump → Task 8
- PRD §7.7 figma-api-proxy exposure (createSlice + currentPage measurement methods) → Task 7
- PRD §7.8 CHANGELOG-KOVA.md → Task 11
- PRD §8 Acceptance criteria → Tasks 1–9 each enforce a subset; Task F runs the aggregate
- PRD §9.1 Unit tests → Tasks 1, 1b, 2–11 (every task contains its unit test specs)
- PRD §9.2 Integration tests → Task 12
- PRD §9.3 E2E smoke → Task 13
- PRD §9.4 Manual QA → Task F-5
- PRD §9.5 Pre-commit + CI verifications → Task F-3, F-4
- PRD §12.3 + §12.14 CLAUDE.md amendment text → Task 10

No spec gaps detected.

**Task coupling note (re Tasks 5 + 7):** Task 5 (createSlice refactor + addMeasurement ToolDef) depends on Task 7 (proxy methods `figma.createSlice()` + `figma.currentPage.*` measurement methods). The plan keeps the numbering but explicitly calls out the dep in Step 5.5. The executor should either swap Task 7 ahead of Task 5 OR land them in one batch commit. Both are valid; pick what matches the team's commit-granularity preference.

**Type-consistency check:**
- `scaleNodeRecursive` exported from `tools/modify.ts` and reused by `figma-api-proxy.ts` `FigmaNodeProxy.scale` — consistent name across tasks 4 + 7
- `ListType` exported from `scene-graph.ts` (Task 3) + extended in kiwi schema (Task 8) — names match
- `MeasurementSide` / `MeasurementOffset` / `MeasurementAnchor` / `Measurement` types defined in `scene-graph.ts` (Task 1b) and reused by `tools/measurement.ts` (Task 5), `figma-api-proxy.ts` `FigmaPageProxy` (Task 7), kiwi schema + convert (Task 8) — consistent names + shapes across all touchpoints
- `figma.createSlice()` (FigmaAPI proxy) consistent between proxy interface (Task 7), tools/create.ts (Task 5), and FigmaAPI interface (Task 7); `figma.currentPage.addMeasurement(...)` consistent between proxy interface (Task 7), addMeasurement ToolDef (Task 5), and FigmaPageProxy class (Task 7)
- `aspectRatio` / `includeInExports` / `pageBackgroundVisible` / `measurements` field names consistent across SceneNode interface (Task 2 + 1b), defaults (Task 1.4), proxy accessors (Task 7), Kiwi struct (Task 8), and CHANGELOG (Task 11)

**Placeholder scan:** No `TBD`, no `TODO`, no "implement later." Every code block contains the actual code the engineer writes.

Plan complete.

---

**Plan saved to:** `kova-open-pencil-1/docs/kova-final-impl-plans/07a-canvas-engine-core-renderer-plan.md`

**Two execution options:**

1. **Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks, fast iteration
2. **Inline Execution** — execute tasks in this session using `superpowers:executing-plans`, batch execution with checkpoints

Founder picks the approach when this PRD's status flips to `APPROVED`.
