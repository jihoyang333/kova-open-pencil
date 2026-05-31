import { beforeEach, describe, expect, it, mock } from 'bun:test'

// Cluster 05 PRD §5.1.6 — unit tests for POST /api/brands/:id/voice-draft/confirm.

const OWNER_USER_ID = '11111111-1111-1111-1111-111111111111'
const BRAND_ID = '33333333-3333-3333-3333-333333333333'
const DRAFT_ID = '66666666-6666-6666-6666-666666666666'
const IDEM_KEY = '0123456789abcdef0123'

const state = {
  authMode: 'ok' as 'ok' | 'throw',
  brandOwned: true,
  rpcError: null as { code?: string; message?: string } | null,
  draftPayload: { voice: { content: 'Bold and warm. We speak plainly.' }, tone_snippets: [{ label: 'a', category: 'CTA', content: 'Shop now' }] } as Record<string, unknown> | null,
  updateError: null as { message: string } | null,
  idemMode: 'fresh' as 'fresh' | 'cached' | 'conflict',
}

const updateCalls: Array<Record<string, unknown>> = []
const rpcCalls: Array<{ fn: string; args: Record<string, unknown> }> = []
const auditCalls: Array<{ eventType: string }> = []

const userSupabase = {
  rpc: async (fn: string, args: Record<string, unknown>) => {
    rpcCalls.push({ fn, args })
    return { data: null, error: state.rpcError }
  },
  from: () => ({
    select: () => ({
      eq: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: { draft_payload: state.draftPayload }, error: null }) }),
      }),
    }),
  }),
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
    if (table === 'voice_drafts') {
      return {
        update: (row: Record<string, unknown>) => {
          updateCalls.push(row)
          return { eq: () => ({ eq: () => ({ is: () => ({ is: async () => ({ error: state.updateError }) }) }) }) }
        },
      }
    }
    throw new Error(`unexpected table: ${table}`)
  },
}

mock.module('../../../../../api/_shared/supabase-admin', () => ({ getAdminClient: () => adminClient }))

mock.module('../../../../../api/_shared/idempotency', () => ({
  verifyIdempotency: async () => {
    if (state.idemMode === 'conflict') {
      const { IdempotencyHttpError } = await import('../../../../../api/_shared/idempotency')
      throw new IdempotencyHttpError(422, { error: 'idempotency_key_reused_with_different_body' })
    }
    if (state.idemMode === 'cached') {
      return { cached: true, status: 200, body: { success: true, voice_word_count: 9, tone_snippet_count: 1 } }
    }
    return { cached: false, persist: async () => {} }
  },
  IdempotencyHttpError: class extends Error {
    constructor(public readonly status: number, public readonly payload: { error: string }) { super(payload.error) }
  },
}))

mock.module('../../../../../api/_shared/audit', () => ({
  writeAudit: async (_admin: unknown, e: { eventType: string }) => { auditCalls.push({ eventType: e.eventType }) },
}))

const handler = (await import('../../../../../api/brands/[id]/voice-draft/confirm')).default

function post(body: unknown, withKey = true): Request {
  const headers: Record<string, string> = { Authorization: 'Bearer t', 'Content-Type': 'application/json' }
  if (withKey) headers['X-Idempotency-Key'] = IDEM_KEY
  return new Request(`http://x/api/brands/${BRAND_ID}/voice-draft/confirm`, {
    method: 'POST',
    headers,
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

beforeEach(() => {
  state.authMode = 'ok'
  state.brandOwned = true
  state.rpcError = null
  state.draftPayload = { voice: { content: 'Bold and warm. We speak plainly.' }, tone_snippets: [{ label: 'a', category: 'CTA', content: 'Shop now' }] }
  state.updateError = null
  state.idemMode = 'fresh'
  updateCalls.length = 0
  rpcCalls.length = 0
  auditCalls.length = 0
})

describe('POST /api/brands/:id/voice-draft/confirm', () => {
  it('200 calls confirm RPC + audit + returns counts', async () => {
    const res = await handler(post({ draft_id: DRAFT_ID }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.voice_word_count).toBe(6)
    expect(body.tone_snippet_count).toBe(1)
    expect(rpcCalls.find((c) => c.fn === 'confirm_voice_draft')).toBeDefined()
    expect(auditCalls[0].eventType).toBe('brand_kit.voice_draft_confirmed')
    // No edited_payload → no draft update.
    expect(updateCalls.length).toBe(0)
  })

  it('updates draft_payload when edited_payload provided', async () => {
    const edited = { voice: { content: 'one two three' }, tone_snippets: [] }
    const res = await handler(post({ draft_id: DRAFT_ID, edited_payload: edited }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.voice_word_count).toBe(3)
    expect(body.tone_snippet_count).toBe(0)
    expect(updateCalls.length).toBe(1)
    expect(updateCalls[0].draft_payload).toEqual(edited)
  })

  it('405 on non-POST', async () => {
    const res = await handler(new Request(`http://x/api/brands/${BRAND_ID}/voice-draft/confirm`, { method: 'GET' }))
    expect(res.status).toBe(405)
  })

  it('401 when unauthenticated', async () => {
    state.authMode = 'throw'
    const res = await handler(post({ draft_id: DRAFT_ID }))
    expect(res.status).toBe(401)
  })

  it('400 on missing/invalid draft_id', async () => {
    const res = await handler(post({ draft_id: 'nope' }))
    expect(res.status).toBe(400)
  })

  it('400 when X-Idempotency-Key missing (required for confirm)', async () => {
    const res = await handler(post({ draft_id: DRAFT_ID }, false))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('idempotency_key_required')
  })

  it('403 when brand not owned', async () => {
    state.brandOwned = false
    const res = await handler(post({ draft_id: DRAFT_ID }))
    expect(res.status).toBe(403)
  })

  it('404 when RPC reports draft_not_found_or_already_resolved (P0002)', async () => {
    state.rpcError = { code: 'P0002', message: 'draft_not_found_or_already_resolved' }
    const res = await handler(post({ draft_id: DRAFT_ID }))
    expect(res.status).toBe(404)
    expect((await res.json()).error).toBe('draft_not_found_or_already_resolved')
    expect(auditCalls.length).toBe(0)
  })

  it('500 on unexpected RPC error', async () => {
    state.rpcError = { code: '53300', message: 'connection refused' }
    const res = await handler(post({ draft_id: DRAFT_ID }))
    expect(res.status).toBe(500)
  })

  it('422 on idempotency-key body conflict', async () => {
    state.idemMode = 'conflict'
    const res = await handler(post({ draft_id: DRAFT_ID }))
    expect(res.status).toBe(422)
  })

  it('replays cached response on idempotency hit', async () => {
    state.idemMode = 'cached'
    const res = await handler(post({ draft_id: DRAFT_ID }))
    expect(res.status).toBe(200)
    expect((await res.json()).voice_word_count).toBe(9)
    expect(rpcCalls.length).toBe(0)
  })
})
