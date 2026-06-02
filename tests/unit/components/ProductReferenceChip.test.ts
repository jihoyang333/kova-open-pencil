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
let ProductReferenceChip: any

beforeAll(async () => {
  ProductReferenceChip = (await import('@/components/chat/ProductReferenceChip.vue')).default
})

const makeRef = (overrides = {}) => ({
  product_id: 'p1', title: 'Navy Stripe Tee',
  primary_image_url: 'https://cdn.shopify.com/x.jpg',
  price_low: '29.00', price_high: null, currency: 'USD',
  handle: 'navy-stripe-tee', added_at: '2026-06-20T00:00:00Z',
  ...overrides
})

describe('<ProductReferenceChip>', () => {
  test('renders product title', () => {
    const w = mount(ProductReferenceChip, { props: { reference: makeRef() } })
    expect(w.text()).toContain('Navy Stripe Tee')
  })

  test('renders monogram fallback when primary_image_url null', () => {
    const w = mount(ProductReferenceChip, {
      props: { reference: makeRef({ primary_image_url: null }) }
    })
    expect(w.find('[data-test-id="chip-monogram"]').exists()).toBe(true)
    expect(w.find('img').exists()).toBe(false)
  })

  test('emits remove on × click', async () => {
    const w = mount(ProductReferenceChip, { props: { reference: makeRef() } })
    await w.find('[data-test-id="chip-remove"]').trigger('click')
    expect(w.emitted('remove')).toBeTruthy()
  })

  test('truncates long title', () => {
    const w = mount(ProductReferenceChip, {
      props: { reference: makeRef({ title: 'A very long product title that exceeds the limit' }) }
    })
    const titleEl = w.find('[data-test-id="chip-title"]')
    expect(titleEl.classes()).toContain('truncate')
  })

  // Founder-locked §12.12 item 6 — × always visible at opacity-60, full on hover/focus
  test('× button is always visible at opacity-60 (founder-locked accessibility)', () => {
    const w = mount(ProductReferenceChip, { props: { reference: makeRef() } })
    const removeBtn = w.find('[data-test-id="chip-remove"]')
    expect(removeBtn.classes()).toContain('opacity-60')
    expect(removeBtn.classes()).toContain('hover:opacity-100')
  })

  // Founder-locked §12.12 item 4 — chip body click is a no-op (display-only;
  // only × removes). The component binds no body handler, so a body click can
  // never emit `remove`. (A bare DOM `click` surfaces in emitted() only as a
  // test-utils native-event passthrough — not a component behaviour.)
  test('chip body click does NOT emit remove (no-op, display-only)', async () => {
    const w = mount(ProductReferenceChip, { props: { reference: makeRef() } })
    await w.find('[data-test-id="product-reference-chip"]').trigger('click')
    expect(w.emitted('remove')).toBeFalsy()
  })
})
