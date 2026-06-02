import { describe, it, expect, mock, beforeAll, beforeEach, afterAll } from 'bun:test'

import * as coreConstants from '../../../packages/core/src/constants'

// Controllable Slice engine API. `undefined` simulates Cluster 07a not yet
// shipped (engine_unavailable); a function returning a node simulates success;
// returning null simulates an empty selection.
const sliceMock = {
  fn: undefined as undefined | ((opts: { name?: string }) => { id: string } | null),
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
    makeFigmaFromStore: () => ({ createSliceFromSelection: sliceMock.fn }),
  }))
})

afterAll(() => mock.restore())

type AnyExecute = { execute: (args: Record<string, unknown>) => Promise<Record<string, unknown>> }

beforeEach(() => {
  sliceMock.fn = undefined
})

describe('createSliceFromSelection AI tool', () => {
  it('returns sliceId on success', async () => {
    sliceMock.fn = ({ name }) => ({ id: `slice-${name ?? 'x'}` })
    const { createKovaTools } = await import('@/ai/kova-tools')
    const tools = createKovaTools({} as never)
    const result = await (tools as Record<string, AnyExecute>)['createSliceFromSelection'].execute({ name: 'hero' })
    expect(result).toEqual({ success: true, sliceId: 'slice-hero' })
  })

  it('returns no_selection error when selection is empty', async () => {
    sliceMock.fn = () => null
    const { createKovaTools } = await import('@/ai/kova-tools')
    const tools = createKovaTools({} as never)
    const result = await (tools as Record<string, AnyExecute>)['createSliceFromSelection'].execute({ name: 'hero' })
    expect(result).toEqual({ error: 'No selection to slice', code: 'no_selection' })
  })

  it('returns engine_unavailable when Cluster 07a API is absent', async () => {
    sliceMock.fn = undefined
    const { createKovaTools } = await import('@/ai/kova-tools')
    const tools = createKovaTools({} as never)
    const result = await (tools as Record<string, AnyExecute>)['createSliceFromSelection'].execute({ name: 'hero' })
    expect(result).toEqual({ error: 'Slice engine API not available', code: 'engine_unavailable' })
  })
})
