import { describe, test, expect, mock } from 'bun:test'

import { enforceRateLimit } from '../../../../api/_shared/rate-limit'

interface MockAdmin {
  rpc: ReturnType<typeof mock>
}

describe('enforceRateLimit', () => {
  test('allowed=true when count <= max', async () => {
    const admin: MockAdmin = {
      rpc: mock(() => Promise.resolve({ data: 5, error: null })),
    }
    const res = await enforceRateLimit(admin as unknown as Parameters<typeof enforceRateLimit>[0], 'u1', 'brands.create', 30)
    expect(res.allowed).toBe(true)
    expect(res.count).toBe(5)
  })

  test('allowed=false when count > max', async () => {
    const admin: MockAdmin = {
      rpc: mock(() => Promise.resolve({ data: 31, error: null })),
    }
    const res = await enforceRateLimit(admin as unknown as Parameters<typeof enforceRateLimit>[0], 'u1', 'brands.create', 30)
    expect(res.allowed).toBe(false)
    expect(res.count).toBe(31)
  })

  test('fail-open on DB error (logged warning, allowed=true)', async () => {
    const admin: MockAdmin = {
      rpc: mock(() => Promise.resolve({ data: null, error: { message: 'boom' } })),
    }
    const res = await enforceRateLimit(admin as unknown as Parameters<typeof enforceRateLimit>[0], 'u1', 'brands.create', 30)
    expect(res.allowed).toBe(true)
    expect(res.count).toBe(0)
  })

  test('passes correct window_start (floor of current minute)', async () => {
    const admin: MockAdmin = {
      rpc: mock(() => Promise.resolve({ data: 1, error: null })),
    }
    await enforceRateLimit(admin as unknown as Parameters<typeof enforceRateLimit>[0], 'u1', 'brands.delete', 10)
    const call = admin.rpc.mock.calls[0] as [string, { p_window_start: string }]
    const passed = new Date(call[1].p_window_start)
    expect(passed.getSeconds()).toBe(0)
    expect(passed.getMilliseconds()).toBe(0)
  })

  test('passes endpoint label through to RPC', async () => {
    const admin: MockAdmin = {
      rpc: mock(() => Promise.resolve({ data: 1, error: null })),
    }
    await enforceRateLimit(admin as unknown as Parameters<typeof enforceRateLimit>[0], 'u1', 'brands.archive', 30)
    const call = admin.rpc.mock.calls[0] as [string, { p_endpoint: string }]
    expect(call[1].p_endpoint).toBe('brands.archive')
  })
})
