import { describe, test, expect, beforeEach, mock } from 'bun:test'

// W9b Cluster 03 — POST /api/brands/create handler tests (Plan 03 Task 11).
// Mirrors the deletion-request.test.ts mocking pattern.

interface MockSupabase {
  rpc: ReturnType<typeof mock>
}

let mockUserSupabase: MockSupabase
let mockAdminSupabase: MockSupabase
let verifyAuthBehavior: 'ok' | 'throw'
let idempotencyBehavior: 'fresh' | 'cached' | 'conflict'
let rateLimitCount = 1
let cachedBody: unknown = null
let cachedStatus = 200

function resetMocks(): void {
  mockUserSupabase = {
    rpc: mock(() =>
      Promise.resolve({
        data: { id: 'b1', name: 'Patagonia', slug: 'patagonia', color: 'sage' },
        error: null,
      })
    ),
  }
  mockAdminSupabase = {
    rpc: mock(() => Promise.resolve({ data: rateLimitCount, error: null })),
  }
  verifyAuthBehavior = 'ok'
  idempotencyBehavior = 'fresh'
  rateLimitCount = 1
  cachedBody = null
  cachedStatus = 200
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

const handler = (await import('../../../../api/brands/create')).default

function postReq(body: object, headers: Record<string, string> = {}): Request {
  return new Request('http://x/api/brands/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer fake', ...headers },
    body: JSON.stringify(body),
  })
}

describe('POST /api/brands/create', () => {
  beforeEach(() => resetMocks())

  test('returns 200 + brand on happy path', async () => {
    const res = await handler(postReq({ name: 'Patagonia', url: 'https://patagonia.com' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.brand.id).toBe('b1')
    expect(body.brand.slug).toBe('patagonia')
  })

  test('returns 401 on UnauthenticatedError', async () => {
    verifyAuthBehavior = 'throw'
    const res = await handler(postReq({ name: 'X' }))
    expect(res.status).toBe(401)
    expect((await res.json()).error).toBe('unauthenticated')
  })

  test('returns 405 on non-POST', async () => {
    const res = await handler(new Request('http://x/api/brands/create', { method: 'GET' }))
    expect(res.status).toBe(405)
  })

  test('returns 400 on invalid JSON body', async () => {
    const req = new Request('http://x/api/brands/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer fake' },
      body: 'not-json{',
    })
    const res = await handler(req)
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('invalid_json')
  })

  test('returns 422 on name_required', async () => {
    const res = await handler(postReq({ name: '' }))
    expect(res.status).toBe(422)
    expect((await res.json()).error).toBe('name_required')
  })

  test('returns 422 on url_invalid (javascript: scheme)', async () => {
    const res = await handler(postReq({ name: 'X', url: 'javascript:alert(1)' }))
    expect(res.status).toBe(422)
    expect((await res.json()).error).toBe('url_invalid')
  })

  test('returns 429 when bump_rate_limit count exceeds 30', async () => {
    rateLimitCount = 31
    mockAdminSupabase.rpc = mock(() => Promise.resolve({ data: 31, error: null }))
    const res = await handler(postReq({ name: 'X' }))
    expect(res.status).toBe(429)
    expect((await res.json()).error).toBe('rate_limited')
  })

  test('returns 409 on slug_collision (H2 race)', async () => {
    mockUserSupabase.rpc = mock(() =>
      Promise.resolve({ data: null, error: { message: 'slug_collision', code: '40001' } })
    )
    const res = await handler(postReq({ name: 'X' }))
    expect(res.status).toBe(409)
    expect((await res.json()).error).toBe('slug_collision')
  })

  test('returns 422 on idempotency-key body conflict', async () => {
    idempotencyBehavior = 'conflict'
    const res = await handler(
      postReq({ name: 'X' }, { 'X-Idempotency-Key': '0123456789abcdef0123' })
    )
    expect(res.status).toBe(422)
  })

  test('replays cached response on idempotency-key hit', async () => {
    idempotencyBehavior = 'cached'
    cachedBody = { brand: { id: 'cached', name: 'Cached', slug: 'cached', color: 'coral' } }
    cachedStatus = 200
    const res = await handler(
      postReq({ name: 'X' }, { 'X-Idempotency-Key': '0123456789abcdef0123' })
    )
    expect(res.status).toBe(200)
    expect((await res.json()).brand.id).toBe('cached')
  })

  test('returns 500 on unknown RPC error', async () => {
    mockUserSupabase.rpc = mock(() =>
      Promise.resolve({ data: null, error: { message: 'connection refused', code: '53300' } })
    )
    const res = await handler(postReq({ name: 'X' }))
    expect(res.status).toBe(500)
    expect((await res.json()).error).toBe('internal_error')
  })
})
