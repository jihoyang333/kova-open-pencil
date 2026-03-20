import { describe, test, expect, beforeEach, mock } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'

const mockFrom = mock(() => ({}))
const mockAuth = {
  getSession: mock(() => Promise.resolve({ data: { session: null }, error: null })),
  onAuthStateChange: mock(() => ({ data: { subscription: { unsubscribe: () => {} } } })),
  signInWithPassword: mock(() => Promise.resolve({ data: {}, error: null })),
  signUp: mock(() => Promise.resolve({ error: null })),
  signInWithOAuth: mock(() => Promise.resolve({ error: null })),
  signOut: mock(() => Promise.resolve()),
}

mock.module('@/lib/supabase', () => ({
  supabase: { from: mockFrom, auth: mockAuth },
}))

mock.module('@/router', () => ({
  getRouter: () => ({ push: mock(() => {}) }),
}))

const { useAuthStore } = await import('@/stores/auth')

describe('auth store - name field', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockFrom.mockClear()
  })

  test('fetchProfile includes name in profile', async () => {
    mockFrom.mockReturnValueOnce({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({
            data: { name: 'Jiho', onboarded: true, plan: 'free' },
            error: null,
          }),
        }),
      }),
    })

    const store = useAuthStore()
    store.user = { id: 'user-1' } as any
    await store.fetchProfile()

    expect(store.profile?.name).toBe('Jiho')
  })

  test('fetchProfile handles null name', async () => {
    mockFrom.mockReturnValueOnce({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({
            data: { name: null, onboarded: false, plan: 'free' },
            error: null,
          }),
        }),
      }),
    })

    const store = useAuthStore()
    store.user = { id: 'user-1' } as any
    await store.fetchProfile()

    expect(store.profile?.name).toBeNull()
  })

  test('updateName updates profile name', async () => {
    mockFrom.mockReturnValueOnce({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({
            data: { name: null, onboarded: false, plan: 'free' },
            error: null,
          }),
        }),
      }),
    })

    const store = useAuthStore()
    store.user = { id: 'user-1' } as any
    await store.fetchProfile()

    mockFrom.mockReturnValueOnce({
      update: () => ({
        eq: () => Promise.resolve({ error: null }),
      }),
    })

    await store.updateName('New Name')
    expect(store.profile?.name).toBe('New Name')
  })
})
