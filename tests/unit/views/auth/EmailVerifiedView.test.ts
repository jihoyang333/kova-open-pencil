import { beforeEach, describe, expect, mock, test } from 'bun:test'

import { mount, RouterLinkStub } from '@vue/test-utils'
import { ref } from 'vue'

// W8a Cluster 01 — EmailVerifiedView (Plan 01 Task 18 / amendment §7 Phase 9.2).
// Hi-fi: A15.06.

const userEmail = ref<string | null>('jiho@studiocollective.co')
const isOnboarded = ref(false)
const signOut = mock(async () => undefined)
mock.module('@/stores/auth', () => ({
  useAuthStore: () => ({
    get user() {
      return userEmail.value ? { email: userEmail.value } : null
    },
    get isOnboarded() {
      return isOnboarded.value
    },
    signOut
  })
}))

const push = mock(async () => undefined)
mock.module('vue-router', () => ({
  useRoute: () => ({ query: {} }),
  useRouter: () => ({ push }),
  RouterLink: RouterLinkStub,
  createRouter: () => ({}),
  createWebHistory: () => ({}),
  createMemoryHistory: () => ({})
}))

const { default: EmailVerifiedView } =
  await import('../../../../src/views/auth/EmailVerifiedView.vue')

function mountView() {
  return mount(EmailVerifiedView, {
    global: { stubs: { RouterLink: RouterLinkStub } }
  })
}

describe('<EmailVerifiedView>', () => {
  beforeEach(() => {
    userEmail.value = 'jiho@studiocollective.co'
    isOnboarded.value = false
    push.mockClear()
    signOut.mockClear()
  })

  test('renders headline + confirmed email', () => {
    const wrapper = mountView()
    expect(wrapper.text()).toContain("You're signed in")
    expect(wrapper.text()).toContain('jiho@studiocollective.co')
  })

  test('persistent-session toggle is on by default', () => {
    const wrapper = mountView()
    const toggle = wrapper.find('[data-test-id="persistent-session-toggle"]')
    expect(toggle.attributes('aria-checked')).toBe('true')
  })

  test('toggle flips off when clicked', async () => {
    const wrapper = mountView()
    const toggle = wrapper.find('[data-test-id="persistent-session-toggle"]')
    await toggle.trigger('click')
    expect(toggle.attributes('aria-checked')).toBe('false')
  })

  test('primary CTA routes to /onboarding when not onboarded', async () => {
    isOnboarded.value = false
    const wrapper = mountView()
    await wrapper.find('[data-test-id="continue-to-kova"]').trigger('click')
    expect(push).toHaveBeenCalledWith('/onboarding')
  })

  test('primary CTA routes to /dashboard when onboarded', async () => {
    isOnboarded.value = true
    const wrapper = mountView()
    await wrapper.find('[data-test-id="continue-to-kova"]').trigger('click')
    expect(push).toHaveBeenCalledWith('/dashboard')
  })

  test('"Sign out and start over" calls signOut + routes to /login', async () => {
    const wrapper = mountView()
    await wrapper.find('[data-test-id="sign-out-link"]').trigger('click')
    expect(signOut).toHaveBeenCalledTimes(1)
  })

  test('renders in light theme', () => {
    const wrapper = mountView()
    expect(wrapper.find('[data-theme="light"]').exists()).toBe(true)
  })
})
