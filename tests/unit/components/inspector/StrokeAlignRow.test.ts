import { describe, expect, it } from 'bun:test'
import { mount } from '@vue/test-utils'
import StrokeAlignRow from '@/components/inspector/StrokeAlignRow.vue'

describe('StrokeAlignRow', () => {
  it('renders INSIDE / CENTER / OUTSIDE buttons', () => {
    const wrapper = mount(StrokeAlignRow, { props: { modelValue: 'INSIDE' } })
    expect(wrapper.findAll('button')).toHaveLength(3)
  })

  it('marks the active button for the current modelValue', () => {
    const wrapper = mount(StrokeAlignRow, { props: { modelValue: 'OUTSIDE' } })
    expect(wrapper.find('button[aria-pressed="true"]').attributes('title')).toBe('Outside')
  })

  it('emits update:modelValue on click', async () => {
    const wrapper = mount(StrokeAlignRow, { props: { modelValue: 'INSIDE' } })
    await wrapper.findAll('button')[1].trigger('click')
    expect(wrapper.emitted('update:modelValue')![0]).toEqual(['CENTER'])
  })
})
