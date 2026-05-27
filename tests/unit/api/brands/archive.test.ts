import { describe, test, expect, beforeEach, mock } from 'bun:test'

// W9b Cluster 03 — POST /api/brands/archive handler tests (Plan 03 Task 13).

interface MockSupabase {
  rpc: ReturnType<typeof mock>
  from: ReturnType<typeof mock>
}

let mockUserSupabase: MockSupabase
let mockAdminSupabase: { rpc: ReturnType<typeof mock> }
let verifyAuthBehavior: 'ok' | 'throw'
let rateLimitCount = 1

function makeFromChain(nextId: string | null = 'next-brand', canvasCount = 3) {
  return mock((table: string) => {
    if (table === 'brands') {
      return {
        select: () => ({
          is: () => ({
            order: () => ({
              limit: () => ({
                maybeSingle: async () => ({ data: nextId ? { id: nextId } : null, error: null }),
              }),
            }),
          }),
        }),
      }
    }
    // canvases count chain
    return {
      select: () => ({
        eq: () => ({ data: null, count: canvasCount, error: null }),
      }),
    }
  })
}

function resetMocks(): void {
  mockUserSupabase = {
    rpc: mock(() =>
      Promise.resolve({
        data: { id: 'b1', name: 'Patagonia', archived_at: '2026-06-07T00:00:00Z' },
        error: null,
      })
    ),
    from: makeFromChain('next-brand', 3),
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

const handler = (await import('../../../../api/brands/archive')).default
const UUID = '00000000-0000-4000-8000-000000000001'

function postReq(body: object): Request {
  return new Request('http://x/api/brands/archive', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer fake' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/brands/archive', () => {
  beforeEach(() => resetMocks())

  test('returns 200 + brand + next_brand_id on happy path', async () => {
    const res = await handler(postReq({ brand_id: UUID }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.brand.id).toBe('b1')
    expect(body.next_brand_id).toBe('next-brand')
  })

  test('returns 200 with null next_brand_id when no remaining active brands', async () => {
    mockUserSupabase.from = makeFromChain(null, 0)
    const res = await handler(postReq({ brand_id: UUID }))
    expect(res.status).toBe(200)
    expect((await res.json()).next_brand_id).toBeNull()
  })

  test('returns 401 on unauth', async () => {
    verifyAuthBehavior = 'throw'
    const res = await handler(postReq({ brand_id: UUID }))
    expect(res.status).toBe(401)
  })

  test('returns 409 on already_archived', async () => {
    mockUserSupabase.rpc = mock(() =>
      Promise.resolve({ data: null, error: { message: 'already_archived', code: 'P0001' } })
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

  test('returns 422 on bad brand_id', async () => {
    const res = await handler(postReq({ brand_id: 'nope' }))
    expect(res.status).toBe(422)
  })

  test('returns 429 when rate-limit exceeded (30/min)', async () => {
    rateLimitCount = 31
    mockAdminSupabase.rpc = mock(() => Promise.resolve({ data: 31, error: null }))
    const res = await handler(postReq({ brand_id: UUID }))
    expect(res.status).toBe(429)
  })
})
