import { describe, test, expect, beforeEach, mock } from 'bun:test'
import type { RouteLocationNormalized } from 'vue-router'

// Plan 01 Task 13 — authGuard.

let mockSession: unknown
let mockProfile: { deleted_at?: string | null } | null

function resetMocks(): void {
  mockSession = null
  mockProfile = null
}

mock.module('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: mockSession }, error: null }),
    },
  },
}))

mock.module('@/stores/auth', () => ({
  useAuthStore: () => ({ profile: mockProfile }),
}))

const { authGuard } = await import('../../../../src/router/guards/auth-guard')

function makeRoute(overrides: Partial<RouteLocationNormalized>): RouteLocationNormalized {
  return {
    name: 'home',
    path: '/',
    meta: {},
    params: {},
    query: {},
    hash: '',
    fullPath: '/',
    matched: [],
    redirectedFrom: undefined,
    ...overrides,
  } as RouteLocationNormalized
}

describe('authGuard', () => {
  beforeEach(() => resetMocks())

  test('viewport guard redirects to /desktop-only when width<1024', async () => {
    ;(globalThis as { window?: { innerWidth: number } }).window = { innerWidth: 375 }
    const r = await authGuard(
      makeRoute({ name: 'login', meta: { viewportGuard: 'desktop' }, fullPath: '/login' }),
      makeRoute({}),
      () => undefined
    )
    expect(r).toEqual({ name: 'desktop-only', query: { redirect: '/login' } })
  })

  test('passes through when on /desktop-only even at small viewport', async () => {
    ;(globalThis as { window?: { innerWidth: number } }).window = { innerWidth: 375 }
    const r = await authGuard(
      makeRoute({ name: 'desktop-only', meta: {} }),
      makeRoute({}),
      () => undefined
    )
    expect(r).toBe(true)
  })

  test('redirects deleted-account user to /account-pending-deletion', async () => {
    ;(globalThis as { window?: { innerWidth: number } }).window = { innerWidth: 1440 }
    mockSession = { user: { id: 'u1' } }
    mockProfile = { deleted_at: '2026-05-15T00:00:00Z' }
    const r = await authGuard(
      makeRoute({ name: 'dashboard', meta: { requiresAuth: true } }),
      makeRoute({}),
      () => undefined
    )
    expect(r).toEqual({ name: 'account-pending-deletion' })
  })

  test('allows deleted-account user onto /account-pending-deletion (allowDeletedAccount)', async () => {
    ;(globalThis as { window?: { innerWidth: number } }).window = { innerWidth: 1440 }
    mockSession = { user: { id: 'u1' } }
    mockProfile = { deleted_at: '2026-05-15T00:00:00Z' }
    const r = await authGuard(
      makeRoute({ name: 'account-pending-deletion', meta: { requiresAuth: true, allowDeletedAccount: true } }),
      makeRoute({}),
      () => undefined
    )
    expect(r).toBe(true)
  })

  test('redirects unauthenticated → /login with redirect= query', async () => {
    ;(globalThis as { window?: { innerWidth: number } }).window = { innerWidth: 1440 }
    mockSession = null
    const r = await authGuard(
      makeRoute({ name: 'dashboard', meta: { requiresAuth: true }, fullPath: '/dashboard' }),
      makeRoute({}),
      () => undefined
    )
    expect(r).toEqual({ name: 'login', query: { redirect: '/dashboard' } })
  })

  test('redirects signed-in user from /login → /dashboard (redirectIfAuth)', async () => {
    ;(globalThis as { window?: { innerWidth: number } }).window = { innerWidth: 1440 }
    mockSession = { user: { id: 'u1' } }
    mockProfile = { deleted_at: null }
    const r = await authGuard(
      makeRoute({ name: 'login', meta: { redirectIfAuth: true } }),
      makeRoute({}),
      () => undefined
    )
    expect(r).toEqual({ name: 'dashboard' })
  })

  test('public route passes through', async () => {
    ;(globalThis as { window?: { innerWidth: number } }).window = { innerWidth: 1440 }
    const r = await authGuard(
      makeRoute({ name: 'privacy', meta: {} }),
      makeRoute({}),
      () => undefined
    )
    expect(r).toBe(true)
  })
})
