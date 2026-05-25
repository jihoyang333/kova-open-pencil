import { describe, test, expect, beforeEach, mock } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'

// Stub vue-router (composable calls useRouter) + auth + supabase so the
// wizard composable can mount without a full app context.
mock.module('vue-router', () => ({
  useRouter: () => ({ push: async () => {} }),
}))
mock.module('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      insert: () => ({ select: () => ({ single: async () => ({ data: { id: 'b1' }, error: null }) }) }),
    }),
  },
}))
mock.module('@/stores/auth', () => ({
  useAuthStore: () => ({ user: { id: 'user-test' } }),
}))

const { useOnboarding, _resetForTesting } = await import('@/composables/use-onboarding')

describe('useOnboarding', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    sessionStorage.clear()
    _resetForTesting()
  })

  test('starts at brand step', () => {
    const o = useOnboarding()
    expect(o.step.value).toBe('brand')
  })

  test('next advances brand → shopify → brand-kit → splash', () => {
    const o = useOnboarding()
    o.next()
    expect(o.step.value).toBe('shopify')
    o.next()
    expect(o.step.value).toBe('brand-kit')
    o.next()
    expect(o.step.value).toBe('splash')
  })

  test('next from final step is a no-op', () => {
    const o = useOnboarding()
    o.next()
    o.next()
    o.next()
    o.next()
    o.next()
    expect(o.step.value).toBe('splash')
  })

  test('prev does not regress past brand', () => {
    const o = useOnboarding()
    o.prev()
    expect(o.step.value).toBe('brand')
  })

  test('prev walks back from splash', () => {
    const o = useOnboarding()
    o.next()
    o.next()
    o.next() // splash
    o.prev()
    expect(o.step.value).toBe('brand-kit')
  })

  test('persistDraft writes step + state to sessionStorage', () => {
    const o = useOnboarding()
    o.next()
    o.persistDraft()
    const raw = sessionStorage.getItem('kova:onboarding:draft')
    expect(raw).toContain('"step":"shopify"')
  })

  test('restoreDraft hydrates step from sessionStorage', () => {
    sessionStorage.setItem(
      'kova:onboarding:draft',
      JSON.stringify({ step: 'brand-kit', brandName: 'Acme', brandUrl: 'acme.com' })
    )
    const o = useOnboarding()
    o.restoreDraft()
    expect(o.step.value).toBe('brand-kit')
    expect(o.state.brandName).toBe('Acme')
    expect(o.state.brandUrl).toBe('acme.com')
  })

  test('restoreDraft discards corrupt JSON without throwing', () => {
    sessionStorage.setItem('kova:onboarding:draft', '{not json')
    const o = useOnboarding()
    expect(() => o.restoreDraft()).not.toThrow()
    expect(o.step.value).toBe('brand')
  })

  test('B-MED15: state is a Reactive proxy — assign without .value works', () => {
    const o = useOnboarding()
    o.state.brandName = 'Acme'
    o.state.brandUrl = 'acme.com'
    o.state.industry = 'Athletic apparel'
    expect(o.state.brandName).toBe('Acme')
    expect(o.state.brandUrl).toBe('acme.com')
    expect(o.state.industry).toBe('Athletic apparel')
  })

  test('B-MED15 + C-HIGH3: every useOnboarding() returns the same singleton state', () => {
    const a = useOnboarding()
    const b = useOnboarding()
    a.state.brandName = 'Singleton check'
    expect(b.state.brandName).toBe('Singleton check')
    expect(a.state).toBe(b.state)
  })

  test('canProceed gates brand step on brandName + brandUrl', () => {
    const o = useOnboarding()
    expect(o.canProceed.value).toBe(false)
    o.state.brandName = 'Acme'
    expect(o.canProceed.value).toBe(false)
    o.state.brandUrl = 'acme.com'
    expect(o.canProceed.value).toBe(true)
  })
})
