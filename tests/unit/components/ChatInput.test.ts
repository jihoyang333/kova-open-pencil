import { beforeAll, describe, expect, mock, test } from 'bun:test'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

mock.module('@/components/ui/kova-icon-registry', () => {
  const stub = (name: string) =>
    defineComponent({
      name: `IconStub-${name}`,
      setup(_, { attrs }) {
        return () => h('svg', { ...attrs, 'data-icon': name })
      },
    })
  return {
    KOVA_ICON_REGISTRY: new Map<string, ReturnType<typeof stub>>(),
    KOVA_ICON_SIZE_PX: { xs: 12, sm: 14, md: 16, lg: 20 } as const,
  }
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let ChatInput: any

beforeAll(async () => {
  ChatInput = (await import('@/components/chat/ChatInput.vue')).default
})

const makeRef = (id: string) => ({
  product_id: id, title: `Product ${id}`, primary_image_url: null,
  price_low: '29.00', price_high: null, currency: 'USD',
  handle: `p-${id}`, added_at: '2026-06-20T00:00:00Z'
})

describe('<ChatInput> productReferences prop', () => {
  test('renders chip row when references provided', () => {
    const w = mount(ChatInput, {
      props: { status: 'ready', productReferences: [makeRef('a'), makeRef('b')] }
    })
    expect(w.find('[data-test-id="product-reference-chip-row"]').exists()).toBe(true)
    expect(w.findAll('[data-test-id="product-reference-chip"]')).toHaveLength(2)
  })

  test('does not render chip row when references empty', () => {
    const w = mount(ChatInput, {
      props: { status: 'ready', productReferences: [] }
    })
    expect(w.find('[data-test-id="product-reference-chip-row"]').exists()).toBe(false)
  })

  test('emits remove-reference event with productId', async () => {
    const w = mount(ChatInput, {
      props: { status: 'ready', productReferences: [makeRef('a')] }
    })
    await w.find('[data-test-id="chip-remove"]').trigger('click')
    const emitted = w.emitted('remove-reference') as Array<[{ productId: string }]>
    expect(emitted[0][0]).toEqual({ productId: 'a' })
  })

  // Founder-locked §12.12 item 7 — composer-footer vertical order:
  // image attachments → product chips → textarea → send.
  test('chip row sits below attachment thumbnails and above textarea (DOM order)', () => {
    const w = mount(ChatInput, {
      props: {
        status: 'ready',
        productReferences: [makeRef('a')],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        attachments: [{ id: 'att1', localPreviewUrl: 'blob:x', fileName: 'a.jpg', isUploading: false }] as any
      }
    })
    const html = w.html()
    const attachmentsIdx = html.indexOf('data-test-id="chat-attachment-thumbnail"')
    const chipsIdx = html.indexOf('data-test-id="product-reference-chip-row"')
    const textareaIdx = html.indexOf('<textarea')
    expect(attachmentsIdx).toBeGreaterThan(-1)
    expect(chipsIdx).toBeGreaterThan(-1)
    expect(textareaIdx).toBeGreaterThan(-1)
    expect(attachmentsIdx).toBeLessThan(chipsIdx)
    expect(chipsIdx).toBeLessThan(textareaIdx)
  })
})
