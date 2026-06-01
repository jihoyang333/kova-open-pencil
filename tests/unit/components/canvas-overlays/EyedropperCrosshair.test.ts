import { describe, expect, it, beforeEach } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { useEyedropperStore } from '@/stores/eyedropper'
import EyedropperCrosshair from '@/components/canvas-overlays/EyedropperCrosshair.vue'

describe('EyedropperCrosshair', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('is hidden when the eyedropper is inactive', () => {
    expect(mount(EyedropperCrosshair).find('[data-test="eyedropper-magnifier"]').exists()).toBe(
      false
    )
  })

  it('shows the magnifier and capture layer when the eyedropper is active', () => {
    const store = useEyedropperStore()
    store.activate(() => {})
    const wrapper = mount(EyedropperCrosshair)
    expect(wrapper.find('[data-test="eyedropper-magnifier"]').exists()).toBe(true)
    // capture layer receives the pointer + click (audit C2 — sampling is wired)
    expect(wrapper.find('[data-test="eyedropper-capture"]').exists()).toBe(true)
  })

  it('Escape cancels the active eyedropper', async () => {
    const store = useEyedropperStore()
    mount(EyedropperCrosshair)
    store.activate(() => {})
    await Promise.resolve()
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape' }))
    expect(store.active).toBe(false)
  })
})
