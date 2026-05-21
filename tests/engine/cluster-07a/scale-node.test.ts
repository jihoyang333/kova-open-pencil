import { describe, test, expect } from 'bun:test'
import { scaleNode } from '../../../packages/core/src/tools/modify'
import { SceneGraph } from '../../../packages/core/src/scene-graph'
import { FigmaAPI } from '../../../packages/core/src/figma-api'

function setupGraph() {
  const graph = new SceneGraph()
  const figma = new FigmaAPI(graph)
  const page = graph.getPages()[0]!
  return { graph, figma, pageId: page.id }
}

describe('Cluster 07a Task 4 — scaleNode modify tool', () => {
  test('idempotent at factor=1', () => {
    const { graph, figma, pageId } = setupGraph()
    const rect = graph.createNode('RECTANGLE', pageId, { width: 100, height: 100 })
    scaleNode.execute(figma, { id: rect.id, factor: 1 })
    const after = graph.getNode(rect.id)!
    expect(after.width).toBe(100)
    expect(after.height).toBe(100)
  })

  test('scales width and height by factor', () => {
    const { graph, figma, pageId } = setupGraph()
    const rect = graph.createNode('RECTANGLE', pageId, { width: 100, height: 50 })
    scaleNode.execute(figma, { id: rect.id, factor: 2 })
    const after = graph.getNode(rect.id)!
    expect(after.width).toBe(200)
    expect(after.height).toBe(100)
  })

  test('preserves position and rotation', () => {
    const { graph, figma, pageId } = setupGraph()
    const rect = graph.createNode('RECTANGLE', pageId, {
      x: 50, y: 25, width: 100, height: 100, rotation: 45
    })
    scaleNode.execute(figma, { id: rect.id, factor: 2 })
    const after = graph.getNode(rect.id)!
    expect(after.x).toBe(50)
    expect(after.y).toBe(25)
    expect(after.rotation).toBe(45)
  })

  test('scales TEXT fontSize', () => {
    const { graph, figma, pageId } = setupGraph()
    const text = graph.createNode('TEXT', pageId, { width: 200, height: 30, fontSize: 14 })
    scaleNode.execute(figma, { id: text.id, factor: 2 })
    expect(graph.getNode(text.id)!.fontSize).toBe(28)
  })

  test('does not scale fontSize on non-TEXT nodes', () => {
    const { graph, figma, pageId } = setupGraph()
    const rect = graph.createNode('RECTANGLE', pageId, { width: 100, height: 100, fontSize: 14 })
    scaleNode.execute(figma, { id: rect.id, factor: 2 })
    expect(graph.getNode(rect.id)!.fontSize).toBe(14)
  })

  test('scales corner radii', () => {
    const { graph, figma, pageId } = setupGraph()
    const rect = graph.createNode('RECTANGLE', pageId, {
      width: 100, height: 100,
      cornerRadius: 8,
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
    const { graph, figma, pageId } = setupGraph()
    const rect = graph.createNode('RECTANGLE', pageId, {
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
    const eff = graph.getNode(rect.id)!.effects[0]!
    expect(eff.radius).toBe(24)
    expect(eff.offset).toEqual({ x: 8, y: 16 })
    expect(eff.spread).toBe(4)
  })

  test('scales stroke weights (per-side)', () => {
    const { graph, figma, pageId } = setupGraph()
    const rect = graph.createNode('RECTANGLE', pageId, {
      width: 100, height: 100,
      borderTopWeight: 1, borderRightWeight: 2, borderBottomWeight: 3, borderLeftWeight: 4
    })
    scaleNode.execute(figma, { id: rect.id, factor: 2 })
    const after = graph.getNode(rect.id)!
    expect(after.borderTopWeight).toBe(2)
    expect(after.borderRightWeight).toBe(4)
    expect(after.borderBottomWeight).toBe(6)
    expect(after.borderLeftWeight).toBe(8)
  })

  test('recurses into descendants', () => {
    const { graph, figma, pageId } = setupGraph()
    const parent = graph.createNode('FRAME', pageId, { width: 100, height: 100 })
    const child = graph.createNode('RECTANGLE', parent.id, { width: 50, height: 50 })
    scaleNode.execute(figma, { id: parent.id, factor: 2 })
    expect(graph.getNode(parent.id)!.width).toBe(200)
    expect(graph.getNode(child.id)!.width).toBe(100)
  })

  test('schema enforces factor min=0.01', () => {
    expect(scaleNode.params.factor.min).toBe(0.01)
  })

  test('returns { error } for missing node id', () => {
    const { figma } = setupGraph()
    const result = scaleNode.execute(figma, { id: 'missing-id', factor: 2 }) as { error?: string }
    expect(result.error).toBeDefined()
  })
})
