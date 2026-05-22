import { describe, test, expect, beforeEach, mock } from 'bun:test'

// Plan 01 Task 11 — useOtp composable.

const verifyOtp = mock(async () => ({ data: { session: { access_token: 't' } }, error: null }))
mock.module('@/lib/supabase', () => ({ supabase: { auth: { verifyOtp } } }))

const { useOtp } = await import('../../../../src/composables/auth/use-otp')

describe('useOtp', () => {
  beforeEach(() => {
    verifyOtp.mockClear()
  })

  test('returns wrong_code if digits incomplete', async () => {
    const o = useOtp('a@b.co')
    o.digits.value = ['1', '2', '3', '', '', '']
    const r = await o.submit()
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe('wrong_code')
  })

  test('returns ok on valid 6-digit code', async () => {
    verifyOtp.mockImplementationOnce(async () => ({ data: { session: { access_token: 't' } }, error: null }))
    const o = useOtp('a@b.co')
    o.digits.value = ['1', '2', '3', '4', '5', '6']
    const r = await o.submit()
    expect(r.ok).toBe(true)
  })

  test('returns wrong_code on Supabase error + decrements attemptsLeft', async () => {
    verifyOtp.mockImplementationOnce(async () => ({
      data: null,
      error: { message: 'Token is invalid', status: 400 },
    }))
    const o = useOtp('a@b.co')
    expect(o.attemptsLeft.value).toBe(5)
    o.digits.value = ['9', '9', '9', '9', '9', '9']
    const r = await o.submit()
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe('wrong_code')
    expect(o.attemptsLeft.value).toBe(4)
  })

  test('returns expired when error message contains expired', async () => {
    verifyOtp.mockImplementationOnce(async () => ({
      data: null,
      error: { message: 'Token is invalid or expired', status: 400 },
    }))
    const o = useOtp('a@b.co')
    o.digits.value = ['9', '9', '9', '9', '9', '9']
    const r = await o.submit()
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe('expired')
  })

  test('lockout at 5 attempts', async () => {
    verifyOtp.mockImplementation(async () => ({
      data: null,
      error: { message: 'wrong', status: 400 },
    }))
    const o = useOtp('a@b.co')
    for (let i = 0; i < 5; i++) {
      o.digits.value = ['9', '9', '9', '9', '9', '9']
      await o.submit()
    }
    expect(o.locked.value).toBe(true)
    const r = await o.submit()
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe('locked_out')
  })

  test('reset clears digits + attempts', () => {
    const o = useOtp('a@b.co')
    o.digits.value = ['1', '2', '3', '', '', '']
    o.reset()
    expect(o.digits.value.every((d) => d === '')).toBe(true)
    expect(o.attemptsLeft.value).toBe(5)
  })
})
