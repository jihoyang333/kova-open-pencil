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
let ProductReferenceChipRow: any

beforeAll(async () => {
  ProductReferenceChipRow = (await import('@/components/chat/ProductReferenceChipRow.vue')).default
})

const makeRef = (id: string) => ({
  product_id: id, title: `Product ${id}`, primary_image_url: null,
  price_low: '29.00', price_high: null, currency: 'USD',
  handle: `p-${id}`, added_at: '2026-06-20T00:00:00Z'
})

describe('<ProductReferenceChipRow>', () => {
  test('renders no chips when references empty', () => {
    const w = mount(ProductReferenceChipRow, { props: { references: [] } })
    expect(w.findAll('[data-test-id="product-reference-chip"]')).toHaveLength(0)
  })

  test('renders one chip per reference', () => {
    const refs = [makeRef('a'), makeRef('b'), makeRef('c')]
    const w = mount(ProductReferenceChipRow, { props: { references: refs } })
    expect(w.findAll('[data-test-id="product-reference-chip"]')).toHaveLength(3)
  })

  test('forwards remove event with productId payload', async () => {
    const refs = [makeRef('a'), makeRef('b')]
    const w = mount(ProductReferenceChipRow, { props: { references: refs } })
    const removeButtons = w.findAll('[data-test-id="chip-remove"]')
    await removeButtons[0].trigger('click')
    const emitted = w.emitted('remove') as Array<[{ productId: string }]>
    expect(emitted[0][0]).toEqual({ productId: 'a' })
  })
})
