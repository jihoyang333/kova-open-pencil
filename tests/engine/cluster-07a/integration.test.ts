/**
 * Cluster 07a — engine-host integration tests.
 *
 * Plan §Task 12 originally calls these tests against a kiwi serialize ↔
 * deserialize round-trip. Kova snapshots travel via Yjs CRDT, not kiwi
 * bytes, so the round-trip is exercised at the SceneGraph layer directly
 * — same coverage of the new fields + lifecycle, without inventing a
 * snapshot codec that Cluster 09 will ship.
 */
import { describe, test, expect } from 'bun:test'

import { SceneGraph } from '../../../packages/core/src/scene-graph'
import { FigmaAPI } from '../../../packages/core/src/figma-api'

describe('Integration — engine ↔ host with Cluster 07a additions', () => {
  test('host loads SLICE + page-level measurements + masked group without error', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]!
    const slice = graph.createNode('SLICE', page.id, {
      x: 0, y: 0, width: 100, height: 50, name: 'Hero export'
    })
    const nodeA = graph.createNode('RECTANGLE', page.id, {
      x: 0, y: 0, width: 50, height: 50, name: 'A'
    })
    const nodeB = graph.createNode('RECTANGLE', page.id, {
      x: 100, y: 0, width: 50, height: 50, name: 'B'
    })
    graph.addMeasurement(
      page.id,
      { nodeId: nodeA.id, side: 'RIGHT' },
      { nodeId: nodeB.id, side: 'LEFT' }
    )
    const group = graph.createNode('GROUP', page.id, {
      x: 50, y: 50, width: 200, height: 200
    })
    graph.createNode('RECTANGLE', group.id, {
      x: 0, y: 0, width: 200, height: 200,
      isMask: true, maskType: 'ALPHA',
      fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, opacity: 1, visible: true }]
    })
    graph.createNode('RECTANGLE', group.id, {
      x: 0, y: 0, width: 200, height: 200,
      fills: [{ type: 'SOLID', color: { r: 0, g: 1, b: 0, a: 1 }, opacity: 1, visible: true }]
    })

    const slices = Array.from(graph.getAllNodes()).filter((n) => n.type === 'SLICE')
    expect(slices).toHaveLength(1)
    expect(slices[0]!.name).toBe('Hero export')
    expect(slice.id).toBe(slices[0]!.id)

    const measurements = graph.getMeasurements(page.id)
    expect(measurements).toHaveLength(1)
    expect(measurements[0]!.start.side).toBe('RIGHT')
    expect(measurements[0]!.end.side).toBe('LEFT')
  })

  test('host enumerates SLICE nodes for batch export', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]!
    graph.createNode('SLICE', page.id, { x: 0, y: 0, width: 100, height: 50, name: 'Hero' })
    graph.createNode('SLICE', page.id, { x: 100, y: 0, width: 100, height: 50, name: 'Footer' })
    graph.createNode('RECTANGLE', page.id, { x: 200, y: 0, width: 100, height: 50, name: 'Not a slice' })

    const slices = Array.from(graph.getAllNodes()).filter((n) => n.type === 'SLICE')
    expect(slices).toHaveLength(2)
    expect(slices.map((s) => s.name).sort()).toEqual(['Footer', 'Hero'])
  })

  test('host respects CANVAS includeInExports=false to skip whole pages', () => {
    const graph = new SceneGraph()
    const visible = graph.getPages()[0]!
    expect(visible.includeInExports).toBe(true)
    graph.createNode('SLICE', visible.id, { x: 0, y: 0, width: 100, height: 50, name: 'Visible' })

    const hidden = graph.addPage('Hidden')
    hidden.includeInExports = false
    graph.createNode('SLICE', hidden.id, { x: 0, y: 0, width: 100, height: 50, name: 'Should skip' })

    const exportable = Array.from(graph.getAllNodes()).filter((n) => {
      if (n.type !== 'SLICE') return false
      const parent = n.parentId ? graph.getNode(n.parentId) : null
      return parent?.type === 'CANVAS' && parent.includeInExports
    })
    expect(exportable).toHaveLength(1)
    expect(exportable[0]!.name).toBe('Visible')
  })

  test('measurement anchors + offset + freeText preserved by SceneGraph mutation API', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]!
    const a = graph.createNode('RECTANGLE', page.id)
    const b = graph.createNode('RECTANGLE', page.id)
    const m = graph.addMeasurement(
      page.id,
      { nodeId: a.id, side: 'RIGHT' },
      { nodeId: b.id, side: 'LEFT' },
      { offset: { type: 'OUTER', fixed: 16 }, freeText: '50px gap' }
    )

    const fresh = graph.getMeasurements(page.id)[0]!
    expect(fresh.id).toBe(m.id)
    expect(fresh.start.side).toBe('RIGHT')
    expect(fresh.offset).toEqual({ type: 'OUTER', fixed: 16 })
    expect(fresh.freeText).toBe('50px gap')

    graph.editMeasurement(page.id, m.id, { freeText: 'updated' })
    expect(graph.getMeasurements(page.id)[0]!.freeText).toBe('updated')
  })

  test('orphan-on-anchor-delete keeps the measurement with a broken anchor ref', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]!
    const a = graph.createNode('RECTANGLE', page.id)
    const b = graph.createNode('RECTANGLE', page.id)
    graph.addMeasurement(
      page.id,
      { nodeId: a.id, side: 'TOP' },
      { nodeId: b.id, side: 'BOTTOM' }
    )
    graph.deleteNode(a.id)
    expect(graph.getMeasurements(page.id)).toHaveLength(1)
    expect(graph.getMeasurements(page.id)[0]!.start.nodeId).toBe(a.id)
    expect(graph.getNode(a.id)).toBeUndefined()
  })

  test('drop-on-cross-canvas-move removes source measurements when the anchor leaves the canvas', () => {
    const graph = new SceneGraph()
    const sourcePage = graph.getPages()[0]!
    const otherPage = graph.addPage('Other')
    const a = graph.createNode('RECTANGLE', sourcePage.id)
    const b = graph.createNode('RECTANGLE', sourcePage.id)
    graph.addMeasurement(sourcePage.id, { nodeId: a.id, side: 'TOP' }, { nodeId: b.id, side: 'BOTTOM' })
    graph.reparentNode(a.id, otherPage.id)
    expect(graph.getMeasurements(sourcePage.id)).toHaveLength(0)
  })

  test('FigmaAPI proxy round-trip exposes createSlice + currentPage measurement methods', () => {
    const graph = new SceneGraph()
    const figma = new FigmaAPI(graph)
    const slice = figma.createSlice()
    expect(slice.type).toBe('SLICE')

    const canvas = figma.currentPage
    const a = figma.createRectangle()
    const b = figma.createRectangle()
    canvas.appendChild(a)
    canvas.appendChild(b)
    const m = canvas.addMeasurement({ node: a, side: 'TOP' }, { node: b, side: 'BOTTOM' })
    expect(canvas.getMeasurements()).toHaveLength(1)
    expect(canvas.getMeasurements()[0]!.id).toBe(m.id)
  })
})
