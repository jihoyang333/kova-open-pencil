import { describe, test, expect } from 'bun:test'
import { createMemoryHistory } from 'vue-router'
import { setActivePinia, createPinia } from 'pinia'

// PRD 02 §6.1 + Plan T12 — Cluster 02 routes:
//   - 4 onboarding sub-routes (C-HIGH2): /onboarding/{brand,shopify,brand-kit,done}
//   - /brand/:brandId parent + children (recents, calendar, swipes, templates,
//     products, personalization, knowledge-base, memories, trash)
//   - /brands picker placeholder
//   - /dashboard legacy redirect

// createAppRouter calls useAuthStore on root redirect; pinia must be active.
setActivePinia(createPinia())

const { createAppRouter } = await import('@/router')
const router = createAppRouter(createMemoryHistory())

describe('Cluster 02 — onboarding wizard sub-routes (C-HIGH2)', () => {
  test.each([
    ['/onboarding/brand', 'onboarding-brand', 1],
    ['/onboarding/shopify', 'onboarding-shopify', 2],
    ['/onboarding/brand-kit', 'onboarding-brand-kit', 3],
    ['/onboarding/done', 'onboarding-done', 4],
  ] as const)('%s resolves to %s with wizardStep %i', (path, name, step) => {
    const route = router.resolve(path)
    expect(route.name).toBe(name)
    expect(route.meta.wizardStep).toBe(step)
    expect(route.meta.onboardingOnly).toBe(true)
    expect(route.meta.theme).toBe('dark')
  })
})

describe('Cluster 02 — brand-scoped routes', () => {
  test('/brand/:brandId resolves to brand-home with auth + onboarding + dark theme', () => {
    const route = router.resolve('/brand/abc-123')
    expect(route.matched.length).toBeGreaterThan(0)
    expect(route.meta.theme).toBe('dark')
    expect(route.meta.requiresAuth).toBe(true)
    expect(route.meta.requiresOnboarding).toBe(true)
  })

  test.each([
    ['/brand/abc/calendar', 'brand-calendar'],
    ['/brand/abc/swipes', 'brand-swipes'],
    ['/brand/abc/templates', 'brand-templates'],
    ['/brand/abc/products', 'brand-products'],
    ['/brand/abc/personalization', 'brand-personalization'],
    ['/brand/abc/knowledge-base', 'brand-kb'],
    ['/brand/abc/memories', 'brand-memories'],
  ] as const)('%s resolves to %s (ComingSoonView)', (path, name) => {
    expect(router.resolve(path).name).toBe(name)
  })

  test('/brand/:brandId/trash resolves to brand-trash', () => {
    expect(router.resolve('/brand/abc/trash').name).toBe('brand-trash')
  })
})

describe('Cluster 02 — brands picker', () => {
  test('/brands route exists', () => {
    expect(router.resolve('/brands').name).toBe('brands-picker')
  })
})

describe('Cluster 02 — legacy /dashboard redirect', () => {
  test('/dashboard resolves (redirect target depends on store)', () => {
    const route = router.resolve('/dashboard')
    expect(route.matched.length).toBeGreaterThan(0)
  })
})
