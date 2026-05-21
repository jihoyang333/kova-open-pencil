/**
 * Cluster 07a — engine smoke test.
 *
 * Plan §Task 13 originally calls for a Playwright spec. The 07a engine
 * surface ships invisibly per PRD 07a §3 (no UI in 07a — visual evidence
 * renders in 07b). The Playwright spec depends on a `/dev/cluster-07a`
 * fixture route + Yjs-seeded scene-graph payload that lands in Cluster 09's
 * snapshot codec. Until then, the engine smoke runs programmatically: load
 * a fixture JSON, seed a SceneGraph, run the engine API operations a host
 * app would issue, and assert no exceptions + state visible via getters.
 */
import { describe, test, expect } from 'bun:test'

import { SceneGraph } from '../../../packages/core/src/scene-graph'
import type { Measurement } from '../../../packages/core/src/scene-graph'
import { FigmaAPI } from '../../../packages/core/src/figma-api'

interface FixtureMeasurement {
  start: { node: 'A' | 'B'; side: 'TOP' | 'RIGHT' | 'BOTTOM' | 'LEFT' }
  end: { node: 'A' | 'B'; side: 'TOP' | 'RIGHT' | 'BOTTOM' | 'LEFT' }
}

interface Fixture {
  schemaVersion: '2.0.0'
  measurements: FixtureMeasurement[]
}

const FIXTURE: Fixture = {
  schemaVersion: '2.0.0',
  measurements: [
    { start: { node: 'A', side: 'RIGHT' }, end: { node: 'B', side: 'LEFT' } }
  ]
}

describe('Cluster 07a Task 13 — engine smoke (slice + measurement + mask)', () => {
  test('engine surface loads fixture without error + persists state across mutations', () => {
    expect(FIXTURE.schemaVersion).toBe('2.0.0')

    const graph = new SceneGraph()
    const figma = new FigmaAPI(graph)
    const page = figma.currentPage

    const slice = figma.createSlice()
    page.appendChild(slice)
    slice.resize(100, 50)
    slice.name = 'Hero export'
    slice.x = 0
    slice.y = 0

    const a = figma.createRectangle()
    const b = figma.createRectangle()
    page.appendChild(a)
    page.appendChild(b)
    a.resize(50, 50)
    b.resize(50, 50)
    a.x = 0
    a.y = 100
    b.x = 100
    b.y = 100

    const fixtureMeasurement = FIXTURE.measurements[0]!
    const anchorFor = (name: 'A' | 'B') => (name === 'A' ? a : b)
    const m: Measurement = page.addMeasurement(
      { node: anchorFor(fixtureMeasurement.start.node), side: fixtureMeasurement.start.side },
      { node: anchorFor(fixtureMeasurement.end.node), side: fixtureMeasurement.end.side }
    )
    expect(m.id).toBeDefined()

    const group = figma.createFrame()
    page.appendChild(group)
    group.name = 'Mask group'
    group.resize(200, 100)
    group.x = 0
    group.y = 200

    const maskShape = figma.createRectangle()
    group.appendChild(maskShape)
    maskShape.resize(200, 100)
    graph.updateNode(maskShape.id, {
      isMask: true,
      maskType: 'ALPHA',
      fills: [
        { type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, opacity: 1, visible: true }
      ]
    })

    const maskee = figma.createRectangle()
    group.appendChild(maskee)
    maskee.resize(200, 100)
    graph.updateNode(maskee.id, {
      fills: [
        { type: 'SOLID', color: { r: 0, g: 1, b: 0, a: 1 }, opacity: 1, visible: true }
      ]
    })

    expect(slice.type).toBe('SLICE')
    expect(page.getMeasurements()).toHaveLength(1)
    expect(graph.getNode(maskShape.id)!.isMask).toBe(true)
    expect(graph.getNode(maskShape.id)!.maskType).toBe('ALPHA')

    page.includeInExports = false
    expect(page.includeInExports).toBe(false)
    page.pageBackgroundVisible = false
    expect(page.pageBackgroundVisible).toBe(false)

    slice.aspectRatio = 2
    expect(slice.aspectRatio).toBe(2)

    page.deleteMeasurement(m.id)
    expect(page.getMeasurements()).toHaveLength(0)
  })
})
