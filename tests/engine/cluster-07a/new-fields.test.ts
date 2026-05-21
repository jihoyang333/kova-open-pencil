import { describe, test, expect } from 'bun:test'
import { SceneGraph } from '../../../packages/core/src/scene-graph'

describe('Cluster 07a Task 2 — SceneNode field additions', () => {
  test('aspectRatio defaults to null', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]!
    const rect = graph.createNode('RECTANGLE', page.id)
    expect(rect.aspectRatio).toBeNull()
  })

  test('aspectRatio is mutable', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]!
    const rect = graph.createNode('RECTANGLE', page.id)
    rect.aspectRatio = 1.5
    expect(rect.aspectRatio).toBe(1.5)
    rect.aspectRatio = null
    expect(rect.aspectRatio).toBeNull()
  })

  test('includeInExports defaults true on CANVAS', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]!
    expect(page.includeInExports).toBe(true)
  })

  test('pageBackgroundVisible defaults true on CANVAS', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]!
    expect(page.pageBackgroundVisible).toBe(true)
  })

  test('includeInExports + pageBackgroundVisible mutable', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]!
    page.includeInExports = false
    page.pageBackgroundVisible = false
    expect(page.includeInExports).toBe(false)
    expect(page.pageBackgroundVisible).toBe(false)
  })
})
