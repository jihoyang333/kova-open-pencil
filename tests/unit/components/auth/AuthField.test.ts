import { describe, expect, test } from 'bun:test'

import { mount } from '@vue/test-utils'

import AuthField from '../../../../src/components/auth/AuthField.vue'

const routerLinkStub = {
  template: '<a :href="to"><slot /></a>',
  props: ['to']
}

const mountField = (props: Record<string, unknown> = {}) =>
  mount(AuthField, {
    props: { label: 'Email', modelValue: '', ...props },
    global: { stubs: { RouterLink: routerLinkStub } }
  })

describe('<AuthField>', () => {
  test('renders label text', () => {
    expect(mountField().text()).toContain('Email')
  })

  test('renders <input> with type=text by default', () => {
    const wrapper = mountField()
    expect(wrapper.find('input').attributes('type')).toBe('text')
  })

  test('forwards type prop to <input>', () => {
    const wrapper = mountField({ type: 'email' })
    expect(wrapper.find('input').attributes('type')).toBe('email')
  })

  test('shows placeholder', () => {
    const wrapper = mountField({ placeholder: 'you@example.com' })
    expect(wrapper.find('input').attributes('placeholder')).toBe('you@example.com')
  })

  test('emits update:modelValue when typing', async () => {
    const wrapper = mountField()
    await wrapper.find('input').setValue('a@b.co')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['a@b.co'])
  })

  test('emits submit on Enter keydown', async () => {
    const wrapper = mountField()
    await wrapper.find('input').trigger('keydown', { code: 'Enter', key: 'Enter' })
    expect(wrapper.emitted('submit')).toBeDefined()
  })

  test('emits submit on NumpadEnter keydown', async () => {
    const wrapper = mountField()
    await wrapper.find('input').trigger('keydown', { code: 'NumpadEnter', key: 'Enter' })
    expect(wrapper.emitted('submit')).toBeDefined()
  })

  test('does NOT emit submit on non-Enter keys', async () => {
    const wrapper = mountField()
    await wrapper.find('input').trigger('keydown', { code: 'KeyA', key: 'a' })
    expect(wrapper.emitted('submit')).toBeUndefined()
  })

  test('shows error message and sets aria-invalid', () => {
    const wrapper = mountField({ error: 'Enter your email' })
    expect(wrapper.text()).toContain('Enter your email')
    expect(wrapper.find('input').attributes('aria-invalid')).toBe('true')
  })

  test('label is associated to input via for/id', () => {
    const wrapper = mountField()
    const inputId = wrapper.find('input').attributes('id')
    expect(inputId).toBeDefined()
    expect(wrapper.find('label').attributes('for')).toBe(inputId)
  })

  test('helpLink renders router link with label and href', () => {
    const wrapper = mountField({ helpLink: { label: 'Forgot password?', to: '/forgot' } })
    expect(wrapper.find('a[href="/forgot"]').exists()).toBe(true)
    expect(wrapper.find('a[href="/forgot"]').text()).toBe('Forgot password?')
  })
})
