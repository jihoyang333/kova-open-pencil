import { describe, test, expect, beforeEach, mock } from 'bun:test'

interface MockAdmin {
  rpc?: ReturnType<typeof mock>
  auth: { admin: { updateUserById: ReturnType<typeof mock> } }
}

let mockAdminSupabase: MockAdmin
let verifyAuthBehavior: 'ok' | 'throw'

function resetMocks(): void {
  mockAdminSupabase = {
    auth: {
      admin: {
        updateUserById: mock(async () => ({ data: { user: { id: 'u1' } }, error: null })),
      },
    },
  }
  verifyAuthBehavior = 'ok'
}

mock.module('../../../../api/_shared/verify-auth-full', () => ({
  verifyAuthFull: async () => {
    if (verifyAuthBehavior === 'throw') {
      const { UnauthenticatedError } = await import('../../../../api/_shared/verify-auth-full')
      throw new UnauthenticatedError('test')
    }
    return { supabase: {}, userId: 'u1', email: 'old@b.co' }
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

const handler = (await import('../../../../api/auth/email-change-request')).default

describe('POST /api/auth/email-change-request', () => {
  beforeEach(() => resetMocks())

  test('returns 200 + triggers Supabase admin email update', async () => {
    const req = new Request('http://x/api/auth/email-change-request', {
      method: 'POST',
      headers: { Authorization: 'Bearer fake', 'Content-Type': 'application/json' },
      body: JSON.stringify({ new_email: 'new@b.co' }),
    })
    const res = await handler(req)
    expect(res.status).toBe(200)
    expect(mockAdminSupabase.auth.admin.updateUserById).toHaveBeenCalled()
  })

  test('returns 400 on invalid email (Zod)', async () => {
    const req = new Request('http://x/api/auth/email-change-request', {
      method: 'POST',
      headers: { Authorization: 'Bearer fake', 'Content-Type': 'application/json' },
      body: JSON.stringify({ new_email: 'not-an-email' }),
    })
    const res = await handler(req)
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('invalid_email')
  })

  test('returns 409 when email already exists', async () => {
    mockAdminSupabase.auth.admin.updateUserById = mock(async () => ({
      data: null,
      error: { message: 'Email address already exists', code: 'email_exists' },
    }))
    const req = new Request('http://x/api/auth/email-change-request', {
      method: 'POST',
      headers: { Authorization: 'Bearer fake', 'Content-Type': 'application/json' },
      body: JSON.stringify({ new_email: 'taken@b.co' }),
    })
    const res = await handler(req)
    expect(res.status).toBe(409)
    expect((await res.json()).error).toBe('email_in_use')
  })

  test('returns 401 when unauthenticated', async () => {
    verifyAuthBehavior = 'throw'
    const req = new Request('http://x/api/auth/email-change-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ new_email: 'new@b.co' }),
    })
    const res = await handler(req)
    expect(res.status).toBe(401)
  })

  test('returns 405 on GET', async () => {
    const req = new Request('http://x/api/auth/email-change-request', { method: 'GET' })
    const res = await handler(req)
    expect(res.status).toBe(405)
  })
})
