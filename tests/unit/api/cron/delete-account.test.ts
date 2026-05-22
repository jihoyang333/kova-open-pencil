import { describe, test, expect, beforeEach, mock } from 'bun:test'

// W8a Cluster 01 — POST /api/cron/delete-account orchestrator (Plan 01 Task 7).

const ORIG_CRON = process.env['CRON_SECRET']

let pendingUsers: { user_id: string }[]
let claimRowResult: unknown
let stepBehavior: 'ok' | 'retriable' | 'terminal'

function resetTestState(): void {
  pendingUsers = []
  claimRowResult = { id: 'qrow1', attempts: 1 }
  stepBehavior = 'ok'
}

mock.module('../../../../api/_shared/supabase-admin', () => ({
  getAdminClient: () => ({
    rpc: mock(async (name: string) => {
      if (name === 'claim_pending_deletion_users') {
        return { data: pendingUsers, error: null }
      }
      if (name === 'claim_deletion_queue_row') {
        return { data: claimRowResult, error: null }
      }
      return { data: null, error: null }
    }),
    from: () => ({
      update: () => ({ match: () => Promise.resolve({ error: null }) }),
    }),
  }),
}))

mock.module('../../../../api/_shared/sentry', () => ({
  captureServerException: mock(() => {}),
}))

mock.module('../../../../api/cron/steps/stripe', () => ({
  runStep: async () => (stepBehavior === 'ok' ? { ok: true } : { ok: false, retriable: stepBehavior === 'retriable', error: 'test' }),
}))
mock.module('../../../../api/cron/steps/shopify', () => ({ runStep: async () => ({ ok: true }) }))
mock.module('../../../../api/cron/steps/anthropic', () => ({ runStep: async () => ({ ok: true }) }))
mock.module('../../../../api/cron/steps/storage', () => ({ runStep: async () => ({ ok: true }) }))
mock.module('../../../../api/cron/steps/db', () => ({ runStep: async () => ({ ok: true }) }))

const handler = (await import('../../../../api/cron/delete-account')).default

describe('POST /api/cron/delete-account', () => {
  beforeEach(() => {
    resetTestState()
    process.env['CRON_SECRET'] = 'test-secret'
  })

  test('returns 401 without CRON_SECRET header', async () => {
    const req = new Request('http://x/api/cron/delete-account', { method: 'POST' })
    const res = await handler(req)
    expect(res.status).toBe(401)
  })

  test('returns 200 + empty counts when no pending users', async () => {
    pendingUsers = []
    const req = new Request('http://x/api/cron/delete-account', {
      method: 'POST',
      headers: { Authorization: 'Bearer test-secret' },
    })
    const res = await handler(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.processed).toBe(0)
    expect(body.succeeded).toBe(0)
  })

  test('processes one user through all 5 steps on happy path', async () => {
    pendingUsers = [{ user_id: 'u1' }]
    const req = new Request('http://x/api/cron/delete-account', {
      method: 'POST',
      headers: { Authorization: 'Bearer test-secret' },
    })
    const res = await handler(req)
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
    expect(res.status).toBe(200) // No crash — continue
    const body = await res.json()
    expect(body.processed).toBe(1)
    expect(body.succeeded).toBe(1) // No steps to fail — counts as success
  })

  test('handles claim RPC returning single row (Array.isArray fallback)', async () => {
    pendingUsers = [{ user_id: 'u1' }]
    claimRowResult = { id: 'qrow1', attempts: 2 }
    const req = new Request('http://x/api/cron/delete-account', {
      method: 'POST',
      headers: { Authorization: 'Bearer test-secret' },
    })
    const res = await handler(req)
    expect(res.status).toBe(200)
  })

  test('marks terminal failure when step retriable + attempts at cap', async () => {
    pendingUsers = [{ user_id: 'u1' }]
    claimRowResult = { id: 'qrow1', attempts: 5 } // at cap
    stepBehavior = 'retriable'
    const req = new Request('http://x/api/cron/delete-account', {
      method: 'POST',
      headers: { Authorization: 'Bearer test-secret' },
    })
    const res = await handler(req)
    const body = await res.json()
    expect(body.terminal).toBe(1)
  })

  test('marks terminal on non-retriable error (validation 4xx)', async () => {
    pendingUsers = [{ user_id: 'u1' }]
    claimRowResult = { id: 'qrow1', attempts: 1 }
    stepBehavior = 'terminal'
    const req = new Request('http://x/api/cron/delete-account', {
      method: 'POST',
      headers: { Authorization: 'Bearer test-secret' },
    })
    const res = await handler(req)
    const body = await res.json()
    expect(body.terminal).toBe(1)
  })
})

// Restore original env for downstream tests
if (ORIG_CRON !== undefined) process.env['CRON_SECRET'] = ORIG_CRON
