import { describe, test, expect } from 'bun:test'

import { resolveGuard, resolveRootRedirect } from '@/router'

describe('resolveGuard', () => {
  const authed = { isAuthenticated: true, isOnboarded: true }
  const unauthed = { isAuthenticated: false, isOnboarded: false }
  const authedNotOnboarded = { isAuthenticated: true, isOnboarded: false }

  test('redirects unauthenticated users to /login for protected routes', () => {
    const result = resolveGuard(
      { meta: { requiresAuth: true, requiresOnboarding: true }, path: '/dashboard' },
      unauthed,
    )
    expect(result).toBe('/login')
  })

  test('redirects authenticated users away from /login', () => {
    const result = resolveGuard(
      { meta: { requiresAuth: false, publicOnly: true }, path: '/login' },
      authed,
    )
    expect(result).toBe('/dashboard')
  })

  test('redirects authenticated users away from /signup', () => {
    const result = resolveGuard(
      { meta: { requiresAuth: false, publicOnly: true }, path: '/signup' },
      authed,
    )
    expect(result).toBe('/dashboard')
  })

  test('redirects non-onboarded users to /onboarding', () => {
    const result = resolveGuard(
      { meta: { requiresAuth: true, requiresOnboarding: true }, path: '/dashboard' },
      authedNotOnboarded,
    )
    expect(result).toBe('/onboarding')
  })

  test('redirects onboarded users away from /onboarding', () => {
    const result = resolveGuard(
      { meta: { requiresAuth: true, requiresOnboarding: false }, path: '/onboarding' },
      authed,
    )
    expect(result).toBe('/dashboard')
  })

  test('allows access to /demo regardless of auth state', () => {
    const result = resolveGuard(
      { meta: { demo: true, requiresAuth: false, publicOnly: false }, path: '/demo' },
      unauthed,
    )
    expect(result).toBe(true)
  })

  test('allows authenticated onboarded users to access protected routes', () => {
    const result = resolveGuard(
      { meta: { requiresAuth: true, requiresOnboarding: true }, path: '/dashboard' },
      authed,
    )
    expect(result).toBe(true)
  })

  test('allows unauthenticated users to access public-only routes', () => {
    const result = resolveGuard(
      { meta: { requiresAuth: false, publicOnly: true }, path: '/login' },
      unauthed,
    )
    expect(result).toBe(true)
  })
})

describe('resolveRootRedirect', () => {
  test('redirects / to /dashboard for authenticated users', () => {
    expect(resolveRootRedirect({ isAuthenticated: true, isOnboarded: true })).toBe('/dashboard')
  })

  test('redirects / to /login for unauthenticated users', () => {
    expect(resolveRootRedirect({ isAuthenticated: false, isOnboarded: false })).toBe('/login')
  })
})
