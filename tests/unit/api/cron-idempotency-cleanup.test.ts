import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'

import handler from '../../../api/cron/idempotency-cleanup'

// W6 Cluster 11 Phase 5c — idempotency-cleanup cron unit tests.
//
// Covers the auth gate + stub guard. Real DB delete path is integration-
// tested with a live Supabase (see future Cluster 11 wave). Here we mock
// @supabase/supabase-js so the handler exercises its routing logic only.

mock.module('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({
      delete: () => ({
        async lt() {
          return { error: null, count: 2 }
        },
      }),
    }),
  }),
}))

const CRON_VAR = 'CRON_SECRET'
const URL_VAR = 'SUPABASE_URL'
const KEY_VAR = 'SUPABASE_SERVICE_ROLE_KEY'

interface SnapshotEnv {
  cron: string | undefined
  url: string | undefined
  key: string | undefined
}

function snapshot(): SnapshotEnv {
  return {
    cron: process.env[CRON_VAR],
    url: process.env[URL_VAR],
    key: process.env[KEY_VAR],
  }
}

function restore(s: SnapshotEnv): void {
  if (s.cron === undefined) delete process.env[CRON_VAR]
  else process.env[CRON_VAR] = s.cron
  if (s.url === undefined) delete process.env[URL_VAR]
  else process.env[URL_VAR] = s.url
  if (s.key === undefined) delete process.env[KEY_VAR]
  else process.env[KEY_VAR] = s.key
}

describe('cron idempotency-cleanup (Plan 11 Task 1.8)', () => {
  let snap: SnapshotEnv
  let warnSpy: ReturnType<typeof mock>
  let originalWarn: typeof console.warn

  beforeEach(() => {
    snap = snapshot()
    delete process.env[CRON_VAR]
    process.env[URL_VAR] = 'https://test.supabase.co'
    process.env[KEY_VAR] = 'service-role-key'
    warnSpy = mock(() => undefined)
    originalWarn = console.warn
    console.warn = warnSpy as unknown as typeof console.warn
  })
  afterEach(() => {
    restore(snap)
    console.warn = originalWarn
  })

  test('returns 503 stub response when CRON_SECRET unset', async () => {
    const res = await handler(new Request('https://test.kova/api/cron/x'))
    expect(res.status).toBe(503)
    const body = (await res.json()) as { stub: boolean; ok: boolean }
    expect(body.stub).toBe(true)
    expect(body.ok).toBe(false)
    expect(warnSpy).toHaveBeenCalled()
  })

  test('returns 401 with no Authorization header', async () => {
    process.env[CRON_VAR] = 'sec'
    const res = await handler(new Request('https://test.kova/api/cron/x'))
    expect(res.status).toBe(401)
    const body = (await res.json()) as { error: string }
    expect(body.error).toBe('Unauthorized')
  })

  test('returns 401 with wrong Authorization', async () => {
    process.env[CRON_VAR] = 'sec'
    const res = await handler(
      new Request('https://test.kova/api/cron/x', {
        headers: { authorization: 'Bearer wrong' },
      })
    )
    expect(res.status).toBe(401)
  })

  test('returns 200 + deleted count with valid Authorization', async () => {
    process.env[CRON_VAR] = 'sec'
    const res = await handler(
      new Request('https://test.kova/api/cron/x', {
        headers: { authorization: 'Bearer sec' },
      })
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { ok: boolean; deleted: number }
    expect(body.ok).toBe(true)
    expect(body.deleted).toBe(2)
  })

  test('throws when SUPABASE_URL missing AND CRON_SECRET valid', async () => {
    process.env[CRON_VAR] = 'sec'
    delete process.env[URL_VAR]
    let caught: unknown = null
    try {
      await handler(
        new Request('https://test.kova/api/cron/x', {
          headers: { authorization: 'Bearer sec' },
        })
      )
    } catch (err) {
      caught = err
    }
    expect(caught).toBeInstanceOf(Error)
    expect(String((caught as Error).message)).toContain('SUPABASE_URL')
  })
})
