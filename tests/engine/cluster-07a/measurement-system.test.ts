import { describe, test, expect, beforeEach } from 'bun:test'
import { SceneGraph } from '../../../packages/core/src/scene-graph'
import type {
  Measurement,
  MeasurementBrokenEvent,
  MeasurementDroppedEvent
} from '../../../packages/core/src/scene-graph'

describe('Cluster 07a Task 1b — page-level Measurement system', () => {
  let graph: SceneGraph
  let canvasId: string
  let nodeA: string
  let nodeB: string

  beforeEach(() => {
    graph = new SceneGraph()
    const canvas = graph.getPages()[0]!
    canvasId = canvas.id
    const a = graph.createNode('RECTANGLE', canvasId)
    const b = graph.createNode('RECTANGLE', canvasId)
    nodeA = a.id
    nodeB = b.id
  })

  test('addMeasurement creates Measurement with unique id', () => {
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

  test('addMeasurement defaults offset INNER 0', () => {
    const m = graph.addMeasurement(
      canvasId,
      { nodeId: nodeA, side: 'TOP' },
      { nodeId: nodeB, side: 'BOTTOM' }
    )
    expect(m.offset).toEqual({ type: 'INNER', relative: 0 })
  })

  test('addMeasurement rejects cross-canvas start anchor', () => {
    const otherCanvas = graph.addPage('Other')
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
    const otherCanvas = graph.addPage('Other')
    const otherNode = graph.createNode('RECTANGLE', otherCanvas.id)
    expect(() => {
      graph.addMeasurement(
        canvasId,
        { nodeId: nodeA, side: 'LEFT' },
        { nodeId: otherNode.id, side: 'RIGHT' }
      )
    }).toThrow(/anchor node not on target canvas/i)
  })

  test('addMeasurement rejects when canvasId is not CANVAS-typed', () => {
    expect(() => {
      graph.addMeasurement(
        nodeA,
        { nodeId: nodeA, side: 'TOP' },
        { nodeId: nodeB, side: 'BOTTOM' }
      )
    }).toThrow(/not a CANVAS/i)
  })

  test('getMeasurements returns canvas collection', () => {
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
    expect(updated.start.nodeId).toBe(nodeA)
  })

  test('deleteMeasurement removes record', () => {
    const m = graph.addMeasurement(canvasId, { nodeId: nodeA, side: 'TOP' }, { nodeId: nodeB, side: 'BOTTOM' })
    expect(graph.getMeasurements(canvasId)).toHaveLength(1)
    graph.deleteMeasurement(canvasId, m.id)
    expect(graph.getMeasurements(canvasId)).toHaveLength(0)
  })

  test('addMeasurement emits measurement:created', () => {
    const events: Measurement[] = []
    graph.emitter.on('measurement:created', (m) => events.push(m))
    const m = graph.addMeasurement(canvasId, { nodeId: nodeA, side: 'TOP' }, { nodeId: nodeB, side: 'BOTTOM' })
    expect(events).toHaveLength(1)
    expect(events[0]!.id).toBe(m.id)
  })

  test('editMeasurement emits measurement:updated', () => {
    const m = graph.addMeasurement(canvasId, { nodeId: nodeA, side: 'TOP' }, { nodeId: nodeB, side: 'BOTTOM' })
    const events: Measurement[] = []
    graph.emitter.on('measurement:updated', (u) => events.push(u))
    graph.editMeasurement(canvasId, m.id, { offset: { type: 'INNER', relative: 0.25 } })
    expect(events).toHaveLength(1)
    expect(events[0]!.id).toBe(m.id)
  })

  test('deleteMeasurement emits measurement:deleted', () => {
    const m = graph.addMeasurement(canvasId, { nodeId: nodeA, side: 'TOP' }, { nodeId: nodeB, side: 'BOTTOM' })
    const events: Measurement[] = []
    graph.emitter.on('measurement:deleted', (d) => events.push(d))
    graph.deleteMeasurement(canvasId, m.id)
    expect(events).toHaveLength(1)
    expect(events[0]!.id).toBe(m.id)
  })

  test('orphan-on-anchor-delete: removing nodeA leaves measurement; emits measurement:broken', () => {
    const m = graph.addMeasurement(canvasId, { nodeId: nodeA, side: 'TOP' }, { nodeId: nodeB, side: 'BOTTOM' })
    const events: MeasurementBrokenEvent[] = []
    graph.emitter.on('measurement:broken', (e) => events.push(e))
    graph.deleteNode(nodeA)
    expect(graph.getMeasurements(canvasId)).toHaveLength(1)
    expect(graph.getMeasurements(canvasId)[0]!.start.nodeId).toBe(nodeA)
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({
      measurementId: m.id,
      brokenAnchorNodeId: nodeA,
      canvasId
    })
  })

  test('removing BOTH anchors emits measurement:broken twice (one per anchor) for same measurement', () => {
    const m = graph.addMeasurement(canvasId, { nodeId: nodeA, side: 'TOP' }, { nodeId: nodeB, side: 'BOTTOM' })
    const events: MeasurementBrokenEvent[] = []
    graph.emitter.on('measurement:broken', (e) => events.push(e))
    graph.deleteNode(nodeA)
    graph.deleteNode(nodeB)
    expect(events).toHaveLength(2)
    expect(events.map((e) => e.brokenAnchorNodeId).sort()).toEqual([nodeA, nodeB].sort())
    expect(events.every((e) => e.measurementId === m.id)).toBe(true)
  })

  test('drop-on-cross-canvas-move: reparenting nodeA to another CANVAS drops source measurements', () => {
    const m = graph.addMeasurement(canvasId, { nodeId: nodeA, side: 'TOP' }, { nodeId: nodeB, side: 'BOTTOM' })
    const otherCanvas = graph.addPage('Other')
    const events: MeasurementDroppedEvent[] = []
    graph.emitter.on('measurement:dropped', (e) => events.push(e))
    graph.reparentNode(nodeA, otherCanvas.id)
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
    graph.reparentNode(nodeA, frame.id)
    expect(graph.getMeasurements(canvasId)).toHaveLength(1)
  })

  test('deleting CANVAS with measurements emits measurement:dropped for all', () => {
    graph.addMeasurement(canvasId, { nodeId: nodeA, side: 'TOP' }, { nodeId: nodeB, side: 'BOTTOM' })
    graph.addMeasurement(canvasId, { nodeId: nodeA, side: 'LEFT' }, { nodeId: nodeB, side: 'RIGHT' })
    const events: MeasurementDroppedEvent[] = []
    graph.emitter.on('measurement:dropped', (e) => events.push(e))
    graph.deleteNode(canvasId)
    expect(events).toHaveLength(1)
    expect(events[0]!.measurementIds).toHaveLength(2)
    expect(events[0]!.sourceCanvasId).toBe(canvasId)
  })
})
