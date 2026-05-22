import { afterAll, beforeEach, describe, expect, mock, test } from 'bun:test'

import { mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'

// W8a Cluster 01 — AuthCallbackView (Plan 01 Task 18 + amendment §3.1).
//
// NOTE: This test file calls `mock.module()` for the auth store, vue-router,
// and the supabase client. bun:test mock.module is process-global, so any
// later test file that imports these modules would inherit our mocks. We
// scope the cleanup in afterAll(mock.restore()) to prevent cross-file
// pollution (HANDOFF #5460 + W8a v2 AUDIT L5).

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

let getSessionResult: { data: { session: unknown }; error: unknown } = {
  data: { session: null },
  error: null
}
mock.module('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve(getSessionResult)
    }
  }
}))

const { default: AuthCallbackView } =
  await import('../../../../src/views/auth/AuthCallbackView.vue')

describe('<AuthCallbackView>', () => {
  beforeEach(() => {
    isAuthenticated.value = false
    isOnboarded.value = false
    replace.mockClear()
    getSessionResult = { data: { session: null }, error: null }
  })

  afterAll(() => {
    // Restore process-global mocks so downstream test files don't inherit them.
    mock.restore()
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

  test('routes to /login with session_error reason when getSession returns an error', async () => {
    getSessionResult = { data: { session: null }, error: { message: 'token exchange failed' } }
    const wrapper = mount(AuthCallbackView)
    await nextTick()
    await nextTick()
    expect(replace).toHaveBeenCalledWith({
      path: '/login',
      query: { status: 'callback_failed', reason: 'session_error' }
    })
    wrapper.unmount()
  })

  test('routes to /dashboard when getSession surfaces an existing session immediately', async () => {
    isOnboarded.value = true
    getSessionResult = { data: { session: { user: { id: 'u1' } } }, error: null }
    const wrapper = mount(AuthCallbackView)
    await nextTick()
    await nextTick()
    expect(replace).toHaveBeenCalledWith('/dashboard')
    wrapper.unmount()
  })
})
