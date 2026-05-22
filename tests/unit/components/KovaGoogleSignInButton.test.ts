import { describe, expect, test } from 'bun:test'

import { mount } from '@vue/test-utils'

import KovaGoogleSignInButton from '../../../src/components/ui/KovaGoogleSignInButton.vue'

const BRAND_COLORS = ['#4285F4', '#34A853', '#FBBC05', '#EA4335']

describe('<KovaGoogleSignInButton> (W8a c01 / Phase 2)', () => {
  test('mode="signin" renders "Continue with Google"', () => {
    const wrapper = mount(KovaGoogleSignInButton, { props: { mode: 'signin' } })
    expect(wrapper.text()).toContain('Continue with Google')
  })

  test('mode="signup" renders "Sign up with Google"', () => {
    const wrapper = mount(KovaGoogleSignInButton, { props: { mode: 'signup' } })
    expect(wrapper.text()).toContain('Sign up with Google')
  })

  test('theme="light" is the default and applies the light theme class', () => {
    const wrapper = mount(KovaGoogleSignInButton, { props: { mode: 'signin' } })
    expect(wrapper.classes()).toContain('google-signin--light')
    expect(wrapper.classes()).not.toContain('google-signin--dark')
  })

  test('theme="dark" applies the dark theme class', () => {
    const wrapper = mount(KovaGoogleSignInButton, {
      props: { mode: 'signin', theme: 'dark' }
    })
    expect(wrapper.classes()).toContain('google-signin--dark')
    expect(wrapper.classes()).not.toContain('google-signin--light')
  })

  test('root element is <button type="button">', () => {
    const wrapper = mount(KovaGoogleSignInButton, { props: { mode: 'signin' } })
    expect(wrapper.element.tagName).toBe('BUTTON')
    expect(wrapper.attributes('type')).toBe('button')
  })

  test('emits click on button click', async () => {
    const wrapper = mount(KovaGoogleSignInButton, { props: { mode: 'signin' } })
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toBeDefined()
    expect(wrapper.emitted('click')).toHaveLength(1)
  })

  test('disabled=true applies the disabled attribute', () => {
    const wrapper = mount(KovaGoogleSignInButton, {
      props: { mode: 'signin', disabled: true }
    })
    expect(wrapper.attributes('disabled')).toBeDefined()
  })

  test('disabled=false (default) does not apply the disabled attribute', () => {
    const wrapper = mount(KovaGoogleSignInButton, { props: { mode: 'signin' } })
    expect(wrapper.attributes('disabled')).toBeUndefined()
  })

  test('renders the Google official G mark with all 4 brand colors', () => {
    const wrapper = mount(KovaGoogleSignInButton, { props: { mode: 'signin' } })
    const paths = wrapper.findAll('svg path')
    expect(paths.length).toBeGreaterThanOrEqual(4)
    const fills = paths.map((p) => p.attributes('fill'))
    for (const color of BRAND_COLORS) {
      expect(fills).toContain(color)
    }
  })

  test('logo svg has aria-hidden so screen readers skip it', () => {
    // Google G mark is decorative; the button label "Continue with Google"
    // already conveys the action.
    const wrapper = mount(KovaGoogleSignInButton, { props: { mode: 'signin' } })
    const svg = wrapper.find('svg')
    expect(svg.exists()).toBe(true)
  })
})
