import { createHash } from 'node:crypto'

import { beforeEach, describe, expect, test } from 'bun:test'

import {
  IdempotencyHttpError,
  verifyIdempotency,
} from '../../../api/_shared/idempotency'

// W6 Cluster 11 Phase 5c — verifyIdempotency() unit tests (Plan 11 Task 1.3).
//
// Mocks SupabaseClient at the param boundary (no real DB calls). Covers:
//   - no key            → cached:false, persist no-ops
//   - first call        → cached:false, persist writes row
//   - replay same body  → cached:true with status + body
//   - replay diff body  → throws 422
//   - malformed key     → throws 400 (length + alphabet)
//   - C-HIGH11 contract → key-order-sensitive hash; reordered JSON throws 422

interface SeedRow {
  request_hash: string
  response_status: number
  response_body: unknown
}

interface MockState {
  rows: Map<string, SeedRow>
  inserts: Array<Record<string, unknown>>
}

function computeHashFor(
  method: string,
  path: string,
  bodyText: string
): string {
  return createHash('sha256').update(`${method}|${path}|${bodyText}`).digest('hex')
}

function createMockSupabase(state: MockState) {
  return {
    from(_table: string) {
      return {
        select(_cols: string) {
          return {
            eq(_col: string, key: string) {
              return {
                async maybeSingle() {
                  const row = state.rows.get(key)
                  return { data: row ?? null, error: null }
                },
              }
            },
          }
        },
        async insert(row: Record<string, unknown>) {
          state.inserts.push(row)
          state.rows.set(row['key'] as string, {
            request_hash: row['request_hash'] as string,
            response_status: row['response_status'] as number,
            response_body: row['response_body'],
          })
          return { error: null, data: null }
        },
      }
    },
  }
}

function makeReq(bodyText: string, key?: string): Request {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (key !== undefined) {
    headers['X-Idempotency-Key'] = key
  }
  return new Request('https://test.kova/api/x', {
    method: 'POST',
    headers,
    body: bodyText,
  })
}

const VALID_KEY = 'a'.repeat(20)

