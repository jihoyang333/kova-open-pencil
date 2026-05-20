// Integration test for api/_shared/idempotency.ts (Plan 11 Task 1.3 + C-HIGH11).
// Hits the real local supabase stack so the helper's DB shape, RLS bypass,
// and CHECK-constraint interactions are exercised end-to-end.

import { describe, it, expect, beforeAll, afterEach } from 'bun:test'
import { applyMigrations, supabaseAdmin } from '../helpers/supabase-local'

// Point the helper at the same local supabase the harness uses. We override
// the env BEFORE importing the module so its lazy proxy resolves to the
// local stack instead of the cloud project from .env.local.
process.env['VITE_SUPABASE_URL'] = process.env['SUPABASE_LOCAL_URL']!
process.env['SUPABASE_SERVICE_ROLE_KEY'] = process.env['SUPABASE_LOCAL_SERVICE_KEY']!

const { verifyIdempotency, HttpError } = await import('@/../api/_shared/idempotency')

const ENDPOINT = 'POST /api/test'

function makeReq(body: object | string, key?: string): Request {
  return new Request('https://test.kova/api/test', {
    method: 'POST',
    headers: key ? { 'X-Idempotency-Key': key } : {},
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

describe('verifyIdempotency (integration)', () => {
  let testUserId: string

  beforeAll(async () => {
    await applyMigrations()
    const { data } = await supabaseAdmin.auth.admin.createUser({
      email: 'idemp-verify@kova-test.local',
      password: 'idemp-verify-fixture-pw',
      email_confirm: true,
    })
    testUserId = data.user!.id
  }, 120_000)

  afterEach(async () => {
    // Each test uses unique keys, but wipe between tests to keep state tight.
    await supabaseAdmin
      .from('idempotency_keys')
      .delete()
      .eq('user_id', testUserId)
  })

  it('no key → returns cached:false with no-op persist', async () => {
    const out = await verifyIdempotency(makeReq({ x: 1 }), testUserId, ENDPOINT)
    expect(out.cached).toBe(false)
    if (!out.cached) {
      // no-op persist should not throw + should not write a row
      await out.persist(200, { ok: true })
      const { data: rows } = await supabaseAdmin
        .from('idempotency_keys')
        .select('*')
        .eq('user_id', testUserId)
      expect(rows ?? []).toEqual([])
    }
  })

  it('valid key, first call → persist writes the row', async () => {
    const key = 'a'.repeat(20)
    const out = await verifyIdempotency(makeReq({ x: 1 }, key), testUserId, ENDPOINT)
    expect(out.cached).toBe(false)
    if (!out.cached) {
      await out.persist(200, { ok: true })
    }
    const { data } = await supabaseAdmin
      .from('idempotency_keys')
      .select('*')
      .eq('key', key)
      .single()
    expect(data).toMatchObject({
      response_status: 200,
      response_body: { ok: true },
      endpoint: ENDPOINT,
    })
  })

  it('valid key, replay with same body → returns cached', async () => {
    const key = 'b'.repeat(20)
    const first = await verifyIdempotency(makeReq({ x: 1 }, key), testUserId, ENDPOINT)
    if (!first.cached) await first.persist(200, { ok: true })

    const replay = await verifyIdempotency(makeReq({ x: 1 }, key), testUserId, ENDPOINT)
    expect(replay.cached).toBe(true)
    if (replay.cached) {
      expect(replay.status).toBe(200)
      expect(replay.body).toEqual({ ok: true })
    }
  })

  it('valid key, replay with different body → throws 422', async () => {
    const key = 'c'.repeat(20)
    const first = await verifyIdempotency(makeReq({ x: 1 }, key), testUserId, ENDPOINT)
    if (!first.cached) await first.persist(200, { ok: true })

    const promise = verifyIdempotency(makeReq({ x: 2 }, key), testUserId, ENDPOINT)
    await expect(promise).rejects.toMatchObject({
      status: 422,
      payload: { error: 'idempotency_key_reused_with_different_body' },
    })
  })

  it('malformed key (8 chars) → throws 400', async () => {
    const promise = verifyIdempotency(makeReq({}, 'short8ch'), testUserId, ENDPOINT)
    await expect(promise).rejects.toBeInstanceOf(HttpError)
    await expect(promise).rejects.toMatchObject({ status: 400 })
  })

  it('malformed key (invalid char !) → throws 400', async () => {
    const promise = verifyIdempotency(
      makeReq({}, 'a'.repeat(15) + '!'),
      testUserId,
      ENDPOINT,
    )
    await expect(promise).rejects.toMatchObject({ status: 400 })
  })

  it('order-sensitive hash — same logical body, different key order, throws 422', async () => {
    const key = 'd'.repeat(20)
    const first = await verifyIdempotency(
      makeReq({ x: 1, y: 2 }, key),
      testUserId,
      ENDPOINT,
    )
    if (!first.cached) await first.persist(200, { ok: true })

    // Reordered JSON — different byte sequence, different hash.
    const reorderedReq = makeReq('{"y":2,"x":1}', key)
    await expect(
      verifyIdempotency(reorderedReq, testUserId, ENDPOINT),
    ).rejects.toMatchObject({ status: 422 })
  })
})
