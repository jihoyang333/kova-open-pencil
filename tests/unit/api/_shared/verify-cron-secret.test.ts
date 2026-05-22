import { describe, test, expect, beforeEach, afterEach } from 'bun:test'

import { verifyCronSecret } from '../../../../api/_shared/verify-cron-secret'

describe('verifyCronSecret (Plan 01 Task 2.3)', () => {
  const ORIGINAL = process.env['CRON_SECRET']

  beforeEach(() => {
    process.env['CRON_SECRET'] = 'test-secret-abc123'
  })

  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env['CRON_SECRET']
    else process.env['CRON_SECRET'] = ORIGINAL
  })

  test('returns true when header matches', () => {
    const req = new Request('http://x/api/cron/test', {
      headers: { Authorization: 'Bearer test-secret-abc123' },
    })
    expect(verifyCronSecret(req)).toBe(true)
  })

  test('returns false when header missing', () => {
    const req = new Request('http://x/api/cron/test')
    expect(verifyCronSecret(req)).toBe(false)
  })

  test('returns false when header malformed (no Bearer prefix)', () => {
    const req = new Request('http://x/api/cron/test', {
      headers: { Authorization: 'test-secret-abc123' },
    })
    expect(verifyCronSecret(req)).toBe(false)
  })

  test('returns false when secret mismatches', () => {
    const req = new Request('http://x/api/cron/test', {
      headers: { Authorization: 'Bearer wrong-secret' },
    })
    expect(verifyCronSecret(req)).toBe(false)
  })

  test('returns false when secret has different length (constant-time compare gate)', () => {
    const req = new Request('http://x/api/cron/test', {
      headers: { Authorization: 'Bearer short' },
    })
    expect(verifyCronSecret(req)).toBe(false)
  })

  test('throws if CRON_SECRET env var unset', () => {
    delete process.env['CRON_SECRET']
    const req = new Request('http://x/api/cron/test', {
      headers: { Authorization: 'Bearer anything' },
    })
    expect(() => verifyCronSecret(req)).toThrow(/CRON_SECRET/)
  })

  test('case-insensitive header lookup', () => {
    const req = new Request('http://x/api/cron/test', {
      headers: { authorization: 'Bearer test-secret-abc123' },
    })
    expect(verifyCronSecret(req)).toBe(true)
  })
})
