import { beforeEach, describe, expect, it, mock } from 'bun:test'

// Cluster 05 PRD §5.1.7 — unit tests for POST /api/brands/:id/voice-draft/discard.

const OWNER_USER_ID = '11111111-1111-1111-1111-111111111111'
const BRAND_ID = '33333333-3333-3333-3333-333333333333'
const DRAFT_ID = '66666666-6666-6666-6666-666666666666'

const state = {
  authMode: 'ok' as 'ok' | 'throw',
  brandOwned: true,
  rpcError: null as { code?: string; message?: string } | null,
}

const rpcCalls: Array<{ fn: string }> = []
const auditCalls: Array<{ eventType: string }> = []

const userSupabase = {
  rpc: async (fn: string) => {
    rpcCalls.push({ fn })
    return { data: null, error: state.rpcError }
  },
}

mock.module('../../../../../api/_shared/verify-auth-full', () => ({
  verifyAuthFull: async () => {
    if (state.authMode === 'throw') {
      const { UnauthenticatedError } = await import('../../../../../api/_shared/verify-auth-full')
      throw new UnauthenticatedError('test')
    }
    return { supabase: userSupabase, userId: OWNER_USER_ID, email: 'a@b.co' }
  },
  UnauthenticatedError: class extends Error {
    constructor(reason: string) { super(reason); this.name = 'UnauthenticatedError' }
  },
}))

const adminClient = {
  from: (table: string) => {
    if (table === 'brands') {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({ maybeSingle: async () => ({ data: state.brandOwned ? { id: BRAND_ID } : null, error: null }) }),
          }),
        }),
      }
    }
    throw new Error(`unexpected table: ${table}`)
  },
}

mock.module('../../../../../api/_shared/supabase-admin', () => ({ getAdminClient: () => adminClient }))

mock.module('../../../../../api/_shared/audit', () => ({
  writeAudit: async (_admin: unknown, e: { eventType: string }) => { auditCalls.push({ eventType: e.eventType }) },
}))

const handler = (await import('../../../../../api/brands/[id]/voice-draft/discard')).default

function post(body: unknown): Request {
  return new Request(`http://x/api/brands/${BRAND_ID}/voice-draft/discard`, {
    method: 'POST',
    headers: { Authorization: 'Bearer t', 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

beforeEach(() => {
  state.authMode = 'ok'
  state.brandOwned = true
  state.rpcError = null
  rpcCalls.length = 0
  auditCalls.length = 0
})

describe('POST /api/brands/:id/voice-draft/discard', () => {
  it('200 calls discard RPC + audit, no brands mutation', async () => {
    const res = await handler(post({ draft_id: DRAFT_ID }))
    expect(res.status).toBe(200)
    expect((await res.json()).success).toBe(true)
    expect(rpcCalls[0].fn).toBe('discard_voice_draft')
    expect(auditCalls[0].eventType).toBe('brand_kit.voice_draft_discarded')
  })

  it('405 on non-POST', async () => {
    const res = await handler(new Request(`http://x/api/brands/${BRAND_ID}/voice-draft/discard`, { method: 'GET' }))
    expect(res.status).toBe(405)
  })

  it('401 when unauthenticated', async () => {
    state.authMode = 'throw'
    const res = await handler(post({ draft_id: DRAFT_ID }))
    expect(res.status).toBe(401)
  })

  it('400 on invalid draft_id', async () => {
    const res = await handler(post({ draft_id: 'nope' }))
    expect(res.status).toBe(400)
  })

  it('403 when brand not owned', async () => {
    state.brandOwned = false
    const res = await handler(post({ draft_id: DRAFT_ID }))
    expect(res.status).toBe(403)
  })

  it('404 when RPC reports draft_not_found_or_already_resolved', async () => {
    state.rpcError = { code: 'P0002', message: 'draft_not_found_or_already_resolved' }
    const res = await handler(post({ draft_id: DRAFT_ID }))
    expect(res.status).toBe(404)
    expect(auditCalls.length).toBe(0)
  })

  it('500 on unexpected RPC error', async () => {
    state.rpcError = { code: '53300', message: 'boom' }
    const res = await handler(post({ draft_id: DRAFT_ID }))
    expect(res.status).toBe(500)
  })
})
