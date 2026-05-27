import { describe, expect, test } from 'bun:test'
import { mount } from '@vue/test-utils'

import TypedConfirmField from '@/components/brand/TypedConfirmField.vue'

// W9b Cluster 03 — typed-confirm state transitions (Plan 03 Task 26).

describe('TypedConfirmField', () => {
  test('empty input → state idle, matched false', () => {
    const wrapper = mount(TypedConfirmField, { props: { expected: 'Patagonia', modelValue: '' } })
    const input = wrapper.find('input')
    expect(input.classes()).toContain('idle')
    expect(input.classes()).not.toContain('ok')
  })

  test('partial input → state partial', async () => {
    const wrapper = mount(TypedConfirmField, { props: { expected: 'Patagonia', modelValue: '' } })
    const input = wrapper.find('input')
    await input.setValue('Pat')
    expect(input.classes()).toContain('partial')
  })

  test('full match → state ok + matched event true', async () => {
    const wrapper = mount(TypedConfirmField, { props: { expected: 'Patagonia', modelValue: '' } })
    const input = wrapper.find('input')
    await input.setValue('Patagonia')
    expect(input.classes()).toContain('ok')
    const events = wrapper.emitted('matched')
    expect(events).toBeDefined()
    // Last emission should be true.
    expect(events?.at(-1)).toEqual([true])
  })

  test('case-sensitive mismatch → state partial (not ok)', async () => {
    const wrapper = mount(TypedConfirmField, { props: { expected: 'Patagonia', modelValue: '' } })
    const input = wrapper.find('input')
    await input.setValue('patagonia')
    expect(input.classes()).toContain('partial')
    expect(input.classes()).not.toContain('ok')
  })

  test('emits update:modelValue on input', async () => {
    const wrapper = mount(TypedConfirmField, { props: { expected: 'X', modelValue: '' } })
    await wrapper.find('input').setValue('foo')
    const emitted = wrapper.emitted('update:modelValue')
    expect(emitted).toBeDefined()
    expect(emitted?.at(-1)).toEqual(['foo'])
  })
})
