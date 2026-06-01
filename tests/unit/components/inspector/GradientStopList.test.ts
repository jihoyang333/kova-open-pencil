import { describe, expect, it } from 'bun:test'
import { mount } from '@vue/test-utils'
import GradientStopList from '@/components/inspector/GradientStopList.vue'

describe('GradientStopList', () => {
  const baseStops = [
    { position: 0, color: { r: 0, g: 0, b: 0, a: 1 } },
    { position: 0.5, color: { r: 1, g: 1, b: 0, a: 1 } },
    { position: 1, color: { r: 1, g: 1, b: 1, a: 1 } }
  ]

  it('renders one row per stop', () => {
    const wrapper = mount(GradientStopList, { props: { stops: baseStops, selectedIndex: 0 } })
    expect(wrapper.findAll('[data-test="stop-row"]')).toHaveLength(3)
  })

  it('hides remove button on outer stops (0%, 100%)', () => {
    const wrapper = mount(GradientStopList, { props: { stops: baseStops, selectedIndex: 0 } })
    const removeButtons = wrapper.findAll('[data-test="stop-remove"]')
    expect(removeButtons[0].element.style.visibility).toBe('hidden')
    expect(removeButtons[2].element.style.visibility).toBe('hidden')
  })

  it('shows remove button on intermediate stops', () => {
    const wrapper = mount(GradientStopList, { props: { stops: baseStops, selectedIndex: 1 } })
    const removeButtons = wrapper.findAll('[data-test="stop-remove"]')
    expect(removeButtons[1].element.style.visibility).not.toBe('hidden')
  })

  it('emits add when "Add stop" clicked', async () => {
    const wrapper = mount(GradientStopList, { props: { stops: baseStops, selectedIndex: 0 } })
    await wrapper.find('[data-test="add-stop"]').trigger('click')
    expect(wrapper.emitted('add')).toBeTruthy()
  })

  it('emits update:selectedIndex on row click and remove on × click', async () => {
    const wrapper = mount(GradientStopList, { props: { stops: baseStops, selectedIndex: 0 } })
    await wrapper.findAll('[data-test="stop-row"]')[1].trigger('click')
    expect(wrapper.emitted('update:selectedIndex')![0]).toEqual([1])
    await wrapper.findAll('[data-test="stop-remove"]')[1].trigger('click')
    expect(wrapper.emitted('remove')![0]).toEqual([1])
  })
})
