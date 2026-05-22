import { describe, test, expect, beforeEach, mock } from 'bun:test'

// Plan 01 Task 10 — useMagicLink composable.

const signInWithOtp = mock(async () => ({ data: {}, error: null }))
mock.module('@/lib/supabase', () => ({ supabase: { auth: { signInWithOtp } } }))

const { useMagicLink } = await import('../../../../src/composables/auth/use-magic-link')

// Provide window.location.origin for emailRedirectTo composition in tests.
// Mutate the existing happy-dom window in place — replacing `globalThis.window`
// wholesale wipes Event / MouseEvent / Document constructors and pollutes
// every later test file that mounts a Vue component (W8a v2 AUDIT L5).
Object.defineProperty(globalThis.window, 'location', {
  configurable: true,
  value: { origin: 'http://localhost:1420' },
})

describe('useMagicLink', () => {
  beforeEach(() => {
    signInWithOtp.mockClear()
  })

  test('send returns ok on success', async () => {
    signInWithOtp.mockImplementationOnce(async () => ({ data: {}, error: null }))
    const m = useMagicLink()
    const r = await m.send('a@b.co')
    expect(r.ok).toBe(true)
  })

  test('returns rate_limited on 429', async () => {
    signInWithOtp.mockImplementationOnce(async () => ({
      data: null,
      error: { message: 'rate limit exceeded', status: 429 },
    }))
    const m = useMagicLink()
    const r = await m.send('a@b.co')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe('rate_limited')
  })

  test('returns invalid_email when error contains "invalid"', async () => {
    signInWithOtp.mockImplementationOnce(async () => ({
      data: null,
      error: { message: 'invalid email address', status: 400 },
    }))
    const m = useMagicLink()
    const r = await m.send('not-an-email')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe('invalid_email')
  })

  test('returns unknown on unrecognized error', async () => {
    signInWithOtp.mockImplementationOnce(async () => ({
      data: null,
      error: { message: 'something else', status: 500 },
    }))
    const m = useMagicLink()
    const r = await m.send('a@b.co')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe('unknown')
  })

  test('cooldown starts at 0 + becomes positive after send', async () => {
    signInWithOtp.mockImplementationOnce(async () => ({ data: {}, error: null }))
    const m = useMagicLink()
    expect(m.cooldown.value).toBe(0)
    await m.send('a@b.co')
    expect(m.cooldown.value).toBeGreaterThan(0)
  })
})
