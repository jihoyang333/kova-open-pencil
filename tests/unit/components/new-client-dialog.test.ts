import { describe, test, expect, beforeEach, mock } from 'bun:test'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { setActivePinia, createPinia } from 'pinia'

// Simple passthrough component for Reka UI stubs
const Passthrough = defineComponent({
  inheritAttrs: false,
  setup(_, { slots }) {
    return () => slots.default?.()
  },
})

// Mock stores
const mockCreateBrand = mock(() => Promise.resolve({ id: 'b1', name: 'Test' }))
const mockCreateBrandFull = mock(() => Promise.resolve({ id: 'b2', name: 'Test' }))

mock.module('@/stores/brands', () => ({
  useBrandsStore: () => ({
    createBrand: mockCreateBrand,
    createBrandFull: mockCreateBrandFull,
  }),
}))

mock.module('vue-router', () => ({
  useRouter: () => ({
    push: mock(() => Promise.resolve()),
  }),
}))

mock.module('reka-ui', () => ({
  DialogRoot: Passthrough,
  DialogPortal: Passthrough,
  DialogOverlay: defineComponent({ setup() { return () => h('div') } }),
  DialogContent: Passthrough,
  DialogTitle: Passthrough,
  DialogDescription: Passthrough,
  DialogClose: Passthrough,
}))

mock.module('@/composables/use-toast', () => ({
  toast: { show: mock(() => {}) },
}))

const { default: NewClientDialog } = await import(
  '@/components/dashboard/NewClientDialog.vue'
)

describe('NewClientDialog', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockCreateBrand.mockClear()
    mockCreateBrandFull.mockClear()
  })

  test('create button is disabled when name is empty', () => {
    const wrapper = mount(NewClientDialog, {
      props: { open: true },
    })
    const btn = wrapper.find('[data-test-id="new-client-create"]')
    expect(btn.attributes('disabled')).toBeDefined()
  })

  test('calls createBrand with name only when URL is empty', async () => {
    const wrapper = mount(NewClientDialog, {
      props: { open: true },
    })
    await wrapper.find('[data-test-id="new-client-name"]').setValue('My Brand')
    await wrapper.find('[data-test-id="new-client-create"]').trigger('click')
    expect(mockCreateBrand).toHaveBeenCalledWith('My Brand')
  })

  test('calls createBrandFull with name and URL when URL is provided', async () => {
    const wrapper = mount(NewClientDialog, {
      props: { open: true },
    })
    await wrapper.find('[data-test-id="new-client-name"]').setValue('My Brand')
    await wrapper.find('[data-test-id="new-client-url"]').setValue('https://example.com')
    await wrapper.find('[data-test-id="new-client-create"]').trigger('click')
    expect(mockCreateBrandFull).toHaveBeenCalled()
  })

  test('shows loading state during submission', async () => {
    let resolveCreate: (v: any) => void = () => {}
    mockCreateBrand.mockImplementationOnce(
      () => new Promise((r) => { resolveCreate = r })
    )
    const wrapper = mount(NewClientDialog, {
      props: { open: true },
    })
    await wrapper.find('[data-test-id="new-client-name"]').setValue('My Brand')
    await wrapper.find('[data-test-id="new-client-create"]').trigger('click')
    expect(wrapper.find('[data-test-id="new-client-create"]').attributes('disabled')).toBeDefined()
    resolveCreate({ id: 'b1', name: 'My Brand' })
  })
})
