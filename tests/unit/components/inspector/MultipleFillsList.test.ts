import { describe, expect, it, mock } from 'bun:test'
import { mount } from '@vue/test-utils'
import type { Fill } from '@open-pencil/core'

// KovaIcon registry resolves ~icons/lucide/* (unavailable under bun test) — mock before import.
mock.module('@/components/ui/KovaIcon.vue', () => ({
  default: { name: 'KovaIcon', template: '<span class="kova-icon-stub" />' }
}))

const { default: MultipleFillsList } = await import('@/components/inspector/MultipleFillsList.vue')

const fills = [
  { type: 'IMAGE', imageScaleMode: 'FILL', imageHash: 'a', visible: true, opacity: 1 },
  { type: 'GRADIENT_LINEAR', gradientStops: [], visible: true, opacity: 0.6 },
  { type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1, a: 1 }, visible: true, opacity: 0.24 }
] as unknown as Fill[]

function mountList(mixed = false) {
  return mount(MultipleFillsList, { props: { fills, mixed } })
}

describe('MultipleFillsList', () => {
  it('renders one row per fill', () => {
    expect(mountList().findAll('[data-test="fill-row"]')).toHaveLength(3)
  })

  it('renders the mixed-state placeholder when mixed=true', () => {
    expect(mountList(true).text()).toContain('Click to enter mixed value')
  })

  it('emits remove with index on per-row × click', async () => {
    const wrapper = mountList()
    await wrapper.findAll('[data-test="fill-remove"]')[1].trigger('click')
    expect(wrapper.emitted('remove')![0]).toEqual([1])
  })

  it('emits add on the "Add fill" button', async () => {
    const wrapper = mountList()
    await wrapper.find('[data-test="add-fill"]').trigger('click')
    expect(wrapper.emitted('add')).toBeTruthy()
  })
})
