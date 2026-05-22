import { describe, test, expect, mock } from 'bun:test'

import { runStep } from '../../../../../api/cron/steps/storage'

// Plan 01 Task 6d — cron step: storage.

describe('cron step: storage', () => {
  test('empty buckets → ok', async () => {
    const supabase = {
      storage: {
        from: () => ({
          list: async () => ({ data: [], error: null }),
          remove: async () => ({ data: [], error: null }),
        }),
      },
      from: () => ({ select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }) }),
    } as never
    const r = await runStep({ supabase, userId: 'u1', idempotencyKey: 'k1' })
    expect(r.ok).toBe(true)
  })

  test('paginated list + bulk-remove across 4 buckets', async () => {
    const removeMock = mock(async () => ({ data: [], error: null }))
    const supabase = {
      storage: {
        from: () => ({
          list: async () => ({ data: [{ name: 'a.png' }, { name: 'b.png' }], error: null }),
          remove: removeMock,
        }),
      },
      from: () => ({ select: () => ({ eq: () => Promise.resolve({ data: [{ id: 'b1' }], error: null }) }) }),
    } as never
    const r = await runStep({ supabase, userId: 'u1', idempotencyKey: 'k1' })
    expect(r.ok).toBe(true)
    expect(removeMock).toHaveBeenCalled()
  })

  test('bucket-not-found error is treated as success', async () => {
    const supabase = {
      storage: {
        from: () => ({
          list: async () => ({ data: null, error: { message: 'Bucket not found' } }),
          remove: async () => ({ data: [], error: null }),
        }),
      },
      from: () => ({ select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }) }),
    } as never
    const r = await runStep({ supabase, userId: 'u1', idempotencyKey: 'k1' })
    expect(r.ok).toBe(true)
  })

  test('returns retriable on Storage error other than not-found', async () => {
    const supabase = {
      storage: {
        from: () => ({
          list: async () => ({ data: null, error: { message: 'Internal server error' } }),
          remove: async () => ({ data: [], error: null }),
        }),
      },
      from: () => ({ select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }) }),
    } as never
    const r = await runStep({ supabase, userId: 'u1', idempotencyKey: 'k1' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.retriable).toBe(true)
  })
})
