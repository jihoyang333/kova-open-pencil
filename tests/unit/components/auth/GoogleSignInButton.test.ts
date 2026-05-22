import { beforeEach, describe, expect, mock, test } from 'bun:test'

import { mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'

// W8a Cluster 01 — GoogleSignInButton wrapper (Plan 01 Task 9 / amendment §3.3).

const isStarting = ref(false)
const start = mock(
  async (): Promise<{ ok: true } | { ok: false; reason: string }> => ({
    ok: true
  })
)

mock.module('@/composables/auth/use-google-oauth', () => ({
  useGoogleOAuth: () => ({ start, isStarting })
}))

const { default: GoogleSignInButton } =
  await import('../../../../src/components/auth/GoogleSignInButton.vue')

describe('<GoogleSignInButton> wrapper', () => {
  beforeEach(() => {
    isStarting.value = false
    start.mockClear()
    start.mockImplementation(async () => ({ ok: true }))
  })

  test('renders KovaGoogleSignInButton with mode="signin"', () => {
    const wrapper = mount(GoogleSignInButton, { props: { mode: 'signin' } })
    expect(wrapper.text()).toContain('Continue with Google')
  })

  test('renders KovaGoogleSignInButton with mode="signup"', () => {
    const wrapper = mount(GoogleSignInButton, { props: { mode: 'signup' } })
    expect(wrapper.text()).toContain('Sign up with Google')
  })

  test('clicking the button calls useGoogleOAuth().start()', async () => {
    const wrapper = mount(GoogleSignInButton, { props: { mode: 'signin' } })
    await wrapper.find('button').trigger('click')
    await nextTick()
    expect(start).toHaveBeenCalledTimes(1)
  })

  test('does NOT emit oauth-error when start succeeds', async () => {
    const wrapper = mount(GoogleSignInButton, { props: { mode: 'signin' } })
    await wrapper.find('button').trigger('click')
    await nextTick()
    expect(wrapper.emitted('oauth-error')).toBeUndefined()
  })

  test('emits oauth-error with reason when start fails', async () => {
    start.mockImplementationOnce(async () => ({ ok: false, reason: 'oauth_init_failed' }))
    const wrapper = mount(GoogleSignInButton, { props: { mode: 'signin' } })
    await wrapper.find('button').trigger('click')
    await nextTick()
    expect(wrapper.emitted('oauth-error')).toBeDefined()
    expect(wrapper.emitted('oauth-error')?.[0]).toEqual(['oauth_init_failed'])
  })

  test('button is disabled while isStarting is true', async () => {
    isStarting.value = true
    const wrapper = mount(GoogleSignInButton, { props: { mode: 'signin' } })
    await nextTick()
    expect(wrapper.find('button').attributes('disabled')).toBeDefined()
  })

  test('button is enabled while isStarting is false', () => {
    const wrapper = mount(GoogleSignInButton, { props: { mode: 'signin' } })
    expect(wrapper.find('button').attributes('disabled')).toBeUndefined()
  })

  test('forwards theme prop to KovaGoogleSignInButton', () => {
    const wrapper = mount(GoogleSignInButton, { props: { mode: 'signin', theme: 'dark' } })
    expect(wrapper.find('button').classes()).toContain('google-signin--dark')
  })
})
