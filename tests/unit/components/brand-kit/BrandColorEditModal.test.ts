import { beforeEach, describe, expect, mock, test } from 'bun:test'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, h } from 'vue'

mock.module('@/components/ui/kova-icon-registry', () => ({
  KOVA_ICON_REGISTRY: new Map(),
  KOVA_ICON_SIZE_PX: { xs: 12, sm: 14, md: 16, lg: 20 } as const,
}))

mock.module('reka-ui', () => ({
  DialogRoot: defineComponent({ name: 'DialogRoot', setup: (_, { slots }) => () => slots.default?.() }),
  DialogTrigger: defineComponent({ name: 'DialogTrigger', setup: (_, { slots }) => () => slots.default?.() }),
  DialogPortal: defineComponent({ name: 'DialogPortal', setup: (_, { slots }) => () => slots.default?.() }),
  DialogOverlay: defineComponent({ name: 'DialogOverlay', setup: () => () => h('div') }),
  DialogContent: defineComponent({ name: 'DialogContent', setup: (_, { slots }) => () => h('div', slots.default?.()) }),
  DialogTitle: defineComponent({ name: 'DialogTitle', setup: (_, { slots }) => () => h('h3', slots.default?.()) }),
  DialogDescription: defineComponent({ name: 'DialogDescription', setup: (_, { slots }) => () => h('p', slots.default?.()) }),
  DialogClose: defineComponent({ name: 'DialogClose', setup: (_, { slots }) => () => h('button', slots.default?.()) }),
}))

beforeEach(() => { setActivePinia(createPinia()) })

describe('<BrandColorEditModal>', () => {
  async function mountModal(props: Record<string, unknown>) {
    const { default: BrandColorEditModal } = await import('@/components/brand-kit/modals/BrandColorEditModal.vue')
    return mount(BrandColorEditModal, {
      props: { open: true, slotLabel: 'Primary', initialHex: '#112233', mode: 'edit', ...props },
      global: { plugins: [createPinia()] },
    })
  }

  test('shows Edit title in edit mode', async () => {
    const wrapper = await mountModal({ mode: 'edit' })
    expect(wrapper.text()).toContain('Edit brand color')
  })

  test('shows Add title in add mode', async () => {
    const wrapper = await mountModal({ mode: 'add', initialHex: '' })
    expect(wrapper.text()).toContain('Add brand color')
  })

  test('renders a native color input', async () => {
    const wrapper = await mountModal({})
    expect(wrapper.find('input[type="color"]').exists()).toBe(true)
  })

  test('Save enabled for a valid initial hex and emits the normalized value', async () => {
    const wrapper = await mountModal({ initialHex: '#abcdef' })
    const saveBtn = wrapper.findAll('button').find((b) => b.text().includes('Save'))
    expect(saveBtn?.attributes('disabled')).toBeUndefined()
    await saveBtn?.trigger('click')
    expect((wrapper.emitted('save') as unknown[][])[0]).toEqual(['#abcdef'])
  })

  test('Save disabled for an invalid hex', async () => {
    const wrapper = await mountModal({ initialHex: 'not-a-color', mode: 'add' })
    const hexInput = wrapper.find('input[type="text"], input:not([type])')
    await hexInput.setValue('nope')
    const saveBtn = wrapper.findAll('button').find((b) => b.text().includes('Save'))
    expect(saveBtn?.attributes('disabled')).toBeDefined()
  })
})
