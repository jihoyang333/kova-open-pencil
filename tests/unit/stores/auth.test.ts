import { describe, test, expect, beforeEach, mock } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'

// Mock only getRouter — re-export real functions so other tests aren't affected
const mockPush = mock(() => Promise.resolve())

const realRouter = await import('@/router')
mock.module('@/router', () => ({
  ...realRouter,
  getRouter: () => ({ push: mockPush }),
}))

// Mock Supabase client
const mockGetSession = mock(() =>
  Promise.resolve({ data: { session: null }, error: null }),
)
const mockSignInWithPassword = mock(() =>
  Promise.resolve({ data: { user: null, session: null }, error: null }),
)
const mockSignUp = mock(() =>
  Promise.resolve({ data: { user: null, session: null }, error: null }),
)
const mockSignInWithOAuth = mock(() =>
  Promise.resolve({ data: {}, error: null }),
)
const mockSignOut = mock(() => Promise.resolve({ error: null }))
const mockOnAuthStateChange = mock(() => ({
  data: { subscription: { unsubscribe: mock(() => {}) } },
}))
const mockFrom = mock(() => ({
  select: mock(() => ({
    eq: mock(() => ({
      single: mock(() => Promise.resolve({ data: null, error: null })),
    })),
  })),
}))

mock.module('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
      signInWithPassword: mockSignInWithPassword,
      signUp: mockSignUp,
      signInWithOAuth: mockSignInWithOAuth,
      signOut: mockSignOut,
      onAuthStateChange: mockOnAuthStateChange,
    },
    from: mockFrom,
  },
}))

const { useAuthStore } = await import('@/stores/auth')

describe('auth store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockPush.mockClear()
    mockGetSession.mockClear()
    mockSignInWithPassword.mockClear()
    mockSignUp.mockClear()
    mockSignInWithOAuth.mockClear()
    mockSignOut.mockClear()
    mockOnAuthStateChange.mockClear()
    mockFrom.mockClear()
  })

  test('starts with isLoading true', () => {
    const store = useAuthStore()
    expect(store.isLoading).toBe(true)
    expect(store.isAuthenticated).toBe(false)
  })

  test('sets isLoading to false after initialize completes', async () => {
    const store = useAuthStore()
    await store.initialize()
    expect(store.isLoading).toBe(false)
  })

  test('restores session from getSession on initialize', async () => {
    const mockUser = { id: 'user-1', email: 'test@test.com' }
    const mockSession = { user: mockUser, access_token: 'token' }
    mockGetSession.mockResolvedValueOnce({
      data: { session: mockSession },
      error: null,
    })
    mockFrom.mockReturnValueOnce({
      select: () => ({
        eq: () => ({
          single: () =>
            Promise.resolve({
              data: { onboarded: true, plan: 'free' },
              error: null,
            }),
        }),
      }),
    })

    const store = useAuthStore()
    await store.initialize()

    expect(store.user).toEqual(mockUser)
    expect(store.session).toEqual(mockSession)
    expect(store.isAuthenticated).toBe(true)
    expect(store.isLoading).toBe(false)
  })

  test('sets isLoading to false if getSession fails', async () => {
    mockGetSession.mockResolvedValueOnce({
      data: { session: null },
      error: { message: 'Network error' },
    })

    const store = useAuthStore()
    await store.initialize()

    expect(store.isLoading).toBe(false)
    expect(store.isAuthenticated).toBe(false)
  })

  test('returns user after successful signIn', async () => {
    const mockUser = { id: 'user-1', email: 'test@test.com' }
    mockSignInWithPassword.mockResolvedValueOnce({
      data: { user: mockUser, session: { user: mockUser } },
      error: null,
    })
    mockFrom.mockReturnValueOnce({
      select: () => ({
        eq: () => ({
          single: () =>
            Promise.resolve({
              data: { onboarded: true, plan: 'free' },
              error: null,
            }),
        }),
      }),
    })

    const store = useAuthStore()
    const result = await store.signIn('test@test.com', 'password123')

    expect(result.error).toBeNull()
    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'test@test.com',
      password: 'password123',
    })
  })

  test('signIn populates profile before resolving', async () => {
    const mockUser = { id: 'user-1', email: 'test@test.com' }
    const mockSession = { user: mockUser, access_token: 'token' }
    mockSignInWithPassword.mockResolvedValueOnce({
      data: { user: mockUser, session: mockSession },
      error: null,
    })
    mockFrom.mockReturnValueOnce({
      select: () => ({
        eq: () => ({
          single: () =>
            Promise.resolve({
              data: { onboarded: true, plan: 'free' },
              error: null,
            }),
        }),
      }),
    })

    const store = useAuthStore()
    await store.signIn('test@test.com', 'password123')

    expect(store.isAuthenticated).toBe(true)
    expect(store.isOnboarded).toBe(true)
    expect(store.profile).toEqual({ onboarded: true, plan: 'free' })
  })

  test('returns error for invalid credentials', async () => {
    mockSignInWithPassword.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { message: 'Invalid credentials' },
    })

    const store = useAuthStore()
    const result = await store.signIn('test@test.com', 'wrong')

    expect(result.error).toBeTruthy()
    expect(result.error?.message).toBe('Invalid credentials')
  })

  test('signUp returns error for existing email', async () => {
    mockSignUp.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { message: 'User already registered' },
    })

    const store = useAuthStore()
    const result = await store.signUp('existing@test.com', 'password123')

    expect(result.error).toBeTruthy()
    expect(result.error?.message).toBe('User already registered')
  })

  test('signUp returns data with empty identities for repeated signup', async () => {
    mockSignUp.mockResolvedValueOnce({
      data: {
        user: { id: 'user-1', identities: [] },
        session: null,
      },
      error: null,
    })

    const store = useAuthStore()
    const result = await store.signUp('existing@test.com', 'password123')

    expect(result.error).toBeNull()
    expect(result.data?.user?.identities).toEqual([])
  })

  test('fetches profile and exposes isOnboarded', async () => {
    const mockUser = { id: 'user-1', email: 'test@test.com' }
    const mockSession = { user: mockUser, access_token: 'token' }
    mockGetSession.mockResolvedValueOnce({
      data: { session: mockSession },
      error: null,
    })
    mockFrom.mockReturnValueOnce({
      select: () => ({
        eq: () => ({
          single: () =>
            Promise.resolve({
              data: { onboarded: true, plan: 'free' },
              error: null,
            }),
        }),
      }),
    })

    const store = useAuthStore()
    await store.initialize()

    expect(store.isOnboarded).toBe(true)
    expect(store.profile).toEqual({ onboarded: true, plan: 'free' })
  })

  test('navigates to /login on signOut', async () => {
    const store = useAuthStore()
    await store.signOut()

    expect(mockSignOut).toHaveBeenCalled()
    expect(store.user).toBeNull()
    expect(store.session).toBeNull()
    expect(store.profile).toBeNull()
    expect(mockPush).toHaveBeenCalledWith('/login')
  })

  test('calls onAuthStateChange during initialize', async () => {
    const store = useAuthStore()
    await store.initialize()
    expect(mockOnAuthStateChange).toHaveBeenCalled()
  })
})
