import { describe, test, expect, beforeEach, mock } from 'bun:test'

interface MockSupabase {
  rpc: ReturnType<typeof mock>
}

let mockUserSupabase: MockSupabase
let mockAdminSupabase: MockSupabase
let verifyAuthBehavior: 'ok' | 'throw'

function resetMocks(): void {
  mockUserSupabase = { rpc: mock(() => Promise.resolve({ data: true, error: null })) }
  mockAdminSupabase = { rpc: mock(() => Promise.resolve({ data: null, error: null })) }
  verifyAuthBehavior = 'ok'
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

mock.module('../../../../api/_shared/audit', () => ({ writeAudit: mock(async () => {}) }))

mock.module('../../../../api/_shared/email', () => ({
  sendEmail: mock(async () => ({ ok: true, id: 'rid' })),
}))

const handler = (await import('../../../../api/account/restore')).default

describe('POST /api/account/restore', () => {
  beforeEach(() => resetMocks())

  test('returns 200 on successful restore', async () => {
    const req = new Request('http://x/api/account/restore', {
      method: 'POST',
      headers: { Authorization: 'Bearer fake' },
    })
    const res = await handler(req)
    expect(res.status).toBe(200)
    expect((await res.json()).success).toBe(true)
  })

  test('returns 409 when restore_account returns false', async () => {
    mockUserSupabase.rpc = mock(() => Promise.resolve({ data: false, error: null }))
    const req = new Request('http://x/api/account/restore', {
      method: 'POST',
      headers: { Authorization: 'Bearer fake' },
    })
    const res = await handler(req)
    expect(res.status).toBe(409)
    expect((await res.json()).error).toBe('no_pending_deletion')
  })

  test('returns 401 when unauthenticated', async () => {
    verifyAuthBehavior = 'throw'
    const req = new Request('http://x/api/account/restore', { method: 'POST' })
    const res = await handler(req)
    expect(res.status).toBe(401)
  })

  test('returns 405 on GET', async () => {
    const req = new Request('http://x/api/account/restore', { method: 'GET' })
    const res = await handler(req)
    expect(res.status).toBe(405)
  })

  test('returns 500 on RPC failure', async () => {
    mockUserSupabase.rpc = mock(() =>
      Promise.resolve({ data: null, error: { message: 'connection refused' } })
    )
    const req = new Request('http://x/api/account/restore', {
      method: 'POST',
      headers: { Authorization: 'Bearer fake' },
    })
    const res = await handler(req)
    expect(res.status).toBe(500)
  })
})
