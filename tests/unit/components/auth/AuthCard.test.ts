import { describe, expect, test } from 'bun:test'

import { mount } from '@vue/test-utils'
import { h } from 'vue'

import AuthCard from '../../../../src/components/auth/AuthCard.vue'

describe('<AuthCard>', () => {
  test('renders default slot content', () => {
    const wrapper = mount(AuthCard, { slots: { default: () => h('p', 'hello') } })
    expect(wrapper.find('p').text()).toBe('hello')
  })

  test('renders <section> as root', () => {
    const wrapper = mount(AuthCard)
    expect(wrapper.element.tagName).toBe('SECTION')
  })

  test('default width is 380px (no wide prop)', () => {
    const wrapper = mount(AuthCard)
    expect(wrapper.classes()).toContain('w-[380px]')
    expect(wrapper.classes()).not.toContain('w-[420px]')
  })

  test('wide=true applies 420px width class', () => {
    const wrapper = mount(AuthCard, { props: { wide: true } })
    expect(wrapper.classes()).toContain('w-[420px]')
    expect(wrapper.classes()).not.toContain('w-[380px]')
  })

  test('footer slot renders inside <footer>', () => {
    const wrapper = mount(AuthCard, {
      slots: { footer: () => h('a', { href: '/x' }, 'foot link') }
    })
    expect(wrapper.find('footer a').text()).toBe('foot link')
  })

  test('omits <footer> when footer slot empty', () => {
    const wrapper = mount(AuthCard)
    expect(wrapper.find('footer').exists()).toBe(false)
  })
})
