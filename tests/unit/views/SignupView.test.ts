import { afterAll, beforeEach, describe, expect, mock, test } from 'bun:test'

import { mount, RouterLinkStub } from '@vue/test-utils'

// W8a Cluster 01 — SignupView (Plan 01 Task 17 / amendment §3.1).
//
// Sibling test added 2026-05-22 to close audit gap (no SignupView.test.ts
// shipped with the original c01 v2 work). SignupView ships the documented
// 2-state Notion pattern (signup doesn't have an OTP-wrong / locked flow —
// signup confirms via magic-link, not OTP entry).

const push = mock(async () => undefined)
const replace = mock(async () => undefined)
mock.module('vue-router', () => ({
  useRoute: () => ({ query: {} }),
  useRouter: () => ({ push, replace }),
  RouterLink: RouterLinkStub,
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

const { default: SignupView } = await import('../../../src/views/SignupView.vue')

describe('<SignupView>', () => {
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

  test('renders the Google sign-up button on the email-entry surface', () => {
    const wrapper = mount(SignupView)
    expect(wrapper.find('.google-signin').exists()).toBe(true)
    // Mode="signup" → label text
    expect(wrapper.find('.google-signin').text()).toContain('Sign up with Google')
    wrapper.unmount()
  })

  test('renders the email field', () => {
    const wrapper = mount(SignupView)
    expect(wrapper.find('input[type="email"]').exists()).toBe(true)
    wrapper.unmount()
  })

  test('does not surface any password input (passwordless signup per amendment)', () => {
    const wrapper = mount(SignupView)
    expect(wrapper.find('input[type="password"]').exists()).toBe(false)
    wrapper.unmount()
  })
})
