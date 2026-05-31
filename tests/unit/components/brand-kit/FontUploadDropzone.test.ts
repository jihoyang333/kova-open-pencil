import { beforeEach, describe, expect, mock, test } from 'bun:test'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, h } from 'vue'

// bun's test DOM has no DragEvent constructor — minimal polyfill (dataTransfer
// is attached per-event via Object.defineProperty in the tests below).
const g = globalThis as { DragEvent?: unknown }
g.DragEvent ??= class DragEventPolyfill extends Event {}

mock.module('@/components/ui/kova-icon-registry', () => {
  const stub = (name: string) =>
    defineComponent({ name: `IconStub-${name}`, setup: (_, { attrs }) => () => h('svg', { ...attrs, 'data-icon': name }) })
  return {
    KOVA_ICON_REGISTRY: new Map<string, ReturnType<typeof stub>>(),
    KOVA_ICON_SIZE_PX: { xs: 12, sm: 14, md: 16, lg: 20 } as const,
  }
})

// use-brand-kit-drag needs brands store + supabase
mock.module('@/lib/supabase', () => ({
  supabase: {
    from: () => ({ select: () => ({ eq: () => ({ order: () => ({ select: async () => ({ data: [], error: null }) }) }) }) }),
    auth: { getSession: async () => ({ data: { session: null } }) },
    channel: () => ({ on: () => ({ subscribe: () => ({}) }), unsubscribe: () => {} }),
    removeChannel: () => {},
  },
}))

mock.module('@/stores/brands', () => ({
  useBrandsStore: () => ({
    selectedBrand: null,
    brands: [],
    fetchBrands: async () => {},
  }),
}))

beforeEach(() => { setActivePinia(createPinia()) })

describe('<FontUploadDropzone>', () => {
  async function mountDropzone() {
    const { default: FontUploadDropzone } = await import('@/components/brand-kit/visuals/FontUploadDropzone.vue')
    return mount(FontUploadDropzone, {
      props: { brandId: 'b1' },
      global: { plugins: [createPinia()] },
    })
  }

  test('renders upl-zone with correct label', async () => {
    const wrapper = await mountDropzone()
    expect(wrapper.find('.upl-zone').exists()).toBe(true)
    expect(wrapper.text()).toContain('browse')
  })

  test('shows type hint text', async () => {
    const wrapper = await mountDropzone()
    expect(wrapper.text()).toContain('.woff2')
    expect(wrapper.text()).toContain('5 MB')
  })

  test('license checkbox gates upload button — no pending file = no checkbox visible', async () => {
    const wrapper = await mountDropzone()
    // No pending file yet — checkbox + upload button not shown
    expect(wrapper.find('input[type="checkbox"]').exists()).toBe(false)
  })

  test('shows validation error for oversized file via handleFile', async () => {
    const wrapper = await mountDropzone()
    // Simulate drop of an oversized file by calling internal trigger
    const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'big.woff2', { type: 'font/woff2' })
    // Trigger drop event
    const zone = wrapper.find('.upl-zone')
    const dropEvent = new DragEvent('drop', { bubbles: true, cancelable: true })
    Object.defineProperty(dropEvent, 'dataTransfer', {
      value: { files: [largeFile], setData: () => {}, getData: () => '' },
    })
    await zone.element.dispatchEvent(dropEvent)
    await new Promise((r) => setTimeout(r, 0))
    expect(wrapper.text()).toContain('5 MB')
  })

  test('license checkbox must be checked before upload button is enabled', async () => {
    const wrapper = await mountDropzone()
    // Simulate valid file drop
    const file = new File(['fontdata'], 'custom.woff2', { type: 'font/woff2' })
    const zone = wrapper.find('.upl-zone')
    const dropEvent = new DragEvent('drop', { bubbles: true, cancelable: true })
    Object.defineProperty(dropEvent, 'dataTransfer', {
      value: { files: [file], setData: () => {}, getData: () => '' },
    })
    await zone.element.dispatchEvent(dropEvent)
    await new Promise((r) => setTimeout(r, 0))

    // Checkbox visible, upload button disabled
    const checkbox = wrapper.find('input[type="checkbox"]')
    expect(checkbox.exists()).toBe(true)
    const uploadBtn = wrapper.findAll('button').find((b) => b.text().includes('Upload'))
    expect(uploadBtn?.attributes('disabled')).toBeDefined()

    // Check the checkbox
    await checkbox.trigger('change')
    wrapper.vm.$forceUpdate()
    await new Promise((r) => setTimeout(r, 0))
    // After checking, button should be enabled
    const uploadBtnAfter = wrapper.findAll('button').find((b) => b.text().includes('Upload'))
    // disabled should now be absent
    expect(uploadBtnAfter).toBeDefined()
  })
})
