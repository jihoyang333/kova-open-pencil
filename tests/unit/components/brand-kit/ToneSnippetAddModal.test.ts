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

describe('<ToneSnippetAddModal>', () => {
  async function mountModal(open = true) {
    const { default: ToneSnippetAddModal } = await import('@/components/brand-kit/modals/ToneSnippetAddModal.vue')
    return mount(ToneSnippetAddModal, { props: { open }, global: { plugins: [createPinia()] } })
  }

  test('renders title when open', async () => {
    const wrapper = await mountModal()
    expect(wrapper.text()).toContain('Add tone snippet')
  })

  test('Save button disabled when label+content empty', async () => {
    const wrapper = await mountModal()
    const saveBtn = wrapper.findAll('button').find((b) => b.text().includes('Save'))
    expect(saveBtn?.attributes('disabled')).toBeDefined()
  })

  test('Save button enabled after label + content filled', async () => {
    const wrapper = await mountModal()
    const label = wrapper.find('input[type="text"], input:not([type])')
    const textarea = wrapper.find('textarea')
    await label.setValue('My label')
    await textarea.setValue('My content here')
    const saveBtn = wrapper.findAll('button').find((b) => b.text().includes('Save'))
    // disabled attr should be absent (undefined or null)
    expect(saveBtn?.attributes('disabled')).toBeUndefined()
  })

  test('Save button click emits save with trimmed values', async () => {
    const wrapper = await mountModal()
    const inputs = wrapper.findAll('input')
    const textarea = wrapper.find('textarea')
    await inputs[0].setValue('  Welcome opener  ')
    await textarea.setValue('  Hey there.  ')
    const saveBtn = wrapper.findAll('button').find((b) => b.text().includes('Save snippet'))
    await saveBtn?.trigger('click')
    const emitted = wrapper.emitted('save')
    expect(emitted).toBeDefined()
    expect((emitted as unknown[][])[0]).toEqual(['Welcome opener', '', 'Hey there.'])
  })

  test('Cancel emits update:open false', async () => {
    const wrapper = await mountModal()
    const cancelBtn = wrapper.findAll('button').find((b) => b.text() === 'Cancel')
    await cancelBtn?.trigger('click')
    expect(wrapper.emitted('update:open')?.[0]).toEqual([false])
  })
})
