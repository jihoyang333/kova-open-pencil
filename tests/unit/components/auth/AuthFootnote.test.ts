import { describe, expect, test } from 'bun:test'

import { mount } from '@vue/test-utils'

import AuthFootnote from '../../../../src/components/auth/AuthFootnote.vue'

const routerLinkStub = {
  template: '<a :href="to"><slot /></a>',
  props: ['to']
}

const mountIt = (mode: 'signin' | 'signup') =>
  mount(AuthFootnote, {
    props: { mode },
    global: { stubs: { RouterLink: routerLinkStub } }
  })

describe('<AuthFootnote>', () => {
  test('mode=signin → "No account?" + link to /signup', () => {
    const wrapper = mountIt('signin')
    expect(wrapper.text()).toContain('No account?')
    expect(wrapper.find('a[href="/signup"]').exists()).toBe(true)
  })

  test('mode=signup → "Already have an account?" + link to /login', () => {
    const wrapper = mountIt('signup')
    expect(wrapper.text()).toContain('Already have an account?')
    expect(wrapper.find('a[href="/login"]').exists()).toBe(true)
  })
})
