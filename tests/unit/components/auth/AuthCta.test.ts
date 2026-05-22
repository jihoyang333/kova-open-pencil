import { describe, expect, test } from 'bun:test'

import { mount } from '@vue/test-utils'

import AuthCta from '../../../../src/components/auth/AuthCta.vue'

describe('<AuthCta>', () => {
  test('renders label', () => {
    const wrapper = mount(AuthCta, { props: { label: 'Continue with email' } })
    expect(wrapper.text()).toContain('Continue with email')
  })

  test('default type is submit', () => {
    const wrapper = mount(AuthCta, { props: { label: 'x' } })
    expect(wrapper.attributes('type')).toBe('submit')
  })

  test('type="button" passes through', () => {
    const wrapper = mount(AuthCta, { props: { label: 'x', type: 'button' } })
    expect(wrapper.attributes('type')).toBe('button')
  })

  test('emits click when enabled', async () => {
    const wrapper = mount(AuthCta, { props: { label: 'x', type: 'button' } })
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toBeDefined()
  })

  test('does NOT emit click when loading', async () => {
    const wrapper = mount(AuthCta, { props: { label: 'x', type: 'button', loading: true } })
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toBeUndefined()
  })

  test('does NOT emit click when disabled', async () => {
    const wrapper = mount(AuthCta, { props: { label: 'x', type: 'button', disabled: true } })
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toBeUndefined()
  })

  test('loading=true sets disabled attr + shows Loading...', () => {
    const wrapper = mount(AuthCta, { props: { label: 'Submit', loading: true } })
    expect(wrapper.attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('Loading...')
  })

  test('variant=secondary applies secondary class style', () => {
    const wrapper = mount(AuthCta, { props: { label: 'x', variant: 'secondary' } })
    const classes = wrapper.classes().join(' ')
    expect(classes).toContain('border-line')
  })
})
