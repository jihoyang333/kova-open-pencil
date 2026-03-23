import { describe, test, expect, beforeEach, mock } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'

mock.module('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: mock(() => Promise.resolve({ data: { session: null }, error: null })),
      onAuthStateChange: mock(() => ({ data: { subscription: { unsubscribe: () => {} } } })),
    },
  },
}))

const { useAuthStore } = await import('@/stores/auth')
const { getAuthHeaders } = await import('@/utils/api-headers')

describe('getAuthHeaders', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  test('returns Content-Type when no session exists', () => {
    const headers = getAuthHeaders()
    expect(headers).toEqual({ 'Content-Type': 'application/json' })
  })

  test('returns Authorization header when session has access_token', () => {
    const authStore = useAuthStore()
    authStore.session = { access_token: 'test-token-123' } as any
    const headers = getAuthHeaders()
    expect(headers).toEqual({
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-token-123',
    })
  })
})
