import { describe, expect, test } from 'bun:test'
import { mount } from '@vue/test-utils'
import KovaToggle from '@/components/ui/KovaToggle.vue'

describe('<KovaToggle>', () => {
  test('renders with aria-checked false by default', () => {
    const wrapper = mount(KovaToggle, { props: { modelValue: false } })
    const btn = wrapper.find('button')
    expect(btn.attributes('role')).toBe('switch')
    expect(btn.attributes('aria-checked')).toBe('false')
    expect(btn.classes()).not.toContain('on')
  })

  test('reflects modelValue=true via on class + aria-checked=true', () => {
    const wrapper = mount(KovaToggle, { props: { modelValue: true } })
    const btn = wrapper.find('button')
    expect(btn.attributes('aria-checked')).toBe('true')
    expect(btn.classes()).toContain('on')
  })

  test('click emits update:modelValue with toggled value', async () => {
    const wrapper = mount(KovaToggle, { props: { modelValue: false } })
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([true])
  })

  test('Space key toggles', async () => {
    const wrapper = mount(KovaToggle, { props: { modelValue: false } })
    await wrapper.find('button').trigger('keydown', { code: 'Space' })
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([true])
  })

  test('disabled blocks toggle', async () => {
    const wrapper = mount(KovaToggle, { props: { modelValue: false, disabled: true } })
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  test('aria-label forwarded', () => {
    const wrapper = mount(KovaToggle, {
      props: { modelValue: false, ariaLabel: 'High contrast' },
    })
    expect(wrapper.find('button').attributes('aria-label')).toBe('High contrast')
  })
})
