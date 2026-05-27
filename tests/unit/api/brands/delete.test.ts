import { describe, test, expect, beforeEach, mock } from 'bun:test'

// W9b Cluster 03 — DELETE /api/brands/delete handler tests (Plan 03 Task 14).
// Includes the B-CRIT9 regression test: auth resolves BEFORE the RPC.

interface MockSupabase {
  rpc: ReturnType<typeof mock>
}

interface MockStorage {
  from: (bucket: string) => {
    list: (path: string, opts: { limit: number }) => Promise<{ data: unknown; error: { message: string } | null }>
    remove: (paths: string[]) => Promise<{ data: unknown; error: { message: string } | null }>
  }
}

let mockUserSupabase: MockSupabase
let mockAdminSupabase: MockSupabase & { storage: MockStorage }
let verifyAuthBehavior: 'ok' | 'throw'
let rateLimitCount = 1
let purgeBehavior: 'ok' | 'partial' = 'ok'
let rpcCallOrder: string[] = []

function makeStorage(): MockStorage {
  return {
    from: (_bucket: string) => ({
      async list(_p: string, _o: { limit: number }) {
        return { data: [{ name: 'logo.png' }], error: null }
      },
      async remove(_paths: string[]) {
        return {
          data: null,
          error: purgeBehavior === 'ok' ? null : { message: 'fail' },
        }
      },
    }),
  }
}

function resetMocks(): void {
  rpcCallOrder = []
  mockUserSupabase = {
    rpc: mock((name: string) => {
      rpcCallOrder.push(`user:${name}`)
      return Promise.resolve({
        data: { name: 'Patagonia', canvas_count: 5 },
        error: null,
      })
    }),
  }
  mockAdminSupabase = {
    rpc: mock((name: string) => {
      rpcCallOrder.push(`admin:${name}`)
      return Promise.resolve({ data: rateLimitCount, error: null })
    }),
    storage: makeStorage(),
  }
  verifyAuthBehavior = 'ok'
  rateLimitCount = 1
  purgeBehavior = 'ok'
}

mock.module('../../../../api/_shared/verify-auth-full', () => ({
  verifyAuthFull: async () => {
    if (verifyAuthBehavior === 'throw') {
      const { UnauthenticatedError } = await import('../../../../api/_shared/verify-auth-full')
      throw new UnauthenticatedError('test')
    }
    rpcCallOrder.push('auth:resolved')
    return { supabase: mockUserSupabase, userId: 'u1', email: 'a@b.co' }
  },
  UnauthenticatedError: class UnauthenticatedError extends Error {
    constructor(reason: string) {
      super(reason)
      this.name = 'UnauthenticatedError'
    }
  },
}))

mock.module('../../../../api/_shared/supabase-admin', () => ({
  getAdminClient: () => mockAdminSupabase,
}))

mock.module('../../../../api/_shared/idempotency', () => ({
  verifyIdempotency: async () => ({ cached: false, persist: mock(async () => {}) }),
  IdempotencyHttpError: class IdempotencyHttpError extends Error {
    constructor(
      public readonly status: number,
      public readonly payload: { error: string }
    ) {
      super(`HTTP ${status}`)
    }
  },
}))

mock.module('../../../../api/_shared/audit', () => ({
  writeAudit: mock(async () => {}),
}))

// NOTE: do NOT mock.module('../../../../api/_shared/storage-sweep') here —
// the mock.module call would persist across the whole test run and break
// the dedicated tests/unit/api/_shared/storage-sweep.test.ts file. Instead
// we stub the admin client's `storage.from(...)` so the REAL sweep runs
// against fixture data (see makeStorage above) and we can still vary the
// partial/ok branch via purgeBehavior.

const handler = (await import('../../../../api/brands/delete')).default
const UUID = '00000000-0000-4000-8000-000000000001'

function postReq(body: object): Request {
  return new Request('http://x/api/brands/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer fake' },
    body: JSON.stringify(body),
  })
}

describe('DELETE /api/brands/delete', () => {
  beforeEach(() => resetMocks())

  test('returns 200 + deleted_brand_name + sweep on happy path', async () => {
    const res = await handler(postReq({ brand_id: UUID, confirm_typed: 'Patagonia' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.deleted_brand_name).toBe('Patagonia')
    // Real purgeBrandStorageObjects iterates 4 buckets; each returns the
    // stub's 1 fixture object → swept = 4.
    expect(body.storage_sweep.swept).toBe(4)
    expect(body.storage_sweep.failed).toEqual([])
  })

  test('B-CRIT9: returns 401 when auth.getUser() yields no user — RPC never runs', async () => {
    verifyAuthBehavior = 'throw'
    const res = await handler(postReq({ brand_id: UUID, confirm_typed: 'X' }))
    expect(res.status).toBe(401)
    // RPC must not have been called.
    expect(rpcCallOrder.filter((c) => c.startsWith('user:delete_brand'))).toEqual([])
  })

  test('B-CRIT9: auth resolves BEFORE the delete_brand RPC', async () => {
    await handler(postReq({ brand_id: UUID, confirm_typed: 'Patagonia' }))
    const authIdx = rpcCallOrder.indexOf('auth:resolved')
    const rpcIdx = rpcCallOrder.indexOf('user:delete_brand')
    expect(authIdx).toBeGreaterThanOrEqual(0)
    expect(rpcIdx).toBeGreaterThanOrEqual(0)
    expect(authIdx).toBeLessThan(rpcIdx)
  })

  test('returns 422 on confirm_mismatch', async () => {
    mockUserSupabase.rpc = mock(() =>
      Promise.resolve({ data: null, error: { message: 'confirm_mismatch', code: '22023' } })
    )
    const res = await handler(postReq({ brand_id: UUID, confirm_typed: 'wrong' }))
    expect(res.status).toBe(422)
    expect((await res.json()).error).toBe('confirm_mismatch')
  })

  test('returns 404 on not_found', async () => {
    mockUserSupabase.rpc = mock(() =>
      Promise.resolve({ data: null, error: { message: 'not_found', code: 'P0002' } })
    )
    const res = await handler(postReq({ brand_id: UUID, confirm_typed: 'X' }))
    expect(res.status).toBe(404)
  })

  test('returns 422 on missing confirm_typed', async () => {
    const res = await handler(postReq({ brand_id: UUID }))
    expect(res.status).toBe(422)
    expect((await res.json()).error).toBe('confirm_required')
  })

  test('returns 429 when rate-limit exceeded (10/min)', async () => {
    rateLimitCount = 11
    mockAdminSupabase.rpc = mock(() => Promise.resolve({ data: 11, error: null }))
    const res = await handler(postReq({ brand_id: UUID, confirm_typed: 'Patagonia' }))
    expect(res.status).toBe(429)
    expect((await res.json()).error).toBe('rate_limited')
  })

  test('partial sweep failure does not break the response', async () => {
    purgeBehavior = 'partial'
    const res = await handler(postReq({ brand_id: UUID, confirm_typed: 'Patagonia' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.storage_sweep.failed.length).toBeGreaterThan(0)
  })

  test('accepts DELETE method as well as POST', async () => {
    const req = new Request('http://x/api/brands/delete', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer fake' },
      body: JSON.stringify({ brand_id: UUID, confirm_typed: 'Patagonia' }),
    })
    const res = await handler(req)
    expect(res.status).toBe(200)
  })

  test('returns 405 on GET', async () => {
    const res = await handler(new Request('http://x/api/brands/delete', { method: 'GET' }))
    expect(res.status).toBe(405)
  })
})
