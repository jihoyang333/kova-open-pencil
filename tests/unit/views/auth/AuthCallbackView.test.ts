import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'

import { mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'

// W8a Cluster 01 — AuthCallbackView (Plan 01 Task 18 + amendment §3.1).

const isAuthenticated = ref(false)
const isOnboarded = ref(false)
mock.module('@/stores/auth', () => ({
  useAuthStore: () => ({
    get isAuthenticated() {
      return isAuthenticated.value
    },
    get isOnboarded() {
      return isOnboarded.value
    }
  })
}))

const replace = mock(async () => undefined)
mock.module('vue-router', () => ({
  useRouter: () => ({ replace })
}))

const { default: AuthCallbackView } =
  await import('../../../../src/views/auth/AuthCallbackView.vue')

describe('<AuthCallbackView>', () => {
  beforeEach(() => {
    isAuthenticated.value = false
    isOnboarded.value = false
    replace.mockClear()
  })

  afterEach(() => {
    // Reset to avoid timer leakage between tests
  })

  test('renders a loading state on mount when not yet authenticated', () => {
    const wrapper = mount(AuthCallbackView)
    expect(wrapper.text()).toContain('Signing you in')
  })

  test('redirects to /onboarding once authenticated and not onboarded', async () => {
    isAuthenticated.value = false
    isOnboarded.value = false
    const wrapper = mount(AuthCallbackView)
    isAuthenticated.value = true
    await nextTick()
    expect(replace).toHaveBeenCalledWith('/onboarding')
    wrapper.unmount()
  })

  test('redirects to /dashboard once authenticated and onboarded', async () => {
    isAuthenticated.value = false
    isOnboarded.value = true
    const wrapper = mount(AuthCallbackView)
    isAuthenticated.value = true
    await nextTick()
    expect(replace).toHaveBeenCalledWith('/dashboard')
    wrapper.unmount()
  })

  test('redirects immediately if already authenticated on mount', () => {
    isAuthenticated.value = true
    isOnboarded.value = true
    const wrapper = mount(AuthCallbackView)
    expect(replace).toHaveBeenCalledWith('/dashboard')
    wrapper.unmount()
  })

  test('renders the loading spinner element', () => {
    const wrapper = mount(AuthCallbackView)
    expect(wrapper.find('.animate-spin').exists()).toBe(true)
    wrapper.unmount()
  })
})
