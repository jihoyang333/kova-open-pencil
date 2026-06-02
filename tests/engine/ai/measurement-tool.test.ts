import { describe, it, expect, mock, beforeAll, beforeEach, afterAll } from 'bun:test'

import * as coreConstants from '../../../packages/core/src/constants'

interface MeasurementAnchor {
  readonly nodeId: string
  readonly side: string
}

// Controllable page-level Measurement API (PRD 07a §7.1b). `present:false`
// simulates Cluster 07a not yet shipped (engine_unavailable). When present, the
// `result` controls success vs invalid_anchors.
const measureMock = {
  present: true,
  result: { id: 'm-1' } as { id: string } | null,
  lastArgs: null as null | { start: MeasurementAnchor; end: MeasurementAnchor; opts?: unknown },
}

beforeAll(async () => {
  mock.module('@/lib/supabase', () => ({
    supabase: { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }) }) },
  }))
  mock.module('@open-pencil/core', () => ({
    ...coreConstants,
    computeAllLayouts: () => {},
  }))
  mock.module('@/automation/figma-factory', () => ({
    makeFigmaFromStore: () => ({
      currentPage: measureMock.present
        ? {
            addMeasurement: (start: MeasurementAnchor, end: MeasurementAnchor, opts?: unknown) => {
              measureMock.lastArgs = { start, end, opts }
              return measureMock.result
            },
          }
        : {},
    }),
  }))
})

afterAll(() => mock.restore())

type AnyExecute = { execute: (args: Record<string, unknown>) => Promise<Record<string, unknown>> }

beforeEach(() => {
  measureMock.present = true
  measureMock.result = { id: 'm-1' }
  measureMock.lastArgs = null
})

describe('addMeasurement AI tool (page-level API, W4 CT-004)', () => {
  it('returns measurementId on success and forwards anchors', async () => {
    const { createKovaTools } = await import('@/ai/kova-tools')
    const tools = createKovaTools({} as never)
    const result = await (tools as Record<string, AnyExecute>)['addMeasurement'].execute({
      canvas_id: 'c1', start_node_id: 'n1', start_side: 'RIGHT',
      end_node_id: 'n2', end_side: 'LEFT', offset_type: 'OUTER', offset_value: 16,
    })
    expect(result).toEqual({ success: true, measurementId: 'm-1' })
    expect(measureMock.lastArgs?.start).toEqual({ nodeId: 'n1', side: 'RIGHT' })
    expect(measureMock.lastArgs?.end).toEqual({ nodeId: 'n2', side: 'LEFT' })
  })

  it('returns invalid_anchors when the engine returns null', async () => {
    measureMock.result = null
    const { createKovaTools } = await import('@/ai/kova-tools')
    const tools = createKovaTools({} as never)
    const result = await (tools as Record<string, AnyExecute>)['addMeasurement'].execute({
      canvas_id: 'c1', start_node_id: 'x', start_side: 'TOP',
      end_node_id: 'y', end_side: 'BOTTOM',
    })
    expect(result).toEqual({ error: 'Could not create measurement', code: 'invalid_anchors' })
  })

  it('returns engine_unavailable when currentPage.addMeasurement is missing', async () => {
    measureMock.present = false
    const { createKovaTools } = await import('@/ai/kova-tools')
    const tools = createKovaTools({} as never)
    const result = await (tools as Record<string, AnyExecute>)['addMeasurement'].execute({
      canvas_id: 'c1', start_node_id: 'n1', start_side: 'RIGHT',
      end_node_id: 'n2', end_side: 'LEFT',
    })
    expect(result).toEqual({ error: 'Measurement engine API not available', code: 'engine_unavailable' })
  })
})
