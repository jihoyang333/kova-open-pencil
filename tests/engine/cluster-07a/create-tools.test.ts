import { describe, test, expect } from 'bun:test'
import { createSlice, arrowStub } from '../../../packages/core/src/tools/create'
import { addMeasurement } from '../../../packages/core/src/tools/measurement'
import { SceneGraph } from '../../../packages/core/src/scene-graph'
import { FigmaAPI } from '../../../packages/core/src/figma-api'

function setup() {
  const graph = new SceneGraph()
  const figma = new FigmaAPI(graph)
  return { graph, figma }
}

describe('Cluster 07a Task 5 — createSlice refactor', () => {
  test('returns a SLICE node, not a FRAME', () => {
    const { figma } = setup()
    const result = createSlice.execute(figma, {
      x: 10, y: 20, width: 100, height: 50, name: 'Hero export'
    }) as { id: string; type: string; name: string }
    expect(result.type).toBe('SLICE')
    expect(result.name).toBe('Hero export')
  })

  test('persists geometry from args', () => {
    const { graph, figma } = setup()
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
    const { figma } = setup()
    const result = createSlice.execute(figma, {
      x: 0, y: 0, width: 100, height: 100
    }) as { name: string }
    expect(result.name).toBe('Slice')
  })

  test('appends to parent_id when provided', () => {
    const { graph, figma } = setup()
    const page = graph.getPages()[0]!
    const result = createSlice.execute(figma, {
      x: 0, y: 0, width: 100, height: 100, parent_id: page.id
    }) as { id: string }
    const slice = graph.getNode(result.id)!
    expect(slice.parentId).toBe(page.id)
  })
})

describe('Cluster 07a Task 5 — addMeasurement tool (page-level wrapper)', () => {
  test('creates a Measurement record (NOT a SceneNode)', () => {
    const { graph, figma } = setup()
    const canvas = graph.getPages()[0]!
    const nodeA = graph.createNode('RECTANGLE', canvas.id)
    const nodeB = graph.createNode('RECTANGLE', canvas.id)
    const result = addMeasurement.execute(figma, {
      canvas_id: canvas.id,
      start_node_id: nodeA.id,
      start_side: 'RIGHT',
      end_node_id: nodeB.id,
      end_side: 'LEFT'
    }) as { measurement_id: string }
    expect(result.measurement_id).toBeDefined()
    expect((result as { type?: string }).type).toBeUndefined()
    expect(graph.getMeasurements(canvas.id)).toHaveLength(1)
    expect(graph.getMeasurements(canvas.id)[0]!.id).toBe(result.measurement_id)
  })

  test('plumbs OUTER offset_value into MeasurementOffset', () => {
    const { graph, figma } = setup()
    const canvas = graph.getPages()[0]!
    const nodeA = graph.createNode('RECTANGLE', canvas.id)
    const nodeB = graph.createNode('RECTANGLE', canvas.id)
    addMeasurement.execute(figma, {
      canvas_id: canvas.id,
      start_node_id: nodeA.id,
      start_side: 'RIGHT',
      end_node_id: nodeB.id,
      end_side: 'LEFT',
      offset_type: 'OUTER',
      offset_value: 12
    })
    const ms = graph.getMeasurements(canvas.id)
    expect(ms[0]!.offset).toEqual({ type: 'OUTER', fixed: 12 })
  })

  test('returns { error } when anchor node is not on target canvas', () => {
    const { graph, figma } = setup()
    const canvas = graph.getPages()[0]!
    const nodeA = graph.createNode('RECTANGLE', canvas.id)
    const otherCanvas = graph.addPage('Other')
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

describe('Cluster 07a Task 5 — arrowStub', () => {
  test('arrowStub returns deferred error', () => {
    const { figma } = setup()
    const result = arrowStub.execute(figma, {}) as { error?: string }
    expect(result.error).toMatch(/Phase 2|deferred/i)
  })
})
