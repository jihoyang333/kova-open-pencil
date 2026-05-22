import { describe, expect, test } from 'bun:test'

import { mount } from '@vue/test-utils'

import AuthHeader from '../../../../src/components/auth/AuthHeader.vue'

const routerLinkStub = {
  template: '<a :href="to"><slot /></a>',
  props: ['to']
}

const mountWithStubs = (props: { mode: 'signin' | 'signup' | 'verified' | 'sent' }) =>
  mount(AuthHeader, {
    props,
    global: { stubs: { RouterLink: routerLinkStub } }
  })

describe('<AuthHeader>', () => {
  test('renders the Kova wordmark', () => {
    const wrapper = mountWithStubs({ mode: 'signin' })
    expect(wrapper.text()).toContain('Kova')
  })

  test('mode="signin" shows "Sign up" corner link to /signup', () => {
    const wrapper = mountWithStubs({ mode: 'signin' })
    const link = wrapper.find('a[href="/signup"]')
    expect(link.exists()).toBe(true)
    expect(link.text()).toMatch(/sign up/i)
  })

  test('mode="signup" shows "Sign in" corner link to /login', () => {
    const wrapper = mountWithStubs({ mode: 'signup' })
    const link = wrapper.find('a[href="/login"]')
    expect(link.exists()).toBe(true)
    expect(link.text()).toMatch(/sign in/i)
  })

  test('mode="verified" hides the corner link', () => {
    const wrapper = mountWithStubs({ mode: 'verified' })
    expect(wrapper.find('a[href="/signup"]').exists()).toBe(false)
    expect(wrapper.find('a[href="/login"]').exists()).toBe(false)
  })

  test('mode="sent" hides the corner link', () => {
    const wrapper = mountWithStubs({ mode: 'sent' })
    expect(wrapper.find('a[href="/signup"]').exists()).toBe(false)
    expect(wrapper.find('a[href="/login"]').exists()).toBe(false)
  })

  test('renders as a <header> element', () => {
    const wrapper = mountWithStubs({ mode: 'signin' })
    expect(wrapper.element.tagName).toBe('HEADER')
  })
})
