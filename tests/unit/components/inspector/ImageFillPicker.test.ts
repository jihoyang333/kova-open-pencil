import { describe, expect, it } from 'bun:test'
import { mount } from '@vue/test-utils'
import type { Fill } from '@open-pencil/core'
import ImageFillPicker from '@/components/inspector/ImageFillPicker.vue'

// Adapted per R2: core `Fill` (type:'IMAGE') uses `imageScaleMode` (+ imageHash /
// imageTransform), not the plan's `scaleMode` / `src` / `tileSize` (which aren't real
// fields). Tile size maps to a uniform `imageTransform` scale.
const base = (scaleMode: Fill['imageScaleMode']): Fill =>
  ({
    type: 'IMAGE',
    color: { r: 0, g: 0, b: 0, a: 1 },
    opacity: 1,
    visible: true,
    imageHash: 'abc',
    imageScaleMode: scaleMode
  }) as Fill

describe('ImageFillPicker', () => {
  it('renders 4 scale-mode tabs (Fill/Fit/Crop/Tile)', () => {
    const wrapper = mount(ImageFillPicker, { props: { modelValue: base('FILL') } })
    expect(wrapper.findAll('[data-test="scale-mode"]')).toHaveLength(4)
  })

  it('marks the active tab for current imageScaleMode', () => {
    const wrapper = mount(ImageFillPicker, { props: { modelValue: base('CROP') } })
    expect(wrapper.find('[data-test="scale-mode"][aria-pressed="true"]').text()).toBe('Crop')
  })

  it('emits update:modelValue with new imageScaleMode on tab click', async () => {
    const wrapper = mount(ImageFillPicker, { props: { modelValue: base('FILL') } })
    await wrapper.findAll('[data-test="scale-mode"]')[3].trigger('click')
    const emitted = wrapper.emitted('update:modelValue')
    expect(emitted).toBeTruthy()
    expect(emitted![0][0]).toMatchObject({ imageScaleMode: 'TILE' })
  })

  it('renders the tile-size slider only in Tile mode', () => {
    expect(
      mount(ImageFillPicker, { props: { modelValue: base('TILE') } })
        .find('[data-test="tile-size-slider"]')
        .exists()
    ).toBe(true)
    expect(
      mount(ImageFillPicker, { props: { modelValue: base('FILL') } })
        .find('[data-test="tile-size-slider"]')
        .exists()
    ).toBe(false)
  })

  it('renders 4 corner handles only in Crop mode', () => {
    expect(
      mount(ImageFillPicker, { props: { modelValue: base('CROP') } }).findAll(
        '[data-test="crop-handle"]'
      )
    ).toHaveLength(4)
    expect(
      mount(ImageFillPicker, { props: { modelValue: base('FILL') } }).findAll(
        '[data-test="crop-handle"]'
      )
    ).toHaveLength(0)
  })
})
