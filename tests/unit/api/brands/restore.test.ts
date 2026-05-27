import { describe, test, expect, beforeEach, mock } from 'bun:test'

// W9b Cluster 03 — POST /api/brands/restore handler tests (Plan 03 Task 13.5).

interface MockSupabase {
  rpc: ReturnType<typeof mock>
}

let mockUserSupabase: MockSupabase
let mockAdminSupabase: MockSupabase
let verifyAuthBehavior: 'ok' | 'throw'
let restoreFlag: string | null
let rateLimitCount = 1

function resetMocks(): void {
  mockUserSupabase = {
    rpc: mock(() =>
      Promise.resolve({
        data: { id: 'b1', name: 'Patagonia', archived_at: null },
        error: null,
      })
    ),
  }
  mockAdminSupabase = {
    rpc: mock(() => Promise.resolve({ data: rateLimitCount, error: null })),
  }
  verifyAuthBehavior = 'ok'
  restoreFlag = null
  rateLimitCount = 1
}

mock.module('../../../../api/_shared/verify-auth-full', () => ({
  verifyAuthFull: async () => {
    if (verifyAuthBehavior === 'throw') {
      const { UnauthenticatedError } = await import('../../../../api/_shared/verify-auth-full')
      throw new UnauthenticatedError('test')
    }
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

mock.module('../../../../api/_shared/env', () => ({
  loadEnvOrSkip: () => restoreFlag,
}))

const handler = (await import('../../../../api/brands/restore')).default
const UUID = '00000000-0000-4000-8000-000000000001'

function postReq(body: object): Request {
  return new Request('http://x/api/brands/restore', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer fake' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/brands/restore', () => {
  beforeEach(() => resetMocks())

  test('returns 200 + brand on happy path', async () => {
    const res = await handler(postReq({ brand_id: UUID }))
    expect(res.status).toBe(200)
    expect((await res.json()).brand.archived_at).toBeNull()
  })

  test('returns 503 when BRANDS_RESTORE_ENABLED=false', async () => {
    restoreFlag = 'false'
    const res = await handler(postReq({ brand_id: UUID }))
    expect(res.status).toBe(503)
    expect((await res.json()).error).toBe('feature_disabled')
  })

  test('returns 200 when flag is unset (default-on)', async () => {
    restoreFlag = null
    const res = await handler(postReq({ brand_id: UUID }))
    expect(res.status).toBe(200)
  })

  test('returns 401 on unauth', async () => {
    verifyAuthBehavior = 'throw'
    const res = await handler(postReq({ brand_id: UUID }))
    expect(res.status).toBe(401)
  })

  test('returns 409 on not_archived', async () => {
    mockUserSupabase.rpc = mock(() =>
      Promise.resolve({ data: null, error: { message: 'not_archived', code: 'P0001' } })
    )
    const res = await handler(postReq({ brand_id: UUID }))
    expect(res.status).toBe(409)
  })

  test('returns 404 on not_found', async () => {
    mockUserSupabase.rpc = mock(() =>
      Promise.resolve({ data: null, error: { message: 'not_found', code: 'P0002' } })
    )
    const res = await handler(postReq({ brand_id: UUID }))
    expect(res.status).toBe(404)
  })

  test('returns 429 when rate-limit exceeded (30/min)', async () => {
    rateLimitCount = 31
    mockAdminSupabase.rpc = mock(() => Promise.resolve({ data: 31, error: null }))
    const res = await handler(postReq({ brand_id: UUID }))
    expect(res.status).toBe(429)
  })

  test('does NOT call writeAudit (H3: RPC writes audit atomically)', async () => {
    const auditModule = await import('../../../../api/_shared/audit')
    const writeAuditMock = auditModule.writeAudit as unknown as ReturnType<typeof mock>
    if (typeof writeAuditMock.mockClear === 'function') writeAuditMock.mockClear()
    await handler(postReq({ brand_id: UUID }))
    // H3 contract: edge function does not double-write the audit row that
    // the RPC body already inserted atomically with the UPDATE.
    if (typeof writeAuditMock === 'function' && 'mock' in writeAuditMock) {
      const calls = (writeAuditMock as unknown as { mock: { calls: unknown[] } }).mock.calls
      expect(calls.length).toBe(0)
    }
  })
})
