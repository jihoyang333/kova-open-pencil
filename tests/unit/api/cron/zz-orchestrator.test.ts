import { describe, test, expect, beforeEach, mock } from 'bun:test'

// W8a Cluster 01 — POST /api/cron/delete-account orchestrator (Plan 01 Task 7).
//
// We INTENTIONALLY do NOT mock the per-step modules here. mock.module is
// process-global in bun:test and leaks into the step modules' own test files
// (tests/unit/api/cron/steps/*.test.ts), causing all step tests to receive
// the orchestrator's stub instead of the real impl.
//
// Instead: provide a mocked Supabase admin client that makes step modules
// short-circuit naturally. Each step (stripe/shopify/anthropic/storage/db)
// queries `users` or `brands` rows; returning empty datasets keeps each step
// at `{ ok: true }` without any real side effects.

const ORIG_CRON = process.env['CRON_SECRET']

let pendingUsers: { user_id: string }[]
let claimRowResult: unknown
let claimErr: { message: string } | null

function resetTestState(): void {
  pendingUsers = []
  claimRowResult = { id: 'qrow1', attempts: 1 }
  claimErr = null
}

mock.module('../../../../api/_shared/supabase-admin', () => ({
  getAdminClient: () => ({
    rpc: mock(async (name: string) => {
      if (name === 'claim_pending_deletion_users') return { data: pendingUsers, error: claimErr }
      if (name === 'claim_deletion_queue_row') return { data: claimRowResult, error: null }
      return { data: 1, error: null }
    }),
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: null, error: { code: 'PGRST116', message: 'No rows' } }),
          not: () => Promise.resolve({ data: [], error: null }),
          then: (resolve: (v: { data: unknown[]; error: null }) => void) => resolve({ data: [], error: null }),
        }),
        in: () => Promise.resolve({ data: [], error: null }),
      }),
      update: () => ({
        match: () => Promise.resolve({ error: null }),
        eq: () => Promise.resolve({ error: null }),
      }),
      delete: () => ({
        eq: () => Promise.resolve({ error: null }),
        in: () => Promise.resolve({ error: null }),
      }),
      insert: async () => ({ error: null }),
    }),
    storage: {
      from: () => ({
        list: async () => ({ data: [], error: null }),
        remove: async () => ({ data: [], error: null }),
      }),
    },
    auth: {
      admin: {
        getUserById: async () => ({ data: { user: { email: 'deleted@user.io' } }, error: null }),
      },
    },
  }),
}))

mock.module('../../../../api/_shared/sentry', () => ({
  captureServerException: mock(() => {}),
}))

mock.module('../../../../api/_shared/audit', () => ({
  writeAudit: mock(async () => {}),
}))

mock.module('../../../../api/_shared/email', () => ({
  sendEmail: mock(async () => ({ ok: true, id: 'rid' })),
}))

const handler = (await import('../../../../api/cron/delete-account')).default

describe('POST /api/cron/delete-account orchestrator', () => {
  beforeEach(() => {
    resetTestState()
    process.env['CRON_SECRET'] = 'test-secret'
    delete process.env['STRIPE_SECRET_KEY']
  })

  test('returns 401 without CRON_SECRET header', async () => {
    const req = new Request('http://x/api/cron/delete-account', { method: 'POST' })
    const res = await handler(req)
    expect(res.status).toBe(401)
  })

  test('returns 200 + zero counts when no pending users', async () => {
    pendingUsers = []
    const req = new Request('http://x/api/cron/delete-account', {
      method: 'POST',
      headers: { Authorization: 'Bearer test-secret' },
    })
    const res = await handler(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.processed).toBe(0)
  })

  test('returns 500 on claim_pending_deletion_users RPC error', async () => {
    pendingUsers = []
    claimErr = { message: 'database unavailable' }
    const req = new Request('http://x/api/cron/delete-account', {
      method: 'POST',
      headers: { Authorization: 'Bearer test-secret' },
    })
    const res = await handler(req)
    expect(res.status).toBe(500)
  })

  test('processes one user — all 5 steps succeed via empty-data short-circuit', async () => {
    pendingUsers = [{ user_id: 'u1' }]
    const req = new Request('http://x/api/cron/delete-account', {
      method: 'POST',
      headers: { Authorization: 'Bearer test-secret' },
    })
    const res = await handler(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.processed).toBe(1)
    expect(body.succeeded).toBe(1)
    expect(body.terminal).toBe(0)
  })

  test('handles claim RPC returning empty array (no row matched)', async () => {
    pendingUsers = [{ user_id: 'u1' }]
    claimRowResult = []
    const req = new Request('http://x/api/cron/delete-account', {
      method: 'POST',
      headers: { Authorization: 'Bearer test-secret' },
    })
    const res = await handler(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.processed).toBe(1)
    expect(body.succeeded).toBe(1)
  })

  test('handles claim RPC returning null (no row)', async () => {
    pendingUsers = [{ user_id: 'u1' }]
    claimRowResult = null
    const req = new Request('http://x/api/cron/delete-account', {
      method: 'POST',
      headers: { Authorization: 'Bearer test-secret' },
    })
    const res = await handler(req)
    expect(res.status).toBe(200)
  })

  test('handles claim RPC returning single object (Array.isArray fallback)', async () => {
    pendingUsers = [{ user_id: 'u1' }]
    claimRowResult = { id: 'qrow1', attempts: 2 }
    const req = new Request('http://x/api/cron/delete-account', {
      method: 'POST',
      headers: { Authorization: 'Bearer test-secret' },
    })
    const res = await handler(req)
    expect(res.status).toBe(200)
  })
})

if (ORIG_CRON !== undefined) process.env['CRON_SECRET'] = ORIG_CRON
