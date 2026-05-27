import { describe, test, expect, beforeEach, mock } from 'bun:test'

// W9b Cluster 03 — POST /api/brands/rename handler tests (Plan 03 Task 12).

interface MockSupabase {
  rpc: ReturnType<typeof mock>
  from: ReturnType<typeof mock>
}

let mockUserSupabase: MockSupabase
let mockAdminSupabase: { rpc: ReturnType<typeof mock> }
let verifyAuthBehavior: 'ok' | 'throw'
let rateLimitCount = 1

function makeFromChain(existingName: string | null = 'Old Name') {
  return mock(() => ({
    select: () => ({
      eq: () => ({
        maybeSingle: async () => ({ data: existingName ? { name: existingName } : null, error: null }),
      }),
    }),
  }))
}

function resetMocks(): void {
  mockUserSupabase = {
    rpc: mock(() => Promise.resolve({ data: { id: 'b1', name: 'New Name' }, error: null })),
    from: makeFromChain('Old Name'),
  }
  mockAdminSupabase = {
    rpc: mock(() => Promise.resolve({ data: rateLimitCount, error: null })),
  }
  verifyAuthBehavior = 'ok'
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

mock.module('../../../../api/_shared/audit', () => ({
  writeAudit: mock(async () => {}),
}))

const handler = (await import('../../../../api/brands/rename')).default
const UUID = '00000000-0000-4000-8000-000000000001'

function postReq(body: object): Request {
  return new Request('http://x/api/brands/rename', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer fake' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/brands/rename', () => {
  beforeEach(() => resetMocks())

  test('returns 200 + brand on happy path', async () => {
    const res = await handler(postReq({ brand_id: UUID, name: 'New Name' }))
    expect(res.status).toBe(200)
    expect((await res.json()).brand.name).toBe('New Name')
  })

  test('returns 401 on unauth', async () => {
    verifyAuthBehavior = 'throw'
    const res = await handler(postReq({ brand_id: UUID, name: 'x' }))
    expect(res.status).toBe(401)
  })

  test('returns 422 on bad brand_id', async () => {
    const res = await handler(postReq({ brand_id: 'not-a-uuid', name: 'x' }))
    expect(res.status).toBe(422)
    expect((await res.json()).error).toBe('brand_id_required')
  })

  test('returns 422 on empty name', async () => {
    const res = await handler(postReq({ brand_id: UUID, name: '' }))
    expect(res.status).toBe(422)
    expect((await res.json()).error).toBe('name_required')
  })

  test('returns 404 on RPC not_found', async () => {
    mockUserSupabase.rpc = mock(() =>
      Promise.resolve({ data: null, error: { message: 'not_found', code: 'P0002' } })
    )
    const res = await handler(postReq({ brand_id: UUID, name: 'X' }))
    expect(res.status).toBe(404)
  })

  test('returns 429 when rate-limit exceeded (60/min)', async () => {
    rateLimitCount = 61
    mockAdminSupabase.rpc = mock(() => Promise.resolve({ data: 61, error: null }))
    const res = await handler(postReq({ brand_id: UUID, name: 'X' }))
    expect(res.status).toBe(429)
  })

  test('returns 405 on non-POST', async () => {
    const res = await handler(new Request('http://x/api/brands/rename', { method: 'GET' }))
    expect(res.status).toBe(405)
  })
})
