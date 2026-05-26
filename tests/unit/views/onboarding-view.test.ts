import { describe, test, expect, beforeEach, mock } from 'bun:test'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import * as vueuse from '@vueuse/core'

// Plan T17 — OnboardingView wizard host contract.

mock.module('@vueuse/core', () => ({
  ...vueuse,
  useDebounceFn: <T extends (...args: never[]) => unknown>(fn: T) => fn,
}))
mock.module('@/components/ui/KovaIcon.vue', () => ({
  default: { name: 'KovaIcon', template: '<span class="kova-icon-stub" />' },
}))
mock.module('vue-router', () => ({
  useRouter: () => ({ push: async () => {} }),
}))
mock.module('@/stores/auth', () => ({
  useAuthStore: () => ({ user: { id: 'user-test' } }),
}))
mock.module('@/lib/supabase', () => ({
  supabase: {
    storage: {
      from: () => ({
        upload: async () => ({ error: null }),
        getPublicUrl: () => ({ data: { publicUrl: 'https://x.test/logo.png' } }),
      }),
    },
    auth: {
      getSession: async () => ({ data: { session: { access_token: 'jwt' } }, error: null }),
    },
  },
}))

const { default: OnboardingView } = await import('@/views/OnboardingView.vue')
const { _resetForTesting, useOnboarding } = await import('@/composables/use-onboarding')

describe('OnboardingView (wizard host)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    _resetForTesting()
    sessionStorage.clear()
  })

  test('renders BrandIdentityStep on first mount (step = brand)', () => {
    const w = mount(OnboardingView)
    expect(w.find('[data-test-id="onboarding-brand-identity-step"]').exists()).toBe(true)
  })

  test('progress strip shows 5 dots, dot 1 done + dot 2 active', () => {
    const w = mount(OnboardingView)
    const dots = w.findAll('.onb-progress .dot')
    expect(dots).toHaveLength(5)
    expect(dots[0]!.classes()).toContain('done')
    expect(dots[1]!.classes()).toContain('active')
  })

  test('step shopify renders StoreTypeStep with brandName + brandId props', async () => {
    const wizard = useOnboarding()
    wizard.state.brandName = 'Acme'
    wizard.state.brandUrl = 'acme.com'
    wizard.next() // -> shopify
    const w = mount(OnboardingView)
    expect(w.find('[data-test-id="onboarding-store-type-step"]').exists()).toBe(true)
  })

  test('step brand-kit renders BrandKitStep', () => {
    const wizard = useOnboarding()
    wizard.next()
    wizard.next() // -> brand-kit
    const w = mount(OnboardingView)
    expect(w.find('[data-test-id="onboarding-brand-kit-step"]').exists()).toBe(true)
  })

  test('step splash renders SplashStep with brandName prop', () => {
    const wizard = useOnboarding()
    wizard.state.brandName = 'Nike'
    wizard.next()
    wizard.next()
    wizard.next() // -> splash
    const w = mount(OnboardingView)
    expect(w.find('[data-test-id="onboarding-splash-step"]').exists()).toBe(true)
    expect(w.find('[data-test-id="splash-enter"]').text()).toContain('Nike')
  })
})