describe('verifyIdempotency (Plan 11 Task 1.3 / C-HIGH11)', () => {
  let state: MockState

  beforeEach(() => {
    state = { rows: new Map(), inserts: [] }
  })

  test('no key → cached:false, persist is a no-op', async () => {
    const client = createMockSupabase(state)
    const req = makeReq(JSON.stringify({ x: 1 }))
    const out = await verifyIdempotency(client as never, req, 'u', 'POST /api/x')
    expect(out.cached).toBe(false)
    if (!out.cached) {
      await out.persist(200, { ok: true })
    }
    expect(state.inserts).toHaveLength(0)
  })

  test('valid key, first call → cached:false, persist writes row', async () => {
    const client = createMockSupabase(state)
    const req = makeReq(JSON.stringify({ x: 1 }), VALID_KEY)
    const out = await verifyIdempotency(client as never, req, 'u', 'POST /api/x')
    expect(out.cached).toBe(false)
    if (!out.cached) {
      await out.persist(200, { ok: true })
    }
    expect(state.inserts).toHaveLength(1)
    expect(state.inserts[0]).toMatchObject({
      key: VALID_KEY,
      user_id: 'u',
      endpoint: 'POST /api/x',
      response_status: 200,
      response_body: { ok: true },
    })
  })

  test('replay with same body → cached:true with status + body', async () => {
    const bodyText = JSON.stringify({ x: 1 })
    state.rows.set(VALID_KEY, {
      request_hash: computeHashFor('POST', '/api/x', bodyText),
      response_status: 200,
      response_body: { ok: true },
    })

    const client = createMockSupabase(state)
    const out = await verifyIdempotency(
      client as never,
      makeReq(bodyText, VALID_KEY),
      'u',
      'POST /api/x'
    )
    expect(out.cached).toBe(true)
    if (out.cached) {
      expect(out.status).toBe(200)
      expect(out.body).toEqual({ ok: true })
    }
  })

  test('replay with different body → throws 422', async () => {
    state.rows.set(VALID_KEY, {
      request_hash: computeHashFor('POST', '/api/x', JSON.stringify({ x: 1 })),
      response_status: 200,
      response_body: { ok: true },
    })

    const client = createMockSupabase(state)
    const req = makeReq(JSON.stringify({ x: 2 }), VALID_KEY)
    let caught: unknown = null
    try {
      await verifyIdempotency(client as never, req, 'u', 'POST /api/x')
    } catch (err) {
      caught = err
    }
    expect(caught).toBeInstanceOf(IdempotencyHttpError)
    expect((caught as IdempotencyHttpError).status).toBe(422)
    expect((caught as IdempotencyHttpError).payload.error).toBe(
      'idempotency_key_reused_with_different_body'
    )
  })

  test('malformed key (too short) → throws 400', async () => {
    const client = createMockSupabase(state)
    const req = makeReq(JSON.stringify({}), 'short')
    let caught: unknown = null
    try {
      await verifyIdempotency(client as never, req, 'u', 'POST /api/x')
    } catch (err) {
      caught = err
    }
    expect(caught).toBeInstanceOf(IdempotencyHttpError)
    expect((caught as IdempotencyHttpError).status).toBe(400)
    expect((caught as IdempotencyHttpError).payload.error).toBe('invalid_idempotency_key')
  })

  test('malformed key (invalid char) → throws 400', async () => {
    const client = createMockSupabase(state)
    const req = makeReq(JSON.stringify({}), 'a'.repeat(15) + '!')
    let caught: unknown = null
    try {
      await verifyIdempotency(client as never, req, 'u', 'POST /api/x')
    } catch (err) {
      caught = err
    }
    expect(caught).toBeInstanceOf(IdempotencyHttpError)
    expect((caught as IdempotencyHttpError).status).toBe(400)
  })

  test('C-HIGH11 — reordered JSON keys yield different hash → throws 422', async () => {
    // Cached request body: `{"x":1,"y":2}`.
    state.rows.set(VALID_KEY, {
      request_hash: computeHashFor('POST', '/api/x', '{"x":1,"y":2}'),
      response_status: 200,
      response_body: { ok: true },
    })
    // Replay with reordered JSON — same logical body, different bytes.
    const reordered = '{"y":2,"x":1}'
    const client = createMockSupabase(state)
    let caught: unknown = null
    try {
      await verifyIdempotency(
        client as never,
        makeReq(reordered, VALID_KEY),
        'u',
        'POST /api/x'
      )
    } catch (err) {
      caught = err
    }
    expect(caught).toBeInstanceOf(IdempotencyHttpError)
    expect((caught as IdempotencyHttpError).status).toBe(422)
  })

  test('key at lower bound (16 chars) → accepted', async () => {
    const client = createMockSupabase(state)
    const k = 'a'.repeat(16)
    const out = await verifyIdempotency(
      client as never,
      makeReq(JSON.stringify({}), k),
      'u',
      'POST /api/x'
    )
    expect(out.cached).toBe(false)
  })

  test('key at upper bound (64 chars) → accepted', async () => {
    const client = createMockSupabase(state)
    const k = 'a'.repeat(64)
    const out = await verifyIdempotency(
      client as never,
      makeReq(JSON.stringify({}), k),
      'u',
      'POST /api/x'
    )
    expect(out.cached).toBe(false)
  })

  test('key one over upper bound (65 chars) → throws 400', async () => {
    const client = createMockSupabase(state)
    const k = 'a'.repeat(65)
    let caught: unknown = null
    try {
      await verifyIdempotency(
        client as never,
        makeReq(JSON.stringify({}), k),
        'u',
        'POST /api/x'
      )
    } catch (err) {
      caught = err
    }
    expect(caught).toBeInstanceOf(IdempotencyHttpError)
    expect((caught as IdempotencyHttpError).status).toBe(400)
  })
})
