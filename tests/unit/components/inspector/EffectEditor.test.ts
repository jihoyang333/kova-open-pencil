import { describe, expect, it } from 'bun:test'
import { mount } from '@vue/test-utils'
import type { Effect } from '@open-pencil/core'
import EffectEditor from '@/components/inspector/EffectEditor.vue'

const dropShadow: Effect = {
  type: 'DROP_SHADOW',
  color: { r: 0, g: 0, b: 0, a: 0.3 },
  offset: { x: 0, y: 4 },
  radius: 12,
  spread: 0,
  visible: true
}

function mountEditor(effect: Effect = dropShadow) {
  return mount(EffectEditor, { props: { modelValue: effect, index: 0 } })
}

describe('EffectEditor', () => {
  it('renders X / Y / Blur / Spread inputs for a shadow', () => {
    expect(mountEditor().findAll('input[type="number"]')).toHaveLength(4)
  })

  it('emits update:modelValue when blur changes', async () => {
    const wrapper = mountEditor()
    await wrapper.findAll('input[type="number"]')[2].setValue('20')
    const emitted = wrapper.emitted('update:modelValue')
    expect(emitted).toBeTruthy()
    expect((emitted![0][0] as Effect).radius).toBe(20)
  })

  it('renders a Visible checkbox', () => {
    expect(mountEditor().find('input[type="checkbox"]').exists()).toBe(true)
  })

  it('emits delete when the delete button is clicked', async () => {
    const wrapper = mountEditor()
    await wrapper.find('[data-test="delete-effect"]').trigger('click')
    expect(wrapper.emitted('delete')).toBeTruthy()
  })

  it('renders a single Radius input for a blur effect', () => {
    const blur: Effect = { ...dropShadow, type: 'LAYER_BLUR' }
    expect(mountEditor(blur).findAll('input[type="number"]')).toHaveLength(1)
  })
})
