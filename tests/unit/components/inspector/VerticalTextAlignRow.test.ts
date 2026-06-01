import { describe, expect, it } from 'bun:test'
import { mount } from '@vue/test-utils'
import VerticalTextAlignRow from '@/components/inspector/VerticalTextAlignRow.vue'

describe('VerticalTextAlignRow', () => {
  it('renders 3 segmented buttons', () => {
    const wrapper = mount(VerticalTextAlignRow, { props: { modelValue: 'TOP' } })
    expect(wrapper.findAll('button')).toHaveLength(3)
  })

  it('marks the active button for the current modelValue', () => {
    const wrapper = mount(VerticalTextAlignRow, { props: { modelValue: 'CENTER' } })
    const active = wrapper.find('button[aria-pressed="true"]')
    expect(active.attributes('title')).toBe('Middle')
  })

  it('emits update:modelValue on click', async () => {
    const wrapper = mount(VerticalTextAlignRow, { props: { modelValue: 'TOP' } })
    await wrapper.findAll('button')[2].trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')![0]).toEqual(['BOTTOM'])
  })
})
