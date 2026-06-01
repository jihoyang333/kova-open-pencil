import { describe, expect, it } from 'bun:test'
import { mount } from '@vue/test-utils'
import JpgQualityDropdown from '@/components/inspector/JpgQualityDropdown.vue'
import AppSelect from '@/components/AppSelect.vue'

// Built on AppSelect (Reka Select) to match the codebase convention (ExportSection,
// CLAUDE.md "Check Reka UI first"), not a native <select>. We assert against the
// options AppSelect receives rather than DOM <option> elements (portaled/lazy).
describe('JpgQualityDropdown', () => {
  it('passes 3 quality options to AppSelect', () => {
    const wrapper = mount(JpgQualityDropdown, { props: { modelValue: 'high' } })
    expect(wrapper.findComponent(AppSelect).props('options')).toHaveLength(3)
  })

  it('shows the quality value next to each label', () => {
    const wrapper = mount(JpgQualityDropdown, { props: { modelValue: 'high' } })
    const labels = wrapper
      .findComponent(AppSelect)
      .props('options')
      .map((o: { label: string }) => o.label)
      .join(' ')
    expect(labels).toContain('0.92')
    expect(labels).toContain('0.80')
    expect(labels).toContain('0.65')
  })

  it('re-emits update:modelValue when AppSelect changes', () => {
    const wrapper = mount(JpgQualityDropdown, { props: { modelValue: 'high' } })
    wrapper.findComponent(AppSelect).vm.$emit('update:modelValue', 'low')
    expect(wrapper.emitted('update:modelValue')![0]).toEqual(['low'])
  })
})
