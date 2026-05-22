import { describe, expect, test } from 'bun:test'

import { mount } from '@vue/test-utils'

import OtpInput from '../../../../src/components/auth/OtpInput.vue'

describe('<OtpInput>', () => {
  test('renders 6 single-character inputs', () => {
    const wrapper = mount(OtpInput)
    expect(wrapper.findAll('input')).toHaveLength(6)
  })

  test('each input has maxlength=1', () => {
    const wrapper = mount(OtpInput)
    for (const input of wrapper.findAll('input')) {
      expect(input.attributes('maxlength')).toBe('1')
    }
  })

  test('each input has autocomplete="one-time-code"', () => {
    const wrapper = mount(OtpInput)
    for (const input of wrapper.findAll('input')) {
      expect(input.attributes('autocomplete')).toBe('one-time-code')
    }
  })

  test('typing a digit emits update:modelValue', async () => {
    const wrapper = mount(OtpInput)
    await wrapper.findAll('input')[0]!.setValue('1')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['1'])
  })

  test('filling all 6 cells emits complete with the joined code', async () => {
    const wrapper = mount(OtpInput)
    const inputs = wrapper.findAll('input')
    for (let i = 0; i < 6; i++) {
      await inputs[i]!.setValue(String(i + 1))
    }
    expect(wrapper.emitted('complete')).toBeDefined()
    expect(wrapper.emitted('complete')?.at(-1)).toEqual(['123456'])
  })

  test('initial modelValue hydrates the cells', () => {
    const wrapper = mount(OtpInput, { props: { modelValue: '12345' } })
    const values = wrapper.findAll('input').map((i) => (i.element as HTMLInputElement).value)
    expect(values).toEqual(['1', '2', '3', '4', '5', ''])
  })

  test('non-digit input is stripped from emitted modelValue', async () => {
    const wrapper = mount(OtpInput)
    const inputs = wrapper.findAll('input')
    await inputs[0]!.setValue('a')
    const lastEmit = wrapper.emitted('update:modelValue')?.at(-1)
    expect(lastEmit).toEqual([''])
  })

  test('disabled prop disables all cells', () => {
    const wrapper = mount(OtpInput, { props: { disabled: true } })
    for (const input of wrapper.findAll('input')) {
      expect(input.attributes('disabled')).toBeDefined()
    }
  })
})
