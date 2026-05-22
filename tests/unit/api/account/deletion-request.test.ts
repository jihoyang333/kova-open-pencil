import { describe, test, expect, beforeEach, mock } from 'bun:test'

// W8a Cluster 01 — POST /api/account/deletion-request (Plan 01 Task 3.1).
// Mocks Cluster 11 helpers (audit, idempotency, email) + the c01 auth + admin
// helpers, then exercises the handler entry point per HTTP-status branch.

interface MockSupabase {
  rpc: ReturnType<typeof mock>
}

let mockUserSupabase: MockSupabase
let mockAdminSupabase: MockSupabase & { auth?: { admin: { updateUserById: ReturnType<typeof mock> } } }
let verifyAuthBehavior: 'ok' | 'throw'
let idempotencyBehavior: 'fresh' | 'cached' | 'conflict'
let cachedBody: unknown = null
let cachedStatus = 200
let rateLimitCount = 1

function resetMocks(): void {
  mockUserSupabase = {
    rpc: mock(() => Promise.resolve({ data: '2026-06-21T00:00:00Z', error: null })),
  }
  mockAdminSupabase = {
    rpc: mock(() => Promise.resolve({ data: rateLimitCount, error: null })),
  }
  verifyAuthBehavior = 'ok'
  idempotencyBehavior = 'fresh'
  cachedBody = null
  cachedStatus = 200
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
  verifyIdempotency: async () => {
    if (idempotencyBehavior === 'conflict') {
      const { IdempotencyHttpError } = await import('../../../../api/_shared/idempotency')
      throw new IdempotencyHttpError(422, { error: 'idempotency_key_reused_with_different_body' })
    }
    if (idempotencyBehavior === 'cached') {
      return { cached: true, status: cachedStatus, body: cachedBody }
    }
    return { cached: false, persist: mock(async () => {}) }
  },
  IdempotencyHttpError: class IdempotencyHttpError extends Error {
    constructor(
      public readonly status: number,
      public readonly payload: { error: string }
    ) {
      super(`HTTP ${status}: ${payload.error}`)
    }
  },
}))

mock.module('../../../../api/_shared/audit', () => ({
  writeAudit: mock(async () => {}),
}))

mock.module('../../../../api/_shared/email', () => ({
  sendEmail: mock(async () => ({ ok: true, id: 'rid', skipped: false })),
}))

const handler = (await import('../../../../api/account/deletion-request')).default

describe('POST /api/account/deletion-request', () => {
  beforeEach(() => resetMocks())

  test('returns 200 + scheduled_purge_at on happy path', async () => {
    const req = new Request('http://x/api/account/deletion-request', {
      method: 'POST',
      headers: { Authorization: 'Bearer fake' },
    })
    const res = await handler(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.scheduled_purge_at).toBe('2026-06-21T00:00:00Z')
  })

  test('returns 401 on UnauthenticatedError', async () => {
    verifyAuthBehavior = 'throw'
    const req = new Request('http://x/api/account/deletion-request', { method: 'POST' })
    const res = await handler(req)
    expect(res.status).toBe(401)
    expect((await res.json()).error).toBe('unauthenticated')
  })

  test('returns 405 on non-POST', async () => {
    const req = new Request('http://x/api/account/deletion-request', { method: 'GET' })
    const res = await handler(req)
    expect(res.status).toBe(405)
  })

  test('returns 409 when RPC raises "Already pending"', async () => {
    mockUserSupabase.rpc = mock(() =>
      Promise.resolve({ data: null, error: { message: 'Already pending deletion or user not found', code: 'P0001' } })
    )
    const req = new Request('http://x/api/account/deletion-request', {
      method: 'POST',
      headers: { Authorization: 'Bearer fake' },
    })
    const res = await handler(req)
    expect(res.status).toBe(409)
    expect((await res.json()).error).toBe('already_pending')
  })

  test('returns 429 when bump_rate_limit count exceeds 5', async () => {
    rateLimitCount = 6
    mockAdminSupabase.rpc = mock(() => Promise.resolve({ data: 6, error: null }))
    const req = new Request('http://x/api/account/deletion-request', {
      method: 'POST',
      headers: { Authorization: 'Bearer fake' },
    })
    const res = await handler(req)
    expect(res.status).toBe(429)
    const body = await res.json()
    expect(body.error).toBe('rate_limited')
    expect(body.retry_after_seconds).toBe(60)
  })

  test('returns 422 on idempotency-key body conflict', async () => {
    idempotencyBehavior = 'conflict'
    const req = new Request('http://x/api/account/deletion-request', {
      method: 'POST',
      headers: { Authorization: 'Bearer fake', 'X-Idempotency-Key': '0123456789abcdef0123' },
    })
    const res = await handler(req)
    expect(res.status).toBe(422)
  })

  test('replays cached response on idempotency-key hit', async () => {
    idempotencyBehavior = 'cached'
    cachedBody = { success: true, scheduled_purge_at: '2026-06-15T00:00:00Z' }
    cachedStatus = 200
    const req = new Request('http://x/api/account/deletion-request', {
      method: 'POST',
      headers: { Authorization: 'Bearer fake', 'X-Idempotency-Key': '0123456789abcdef0123' },
    })
    const res = await handler(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.scheduled_purge_at).toBe('2026-06-15T00:00:00Z')
  })

  test('returns 500 on unknown RPC error', async () => {
    mockUserSupabase.rpc = mock(() =>
      Promise.resolve({ data: null, error: { message: 'connection refused', code: '53300' } })
    )
    const req = new Request('http://x/api/account/deletion-request', {
      method: 'POST',
      headers: { Authorization: 'Bearer fake' },
    })
    const res = await handler(req)
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('internal_error')
    expect(body.request_id).toBeTruthy()
  })
})
