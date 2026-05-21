import { describe, test, expect } from 'bun:test'
import { SceneGraph } from '../../../packages/core/src/scene-graph'
import type { NodeType } from '../../../packages/core/src/scene-graph'

describe('Cluster 07a Task 1 — SLICE NodeType', () => {
  test('NodeType union accepts SLICE', () => {
    const slice: NodeType = 'SLICE'
    expect(slice).toBe('SLICE')
  })

  test('createNode("SLICE") returns leaf with type SLICE', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]!
    const slice = graph.createNode('SLICE', page.id)
    expect(slice.type).toBe('SLICE')
    expect(slice.childIds).toEqual([])
  })

  test('SLICE node rejects reparent of another node into it', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]!
    const slice = graph.createNode('SLICE', page.id)
    const child = graph.createNode('RECTANGLE', page.id)
    expect(() => {
      graph.reparentNode(child.id, slice.id)
    }).toThrow(/Slice nodes cannot have children/i)
  })

  test('SLICE not in container-type set', () => {
    const graph = new SceneGraph()
    expect(graph.isContainerType('SLICE')).toBe(false)
  })

  test('isContainerType reports CANVAS / FRAME / GROUP as containers', () => {
    const graph = new SceneGraph()
    expect(graph.isContainerType('CANVAS')).toBe(true)
    expect(graph.isContainerType('FRAME')).toBe(true)
    expect(graph.isContainerType('GROUP')).toBe(true)
  })
})
