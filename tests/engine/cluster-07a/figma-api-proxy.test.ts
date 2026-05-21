import { describe, test, expect } from 'bun:test'
import { SceneGraph } from '../../../packages/core/src/scene-graph'
import { FigmaAPI } from '../../../packages/core/src/figma-api'

function setup() {
  const graph = new SceneGraph()
  const figma = new FigmaAPI(graph)
  return { graph, figma }
}

describe('Cluster 07a Task 7 — figma-api-proxy exposure', () => {
  describe('createSlice', () => {
    test('returns SLICE-typed proxy', () => {
      const { graph, figma } = setup()
      const slice = figma.createSlice()
      expect(slice.type).toBe('SLICE')
      expect(graph.getNode(slice.id)!.type).toBe('SLICE')
    })

    test('emits node:created', () => {
      const { graph, figma } = setup()
      let created: string | null = null
      graph.emitter.on('node:created', (node) => {
        if (node.type === 'SLICE') created = node.id
      })
      const slice = figma.createSlice()
      expect(created).toBe(slice.id)
    })
  })

  describe('currentPage measurement methods', () => {
    test('addMeasurement returns a Measurement record (NOT a node proxy)', () => {
      const { figma } = setup()
      const canvas = figma.currentPage
      const a = figma.createRectangle()
      const b = figma.createRectangle()
      canvas.appendChild(a)
      canvas.appendChild(b)
      const m = canvas.addMeasurement(
        { node: a, side: 'RIGHT' },
        { node: b, side: 'LEFT' }
      )
      expect(m.id).toBeDefined()
      expect(m.start.nodeId).toBe(a.id)
      expect(m.end.nodeId).toBe(b.id)
      // Not a FigmaNodeProxy
      expect((m as { type?: string }).type).toBeUndefined()
    })

    test('getMeasurements returns the canvas collection', () => {
      const { figma } = setup()
      const canvas = figma.currentPage
      const a = figma.createRectangle()
      const b = figma.createRectangle()
      canvas.appendChild(a)
      canvas.appendChild(b)
      canvas.addMeasurement({ node: a, side: 'TOP' }, { node: b, side: 'BOTTOM' })
      expect(canvas.getMeasurements()).toHaveLength(1)
    })

    test('getMeasurementsForNode returns measurements anchored to the node', () => {
      const { figma } = setup()
      const canvas = figma.currentPage
      const a = figma.createRectangle()
      const b = figma.createRectangle()
      canvas.appendChild(a)
      canvas.appendChild(b)
      canvas.addMeasurement({ node: a, side: 'TOP' }, { node: b, side: 'BOTTOM' })
      expect(canvas.getMeasurementsForNode(a)).toHaveLength(1)
      expect(canvas.getMeasurementsForNode(b)).toHaveLength(1)
    })

    test('editMeasurement updates offset + freeText', () => {
      const { figma } = setup()
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

    test('deleteMeasurement removes the record', () => {
      const { figma } = setup()
      const canvas = figma.currentPage
      const a = figma.createRectangle()
      const b = figma.createRectangle()
      canvas.appendChild(a)
      canvas.appendChild(b)
      const m = canvas.addMeasurement({ node: a, side: 'TOP' }, { node: b, side: 'BOTTOM' })
      canvas.deleteMeasurement(m.id)
      expect(canvas.getMeasurements()).toHaveLength(0)
    })
  })

  describe('new SceneNode property accessors', () => {
    test('aspectRatio get/set', () => {
      const { figma } = setup()
      const rect = figma.createRectangle()
      figma.currentPage.appendChild(rect)
      expect(rect.aspectRatio).toBeNull()
      rect.aspectRatio = 1.5
      expect(rect.aspectRatio).toBe(1.5)
    })

    test('includeInExports get/set on CANVAS', () => {
      const { figma } = setup()
      const page = figma.currentPage
      expect(page.includeInExports).toBe(true)
      page.includeInExports = false
      expect(page.includeInExports).toBe(false)
    })

    test('pageBackgroundVisible get/set on CANVAS', () => {
      const { figma } = setup()
      const page = figma.currentPage
      expect(page.pageBackgroundVisible).toBe(true)
      page.pageBackgroundVisible = false
      expect(page.pageBackgroundVisible).toBe(false)
    })

    test('property mutation emits node:updated', () => {
      const { graph, figma } = setup()
      const page = figma.currentPage
      let lastId: string | null = null
      graph.emitter.on('node:updated', (id) => { lastId = id })
      page.includeInExports = false
      expect(lastId).toBe(page.id)
    })
  })

  describe('FigmaNodeProxy.scale', () => {
    test('scales width and height', () => {
      const { figma } = setup()
      const page = figma.currentPage
      const rect = figma.createRectangle()
      page.appendChild(rect)
      rect.resize(100, 50)
      rect.scale(2)
      expect(rect.width).toBe(200)
      expect(rect.height).toBe(100)
    })

    test('preserves position + rotation', () => {
      const { figma } = setup()
      const page = figma.currentPage
      const rect = figma.createRectangle()
      page.appendChild(rect)
      rect.x = 10
      rect.y = 20
      rect.rotation = 30
      rect.scale(2)
      expect(rect.x).toBe(10)
      expect(rect.y).toBe(20)
      expect(rect.rotation).toBe(30)
    })
  })
})
