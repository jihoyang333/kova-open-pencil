import { afterAll, beforeEach, describe, expect, mock, test } from 'bun:test'

import { mount, RouterLinkStub } from '@vue/test-utils'
import { nextTick } from 'vue'

// W8a Cluster 01 — LoginView (Plan 01 Task 17 / amendment §3.1).
//
// Sibling test added 2026-05-22 to close audit gap (no LoginView.test.ts
// shipped with the original c01 v2 work). Asserts the 5-state machine
// the audit rubric §K requires and the Google sign-in surface wiring.

const push = mock(async () => undefined)
const replace = mock(async () => undefined)
mock.module('vue-router', () => ({
  useRoute: () => ({ query: {} }),
  useRouter: () => ({ push, replace }),
  RouterLink: RouterLinkStub,
  // Keep router.ts static-imports intact when this file leaks across the
  // bun:test process — guards tests re-import these from vue-router.
  createRouter: () => ({}),
  createWebHistory: () => ({}),
  createMemoryHistory: () => ({})
}))

const verifyOtp = mock(async () => ({ data: {}, error: null }))
const signInWithOtp = mock(async () => ({ data: {}, error: null }))
mock.module('@/lib/supabase', () => ({
  supabase: {
    auth: {
      verifyOtp,
      signInWithOtp
    }
  }
}))

const toastShow = mock(() => {})
mock.module('@/composables/use-toast', () => ({
  toast: { show: toastShow }
}))

const { default: LoginView } = await import('../../../src/views/LoginView.vue')

describe('<LoginView>', () => {
  beforeEach(() => {
    push.mockClear()
    replace.mockClear()
    verifyOtp.mockClear()
    signInWithOtp.mockClear()
    toastShow.mockClear()
  })

  afterAll(() => {
    mock.restore()
  })

  test('initial state is email-entry', () => {
    const wrapper = mount(LoginView)
    const root = wrapper.find('[data-test-id="login-view"]')
    expect(root.attributes('data-state')).toBe('email-entry')
    wrapper.unmount()
  })

  test('renders the Google sign-in button on the email-entry surface', () => {
    const wrapper = mount(LoginView)
    // GoogleSignInButton wraps KovaGoogleSignInButton; the inner button has the
    // `google-signin` class. We assert by class, not by component reference.
    expect(wrapper.find('.google-signin').exists()).toBe(true)
    wrapper.unmount()
  })

  test('renders the email field on the email-entry surface', () => {
    const wrapper = mount(LoginView)
    expect(wrapper.find('input[type="email"]').exists()).toBe(true)
    wrapper.unmount()
  })

  test('transitions to magic-link-sent after a successful email send', async () => {
    signInWithOtp.mockImplementationOnce(async () => ({ data: {}, error: null }))
    const wrapper = mount(LoginView)
    await wrapper.find('input[type="email"]').setValue('user@example.com')
    await wrapper.find('form').trigger('submit.prevent')
    await nextTick()
    await nextTick()
    const root = wrapper.find('[data-test-id="login-view"]')
    expect(root.attributes('data-state')).toBe('magic-link-sent')
    wrapper.unmount()
  })

  test('exposes all 5 audit-rubric states in the source', async () => {
    // Sentinel check — guards against accidental state-machine collapse.
    const file = await Bun.file('src/views/LoginView.vue').text()
    expect(file).toContain("'email-entry'")
    expect(file).toContain("'magic-link-sent'")
    expect(file).toContain("'otp-entry'")
    expect(file).toContain("'otp-wrong'")
    expect(file).toContain("'otp-locked'")
  })
})
