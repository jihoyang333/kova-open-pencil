// Unit test for api/cron/idempotency-cleanup.ts (Plan 11 Task 1.8).
// Mocks the shared supabase singleton so we exercise stub-guard, auth, and
// happy-path branches without touching the DB.

import { describe, it, expect, beforeEach, afterAll, mock } from 'bun:test'

let recordedCutoff: string | null = null
let forcedError: { message: string } | null = null
let returnedCount = 2

const mockSupabase = {
  from() {
    return {
      delete(_opts: { count: 'exact' }) {
        void _opts
        return {
          async lt(_col: string, val: string) {
            recordedCutoff = val
            if (forcedError) return { error: forcedError, count: null }
            return { error: null, count: returnedCount }
          },
        }
      },
    }
  },
}

mock.module('../../../../api/_shared/supabase', () => ({
  supabaseAdmin: mockSupabase,
  getSupabaseAdmin: () => mockSupabase,
}))

const { default: handler } = await import('../../../../api/cron/idempotency-cleanup')

const warnMock = mock(() => undefined)
const origWarn = console.warn

function makeReq(authHeader?: string): Request {
  return new Request('https://test.kova/api/cron/idempotency-cleanup', {
    method: 'GET',
    headers: authHeader ? { authorization: authHeader } : {},
  })
}

describe('cron idempotency-cleanup', () => {
  beforeEach(() => {
    warnMock.mockClear()
    console.warn = warnMock
    recordedCutoff = null
    forcedError = null
    returnedCount = 2
  })

  it('returns 503 stub response when CRON_SECRET unset', async () => {
    delete process.env['CRON_SECRET']
    const res = await handler(makeReq())
    expect(res.status).toBe(503)
    const body = (await res.json()) as { stub: boolean }
    expect(body.stub).toBe(true)
    expect(warnMock).toHaveBeenCalled()
  })

  it('returns 401 with invalid auth header', async () => {
    process.env['CRON_SECRET'] = 'sec'
    const res = await handler(makeReq())
    expect(res.status).toBe(401)
  })

  it('returns 200 + count with valid CRON_SECRET', async () => {
    process.env['CRON_SECRET'] = 'sec'
    const res = await handler(makeReq('Bearer sec'))
    expect(res.status).toBe(200)
    const body = (await res.json()) as { deleted: number }
    expect(body.deleted).toBe(2)
  })

  it('uses 24h retention cutoff', async () => {
    process.env['CRON_SECRET'] = 'sec'
    const before = Date.now()
    await handler(makeReq('Bearer sec'))
    const after = Date.now()
    expect(recordedCutoff).not.toBeNull()
    const cutoffMs = Date.parse(recordedCutoff!)
    const expectedMin = before - 24 * 60 * 60 * 1000 - 1
    const expectedMax = after - 24 * 60 * 60 * 1000 + 1
    expect(cutoffMs).toBeGreaterThanOrEqual(expectedMin)
    expect(cutoffMs).toBeLessThanOrEqual(expectedMax)
  })

  it('returns 500 when DB delete errors', async () => {
    process.env['CRON_SECRET'] = 'sec'
    forcedError = { message: 'boom' }
    const res = await handler(makeReq('Bearer sec'))
    expect(res.status).toBe(500)
  })
})

afterAll(() => {
  console.warn = origWarn
})
