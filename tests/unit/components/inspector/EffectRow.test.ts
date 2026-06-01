import { describe, expect, it, mock } from 'bun:test'
import { mount } from '@vue/test-utils'
import type { Effect } from '@open-pencil/core'

// KovaIcon registry resolves ~icons/lucide/* (unavailable under bun test). Mock the
// module before importing EffectRow so the registry never loads.
mock.module('@/components/ui/KovaIcon.vue', () => ({
  default: { name: 'KovaIcon', template: '<span class="kova-icon-stub" />' }
}))

const { default: EffectRow } = await import('@/components/inspector/EffectRow.vue')

const dropShadow: Effect = {
  type: 'DROP_SHADOW',
  color: { r: 0, g: 0, b: 0, a: 0.25 },
  offset: { x: 0, y: 4 },
  radius: 12,
  spread: 0,
  visible: true
}

function mountRow(effect: Effect = dropShadow) {
  return mount(EffectRow, { props: { effect, index: 0, isSelected: false } })
}

describe('EffectRow', () => {
  it('renders the effect type label', () => {
    expect(mountRow().text()).toContain('Drop shadow')
  })

  it('renders the shadow meta as "X Y Blur"', () => {
    expect(mountRow().text()).toContain('0 4 12')
  })

  it('emits select on row click', async () => {
    const wrapper = mountRow()
    await wrapper.trigger('click')
    expect(wrapper.emitted('select')).toBeTruthy()
  })

  it('emits toggle-visibility when the eye is clicked', async () => {
    const wrapper = mountRow()
    await wrapper.find('[data-test="visibility-toggle"]').trigger('click')
    expect(wrapper.emitted('toggle-visibility')).toBeTruthy()
  })

  it('emits delete when × is clicked', async () => {
    const wrapper = mountRow()
    await wrapper.find('[data-test="delete-effect"]').trigger('click')
    expect(wrapper.emitted('delete')).toBeTruthy()
  })
})
