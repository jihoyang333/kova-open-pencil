import { describe, test, expect, mock } from 'bun:test'
import { renderNode } from '../../../packages/core/src/renderer/scene'
import { SceneGraph } from '../../../packages/core/src/scene-graph'
import type { SkiaRenderer, RenderOverlays } from '../../../packages/core/src/renderer/renderer'

function createMockRenderer(): SkiaRenderer & {
  _calls: { saveLayer: number; restore: number; save: number; lastBlendMode: number | null }
} {
  const calls = { saveLayer: 0, restore: 0, save: 0, lastBlendMode: null as number | null }
  const ck = {
    BlendMode: { SrcIn: 100, Luminosity: 101 },
    ClipOp: { Intersect: 0 },
    LTRBRect: (a: number, b: number, c: number, d: number) => [a, b, c, d]
  } as unknown as SkiaRenderer['ck']

  const maskComposite = {
    setBlendMode: mock((mode: number) => {
      calls.lastBlendMode = mode
    })
  }

  return {
    ck,
    maskOuterPaint: {} as never,
    maskCompositePaint: maskComposite as never,
    worldViewport: { x: -10000, y: -10000, w: 20000, h: 20000 },
    zoom: 1,
    opacityPaint: { setAlphaf: () => {} } as never,
    effectLayerPaint: { setImageFilter: () => {} } as never,
    auxStroke: { setStrokeWidth: () => {}, setColor: () => {} } as never,
    getCachedBlur: () => null,
    selColor: () => null,
    makeRRect: () => null,
    renderShape: mock(() => {}),
    renderSection: mock(() => {}),
    renderComponentSet: mock(() => {}),
    drawTextEditOverlay: mock(() => {}),
    drawIndividualSideStrokes: mock(() => {}),
    _nodeCount: 0,
    _culledCount: 0,
    _calls: calls,
    renderNode(canvas: unknown, graph: SceneGraph, nodeId: string, overlays: RenderOverlays, ax = 0, ay = 0) {
      renderNode(this as unknown as SkiaRenderer, canvas as never, graph, nodeId, overlays, ax, ay)
    }
  } as unknown as SkiaRenderer & {
    _calls: typeof calls
  }
}

function createMockCanvas(calls: { saveLayer: number; restore: number; save: number }) {
  return {
    save: mock(() => { calls.save++ }),
    saveLayer: mock(() => { calls.saveLayer++ }),
    restore: mock(() => { calls.restore++ }),
    translate: mock(() => {}),
    rotate: mock(() => {}),
    scale: mock(() => {}),
    clipRect: mock(() => {}),
    clipRRect: mock(() => {}),
    drawRect: mock(() => {})
  }
}

describe('Cluster 07a Task 9 — mask compositing in renderChildren', () => {
  test('non-mask children: no extra saveLayer / restore beyond per-node opacity scope', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]!
    const group = graph.createNode('GROUP', page.id, { width: 200, height: 200 })
    graph.createNode('RECTANGLE', group.id, { width: 50, height: 50 })
    graph.createNode('RECTANGLE', group.id, { width: 50, height: 50 })

    const r = createMockRenderer()
    const canvas = createMockCanvas(r._calls)
    r.renderNode(canvas as never, graph, group.id, {} as RenderOverlays)

    expect(r._calls.lastBlendMode).toBeNull()
  })

  test('ALPHA mask opens saveLayer pair + sets SrcIn blend mode', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]!
    const group = graph.createNode('GROUP', page.id, { width: 200, height: 200 })
    graph.createNode('RECTANGLE', group.id, {
      width: 100, height: 100, isMask: true, maskType: 'ALPHA'
    })
    graph.createNode('RECTANGLE', group.id, { width: 200, height: 200 })

    const r = createMockRenderer()
    const canvas = createMockCanvas(r._calls)
    r.renderNode(canvas as never, graph, group.id, {} as RenderOverlays)

    expect(r._calls.lastBlendMode).toBe(100) // ck.BlendMode.SrcIn
    expect(r._calls.saveLayer).toBeGreaterThanOrEqual(2)
  })

  test('LUMINANCE mask sets Luminosity blend mode', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]!
    const group = graph.createNode('GROUP', page.id, { width: 200, height: 200 })
    graph.createNode('RECTANGLE', group.id, {
      width: 100, height: 100, isMask: true, maskType: 'LUMINANCE'
    })
    graph.createNode('RECTANGLE', group.id, { width: 200, height: 200 })

    const r = createMockRenderer()
    const canvas = createMockCanvas(r._calls)
    r.renderNode(canvas as never, graph, group.id, {} as RenderOverlays)

    expect(r._calls.lastBlendMode).toBe(101) // ck.BlendMode.Luminosity
  })

  test('multiple masks in one parent open separate saveLayer scopes', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]!
    const group = graph.createNode('GROUP', page.id, { width: 300, height: 100 })
    graph.createNode('RECTANGLE', group.id, {
      width: 100, height: 100, isMask: true, maskType: 'ALPHA'
    })
    graph.createNode('RECTANGLE', group.id, { width: 100, height: 100 })
    graph.createNode('RECTANGLE', group.id, {
      width: 100, height: 100, isMask: true, maskType: 'ALPHA'
    })
    graph.createNode('RECTANGLE', group.id, { width: 100, height: 100 })

    const r = createMockRenderer()
    const canvas = createMockCanvas(r._calls)
    r.renderNode(canvas as never, graph, group.id, {} as RenderOverlays)

    // 2 mask scopes × 2 saveLayer each = 4 mask-related saveLayer calls
    // (plus possibly more for opacity/effect layers, but no node here has opacity < 1)
    expect(r._calls.saveLayer).toBeGreaterThanOrEqual(4)
  })

  test('mask nested inside clipsContent FRAME — both clip + mask scopes opened', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]!
    const frame = graph.createNode('FRAME', page.id, {
      width: 200, height: 200, clipsContent: true
    })
    graph.createNode('RECTANGLE', frame.id, {
      width: 200, height: 200, isMask: true, maskType: 'ALPHA'
    })
    graph.createNode('RECTANGLE', frame.id, { width: 200, height: 200 })

    const r = createMockRenderer()
    const canvas = createMockCanvas(r._calls)
    r.renderNode(canvas as never, graph, frame.id, {} as RenderOverlays)

    // save() for clipsContent + saveLayer pair for the mask = at least 1 save + 2 saveLayer
    expect(r._calls.save).toBeGreaterThanOrEqual(1)
    expect(r._calls.saveLayer).toBeGreaterThanOrEqual(2)
  })
})
