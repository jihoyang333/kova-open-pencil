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

  it('shows the magnifier when the eyedropper is active', () => {
    const store = useEyedropperStore()
    store.activate(() => {})
    expect(mount(EyedropperCrosshair).find('[data-test="eyedropper-magnifier"]').exists()).toBe(
      true
    )
  })
})
