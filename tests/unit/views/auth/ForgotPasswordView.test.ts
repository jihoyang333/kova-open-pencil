import { beforeEach, describe, expect, mock, test } from 'bun:test'

import { mount, RouterLinkStub } from '@vue/test-utils'
import { ref } from 'vue'

// W8a Cluster 01 — ForgotPasswordView (Plan 01 Task 18 / amendment §7 Phase 9.3).
// Hi-fi: A15.05. Flag-gated behind FORGOT_PASSWORD_ENABLED (false in MVP).

const featureEnabled = ref(false)
mock.module('@/constants', () => ({
  APP_NAME: 'Kova',
  get FORGOT_PASSWORD_ENABLED() {
    return featureEnabled.value
  }
}))

const resetPasswordForEmail = mock(async () => ({ data: null, error: null }))
mock.module('@/lib/supabase', () => ({
  supabase: {
    auth: { resetPasswordForEmail }
  }
}))

mock.module('vue-router', () => ({
  useRoute: () => ({ query: {} }),
  useRouter: () => ({ push: mock(async () => undefined) }),
  RouterLink: RouterLinkStub,
  createRouter: () => ({}),
  createWebHistory: () => ({}),
  createMemoryHistory: () => ({})
}))

const { default: ForgotPasswordView } =
  await import('../../../../src/views/auth/ForgotPasswordView.vue')

function mountView() {
  return mount(ForgotPasswordView, {
    global: { stubs: { RouterLink: RouterLinkStub } }
  })
}

describe('<ForgotPasswordView>', () => {
  beforeEach(() => {
    featureEnabled.value = false
    resetPasswordForEmail.mockClear()
  })

  test('renders A15.05 chrome (headline + lede)', () => {
    const wrapper = mountView()
    expect(wrapper.text()).toContain('Forgot your password?')
    expect(wrapper.text()).toContain('recovery link')
  })

  test('when flag is off, shows unavailable notice + disables submit', () => {
    featureEnabled.value = false
    const wrapper = mountView()
    expect(wrapper.text()).toContain('Magic-link sign-in is the only option in MVP')
    const submit = wrapper.find('[data-test-id="forgot-password-submit"]')
    expect(submit.attributes('disabled')).toBeDefined()
  })

  test('when flag is off, submitting does not call supabase', async () => {
    featureEnabled.value = false
    const wrapper = mountView()
    await wrapper.find('input[type="email"]').setValue('jiho@kova.io')
    await wrapper.find('form').trigger('submit.prevent')
    expect(resetPasswordForEmail).not.toHaveBeenCalled()
  })

  // NOTE: "flag is on" path tested via E2E in Phase 2 (when email+password
  // ships). bun:test mock.module returns a snapshot of static-export values,
  // so flipping featureEnabled mid-test does not propagate to the SFC's
  // namespace import. The flag-off path is what matters in MVP.

  test('renders in light theme', () => {
    const wrapper = mountView()
    expect(wrapper.find('[data-theme="light"]').exists()).toBe(true)
  })
})
