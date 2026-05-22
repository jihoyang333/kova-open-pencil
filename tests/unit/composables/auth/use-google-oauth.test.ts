import { beforeEach, describe, expect, mock, test } from 'bun:test'

// W8a Cluster 01 — useGoogleOAuth composable (Plan 01 Task 9 / amendment §3.2).

const signInWithOAuth = mock(async () => ({
  data: { provider: 'google' as const, url: 'https://example.com/oauth' },
  error: null
}))

mock.module('@/lib/supabase', () => ({ supabase: { auth: { signInWithOAuth } } }))

const { useGoogleOAuth } = await import('../../../../src/composables/auth/use-google-oauth')

// Provide window.location.origin for redirectTo composition in tests.
// Mutate the existing happy-dom window in place — replacing `globalThis.window`
// wholesale wipes Event / MouseEvent / Document constructors and pollutes
// every later test file that mounts a Vue component (W8a v2 AUDIT L5).
Object.defineProperty(globalThis.window, 'location', {
  configurable: true,
  value: { origin: 'http://localhost:1420' }
})

describe('useGoogleOAuth', () => {
  beforeEach(() => {
    signInWithOAuth.mockClear()
  })

  test('start calls supabase signInWithOAuth with provider=google + /auth/callback redirect', async () => {
    const { start } = useGoogleOAuth()
    await start()
    expect(signInWithOAuth).toHaveBeenCalledTimes(1)
    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: 'http://localhost:1420/auth/callback',
        queryParams: { access_type: 'offline', prompt: 'consent' }
      }
    })
  })

  test('start returns { ok: true } on success', async () => {
    const { start } = useGoogleOAuth()
    const result = await start()
    expect(result.ok).toBe(true)
  })

  test('start returns { ok: false, reason } when Supabase returns an error', async () => {
    signInWithOAuth.mockImplementationOnce(async () => ({
      data: null,
      error: { message: 'oauth_init_failed', name: 'AuthError' }
    }))
    const { start } = useGoogleOAuth()
    const result = await start()
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('oauth_init_failed')
  })

  test('isStarting is false initially, true during the call, false after', async () => {
    const { start, isStarting } = useGoogleOAuth()
    expect(isStarting.value).toBe(false)
    const promise = start()
    expect(isStarting.value).toBe(true)
    await promise
    expect(isStarting.value).toBe(false)
  })

  test('isStarting resets to false when supabase throws', async () => {
    signInWithOAuth.mockImplementationOnce(async () => {
      throw new Error('network down')
    })
    const { start, isStarting } = useGoogleOAuth()
    await expect(start()).rejects.toThrow('network down')
    expect(isStarting.value).toBe(false)
  })
})
