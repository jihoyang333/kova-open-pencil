/**
 * /canvas/:canvasId route guards — Cluster 06 Task 17.
 *
 * Covers the three guard layers per PRD 06 §6.1:
 *  - viewport (desktopOnly → /mobile-fallback)
 *  - auth (requiresAuth → /login, requiresOnboarding → /onboarding)
 *  - brand-ownership (useCanvasesStore.verifyOwnership → /dashboard on false)
 */
import { describe, test, expect, beforeEach, mock } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'
import { resolveGuard } from '@/router'

// Canonical meta attached to the /canvas/:canvasId route.
const canvasMeta = {
  requiresAuth: true,
  requiresOnboarding: true,
  desktopOnly: true,
  theme: 'dark',
} as const

const to = { meta: canvasMeta, path: '/canvas/abc' }

describe('canvas route — resolveGuard layers', () => {
  test('redirects to /mobile-fallback below the desktop viewport', () => {
    const r = resolveGuard(to, { isAuthenticated: true, isOnboarded: true }, { isDesktop: false })
    expect(r).toBe('/mobile-fallback')
  })

  test('redirects to /login when unauthenticated (desktop)', () => {
    const r = resolveGuard(to, { isAuthenticated: false, isOnboarded: false }, { isDesktop: true })
    expect(r).toBe('/login')
  })

  test('redirects to /onboarding when authed but not onboarded', () => {
    const r = resolveGuard(to, { isAuthenticated: true, isOnboarded: false }, { isDesktop: true })
    expect(r).toBe('/onboarding')
  })

  test('allows navigation when desktop + authed + onboarded', () => {
    const r = resolveGuard(to, { isAuthenticated: true, isOnboarded: true }, { isDesktop: true })
    expect(r).toBe(true)
  })
})

// ── ownership guard (store contract) ────────────────────────────────
let mockResult: { data: unknown; error: unknown } = { data: null, error: null }
mock.module('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve(mockResult),
        }),
      }),
    }),
  },
}))

const { useCanvasesStore } = await import('@/stores/canvases')

describe('useCanvasesStore.verifyOwnership', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  test('true when an owned, non-trashed canvas row is visible', async () => {
    mockResult = { data: { id: 'c1', trashed_at: null }, error: null }
    expect(await useCanvasesStore().verifyOwnership('c1')).toBe(true)
  })

  test('false when no row is visible (foreign / missing — RLS)', async () => {
    mockResult = { data: null, error: null }
    expect(await useCanvasesStore().verifyOwnership('c1')).toBe(false)
  })

  test('false when the canvas is trashed (not openable in editor)', async () => {
    mockResult = { data: { id: 'c1', trashed_at: '2026-05-01T00:00:00Z' }, error: null }
    expect(await useCanvasesStore().verifyOwnership('c1')).toBe(false)
  })

  test('false on query error', async () => {
    mockResult = { data: null, error: { message: 'boom' } }
    expect(await useCanvasesStore().verifyOwnership('c1')).toBe(false)
  })
})
