// PRD 12 §9.1 — send-sync-alert handler unit tests.
//
// Covers the auth gate, payload validation, preference opt-out, missing
// email, env-guard pass-through, and the happy path. Mocks supabase-js +
// the Resend wrapper to keep the test bun:test-only (no network).

import { afterAll, beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test'

const USER_ID = '11111111-2222-3333-4444-555555555555'

const authState = { mode: 'owner' as 'owner' | 'unauthorized' }

mock.module('../../api/_shared/auth', () => ({
  authenticateRequest: async () => {
    if (authState.mode === 'owner') return { userId: USER_ID }
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })
  },
}))

interface SendArgs {
  to: string | string[]
  subject: string
  html: string
  unsubscribeUrl: string
}

const emailState = {
  sendCalls: [] as SendArgs[],
  result: { ok: true, id: 'em_test_1' } as
    | { ok: true; id?: string; skipped?: boolean }
    | { ok: false; error: string },
}

mock.module('../../api/_shared/email', () => ({
  sendEmail: async (input: SendArgs) => {
    emailState.sendCalls.push(input)
    return emailState.result
  },
  renderEmailShell: (input: { title: string; bodyHtml: string }) => `<html>${input.title}|${input.bodyHtml}</html>`,
}))

interface FakeUser { id: string; email: string | null; preferences: Record<string, unknown> | null }

const dbState = {
  user: { id: USER_ID, email: 'jiho@example.com', preferences: {} } as FakeUser | null,
  userError: null as null | { code: string; message: string },
}

mock.module('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => {
            if (dbState.userError !== null) return { data: null, error: dbState.userError }
            if (dbState.user === null) return { data: null, error: null }
            return { data: { preferences: dbState.user.preferences }, error: null }
          },
        }),
      }),
    }),
    auth: {
      admin: {
        getUserById: async (id: string) => {
          if (dbState.user === null || dbState.user.id !== id) {
            return { data: { user: null }, error: null }
          }
          return { data: { user: { id, email: dbState.user.email } }, error: null }
        },
      },
    },
  }),
}))

let handler: (req: Request) => Promise<Response>

beforeAll(async () => {
  process.env.VITE_SUPABASE_URL = 'https://test.local'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'srv'
  process.env.VITE_APP_URL = 'https://kova.test'
  ;({ default: handler } = await import('../../api/send-sync-alert'))
})

afterAll(() => mock.restore())

beforeEach(() => {
  authState.mode = 'owner'
  emailState.sendCalls = []
  emailState.result = { ok: true, id: 'em_test_1' }
  dbState.user = { id: USER_ID, email: 'jiho@example.com', preferences: {} }
  dbState.userError = null
})

function req(body: unknown, opts: { method?: string } = {}): Request {
  return new Request('http://l/api/send-sync-alert', {
    method: opts.method ?? 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

const VALID_PAYLOAD = { canvasId: 'cv_test_42', lastSyncAt: '2026-06-06T12:00:00.000Z' }

describe('POST /api/send-sync-alert', () => {
  it('rejects non-POST with 405', async () => {
    const res = await handler(req(VALID_PAYLOAD, { method: 'GET' }))
    expect(res.status).toBe(405)
  })

  it('returns 401 without authentication', async () => {
    authState.mode = 'unauthorized'
    const res = await handler(req(VALID_PAYLOAD))
    expect(res.status).toBe(401)
  })

  it('returns 400 on invalid payload (missing canvasId)', async () => {
    const res = await handler(req({ lastSyncAt: '2026-06-06T12:00:00Z' }))
    expect(res.status).toBe(400)
    const body = await res.json() as { error: string }
    expect(body.error).toBe('invalid_payload')
  })

  it('returns 400 on invalid JSON', async () => {
    const bad = new Request('http://l/api/send-sync-alert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test' },
      body: 'not json',
    })
    const res = await handler(bad)
    expect(res.status).toBe(400)
  })

  it('skips when user has opted out of sync alerts', async () => {
    dbState.user = { id: USER_ID, email: 'jiho@example.com', preferences: { notifications: { syncAlerts: false } } }
    const res = await handler(req(VALID_PAYLOAD))
    expect(res.status).toBe(200)
    const body = await res.json() as { ok: boolean; skipped?: string }
    expect(body).toEqual({ ok: true, skipped: 'opted_out' })
    expect(emailState.sendCalls).toHaveLength(0)
  })

  it('sends email on happy path with default opt-in (syncAlerts undefined)', async () => {
    const res = await handler(req(VALID_PAYLOAD))
    expect(res.status).toBe(200)
    const body = await res.json() as { ok: boolean; sent: boolean }
    expect(body).toEqual({ ok: true, sent: true })
    expect(emailState.sendCalls).toHaveLength(1)
    expect(emailState.sendCalls[0].to).toBe('jiho@example.com')
    expect(emailState.sendCalls[0].subject).toContain('saved')
    expect(emailState.sendCalls[0].unsubscribeUrl).toContain(USER_ID)
  })

  it('sends email when syncAlerts is explicitly true', async () => {
    dbState.user = { id: USER_ID, email: 'jiho@example.com', preferences: { notifications: { syncAlerts: true } } }
    const res = await handler(req(VALID_PAYLOAD))
    expect(res.status).toBe(200)
    expect(emailState.sendCalls).toHaveLength(1)
  })

  it('returns 404 when user row not found', async () => {
    dbState.user = null
    const res = await handler(req(VALID_PAYLOAD))
    expect(res.status).toBe(404)
    const body = await res.json() as { error: string }
    expect(body.error).toBe('user_not_found')
  })

  it('returns 500 on DB error', async () => {
    dbState.userError = { code: '42501', message: 'permission denied' }
    const res = await handler(req(VALID_PAYLOAD))
    expect(res.status).toBe(500)
    const body = await res.json() as { error: string }
    expect(body.error).toBe('user_lookup_failed')
  })

  it('skips with no_user_email when auth.users.email is missing', async () => {
    dbState.user = { id: USER_ID, email: null, preferences: {} }
    const res = await handler(req(VALID_PAYLOAD))
    expect(res.status).toBe(200)
    const body = await res.json() as { ok: boolean; skipped: string }
    expect(body).toEqual({ ok: true, skipped: 'no_user_email' })
    expect(emailState.sendCalls).toHaveLength(0)
  })

  it('returns ok:true skipped:no_api_key when Resend is env-guard-skipped', async () => {
    emailState.result = { ok: true, skipped: true }
    const res = await handler(req(VALID_PAYLOAD))
    expect(res.status).toBe(200)
    const body = await res.json() as { ok: boolean; skipped: string }
    expect(body).toEqual({ ok: true, skipped: 'no_api_key' })
  })

  it('returns 502 when Resend send fails', async () => {
    emailState.result = { ok: false, error: 'resend_500' }
    const res = await handler(req(VALID_PAYLOAD))
    expect(res.status).toBe(502)
    const body = await res.json() as { error: string }
    expect(body.error).toBe('send_failed')
  })
})
