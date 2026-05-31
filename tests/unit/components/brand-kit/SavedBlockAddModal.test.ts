import { beforeEach, describe, expect, mock, test } from 'bun:test'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, h } from 'vue'

mock.module('@/components/ui/kova-icon-registry', () => {
  const stub = (name: string) =>
    defineComponent({ name: `IconStub-${name}`, setup: (_, { attrs }) => () => h('svg', { ...attrs, 'data-icon': name }) })
  return {
    KOVA_ICON_REGISTRY: new Map<string, ReturnType<typeof stub>>(),
    KOVA_ICON_SIZE_PX: { xs: 12, sm: 14, md: 16, lg: 20 } as const,
  }
})

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

describe('<SavedBlockAddModal>', () => {
  async function mountModal(open = true) {
    const { default: SavedBlockAddModal } = await import('@/components/brand-kit/modals/SavedBlockAddModal.vue')
    return mount(SavedBlockAddModal, { props: { open }, global: { plugins: [createPinia()] } })
  }

  test('renders title when open', async () => {
    const wrapper = await mountModal()
    expect(wrapper.text()).toContain('Add saved block')
  })

  test('Save button disabled when empty', async () => {
    const wrapper = await mountModal()
    const saveBtn = wrapper.findAll('button').find((b) => b.text().includes('Save'))
    expect(saveBtn?.attributes('disabled')).toBeDefined()
  })

  test('type segmented control renders all 3 options', async () => {
    const wrapper = await mountModal()
    expect(wrapper.text()).toContain('Text')
    expect(wrapper.text()).toContain('CTA')
    expect(wrapper.text()).toContain('Footer')
  })

  test('Save emits correct type value (default: text)', async () => {
    const wrapper = await mountModal()
    const inputs = wrapper.findAll('input')
    const textarea = wrapper.find('textarea')
    await inputs[0].setValue('Footer block')
    await textarea.setValue('© 2026 Acme Co.')
    const saveBtn = wrapper.findAll('button').find((b) => b.text().includes('Save block'))
    await saveBtn?.trigger('click')
    const emitted = wrapper.emitted('save')
    expect(emitted).toBeDefined()
    const [label, , content, type] = (emitted as unknown[][])[0] as [string, string, string, string]
    expect(label).toBe('Footer block')
    expect(content).toBe('© 2026 Acme Co.')
    expect(type).toBe('text') // default
  })

  test('Cancel resets state and emits update:open false', async () => {
    const wrapper = await mountModal()
    const cancelBtn = wrapper.findAll('button').find((b) => b.text() === 'Cancel')
    await cancelBtn?.trigger('click')
    expect(wrapper.emitted('update:open')?.[0]).toEqual([false])
  })
})
