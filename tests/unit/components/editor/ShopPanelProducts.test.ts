/**
 * ShopPanelProducts — Cluster 06 Task 12 tests (reworked per Shopify spec §4.1).
 *
 * Validates the product-reference model: product-level rows with price range,
 * whole-card multi-select, sort, search, and the "Import N to chat" flow that
 * emits selected products and clears selection. Drag-place affordances must be
 * gone (no draggable cards).
 */
import { describe, test, expect, beforeEach, mock } from 'bun:test'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, reactive } from 'vue'

mock.module('@/components/ui/KovaIcon.vue', () => ({
  default: defineComponent({
    name: 'KovaIconStub',
    props: { name: String, size: String },
    setup(props) {
      return () => h('span', { 'data-icon': props.name })
    },
  }),
}))

// Fake shopify-products store seeded with two products + variants.
const productsById = new Map<string, { id: string; brand_id: string; title: string; status: string }>([
  ['p1', { id: 'p1', brand_id: 'b1', title: 'Alpha Tee', status: 'active' }],
  ['p2', { id: 'p2', brand_id: 'b1', title: 'Bravo Mug', status: 'active' }],
])
const variantsById = new Map<string, { id: string; product_id: string; price: number; image_url?: string }>([
  ['v1', { id: 'v1', product_id: 'p1', price: 20, image_url: 'http://img/a.png' }],
  ['v2', { id: 'v2', product_id: 'p1', price: 30 }],
  ['v3', { id: 'v3', product_id: 'p2', price: 12 }],
])
const fakeStore = reactive({
  activeBrandId: 'b1',
  productsById,
  variantsById,
  loadForBrand: () => Promise.resolve(),
})
mock.module('@/stores/shopify-products', () => ({
  useShopifyProductsStore: () => fakeStore,
}))

const ShopPanelProducts = (await import('@/components/editor/sidebar/ShopPanelProducts.vue')).default

function mountPanel() {
  return mount(ShopPanelProducts, { props: { brandId: 'b1' } })
}

describe('ShopPanelProducts (reworked)', () => {
  test('lists products (not variants) — one card per product', () => {
    const wrap = mountPanel()
    expect(wrap.findAll('[data-testid="shop-product-card"]')).toHaveLength(2)
  })

  test('shows a price range when a product has varying variant prices', () => {
    const wrap = mountPanel()
    const alpha = wrap.findAll('[data-testid="shop-product-card"]')[0]
    expect(alpha.text()).toContain('Alpha Tee')
    expect(alpha.text()).toContain('$20.00')
    expect(alpha.text()).toContain('$30.00') // range
  })

  test('cards are NOT draggable (drag-place model ripped)', () => {
    const wrap = mountPanel()
    for (const card of wrap.findAll('[data-testid="shop-product-card"]')) {
      expect(card.attributes('draggable')).toBeUndefined()
    }
  })

  test('clicking a card toggles selection (✓ badge + import bar appears)', async () => {
    const wrap = mountPanel()
    expect(wrap.find('[data-testid="shop-import-bar"]').exists()).toBe(false)
    await wrap.findAll('[data-testid="shop-product-card"]')[0].trigger('click')
    expect(wrap.find('[data-testid="shop-product-check"]').exists()).toBe(true)
    expect(wrap.get('[data-testid="shop-import-button"]').text()).toContain('Import 1 to chat')
  })

  test('Import emits selected products then clears selection', async () => {
    const wrap = mountPanel()
    const cards = wrap.findAll('[data-testid="shop-product-card"]')
    await cards[0].trigger('click')
    await cards[1].trigger('click')
    expect(wrap.get('[data-testid="shop-import-button"]').text()).toContain('Import 2 to chat')
    await wrap.get('[data-testid="shop-import-button"]').trigger('click')

    const ev = wrap.emitted('import')
    expect(ev).toHaveLength(1)
    const products = ev?.[0]?.[0] as Array<{ id: string; title: string }>
    expect(products.map((p) => p.id).sort()).toEqual(['p1', 'p2'])
    // selection cleared → import bar gone
    expect(wrap.find('[data-testid="shop-import-bar"]').exists()).toBe(false)
  })

  test('Clear deselects everything', async () => {
    const wrap = mountPanel()
    await wrap.findAll('[data-testid="shop-product-card"]')[0].trigger('click')
    await wrap.get('[data-testid="shop-clear-button"]').trigger('click')
    expect(wrap.find('[data-testid="shop-import-bar"]').exists()).toBe(false)
  })

  test('search filters by product title', async () => {
    const wrap = mountPanel()
    const input = wrap.get('[data-testid="shop-products-search"]')
    await input.setValue('mug')
    // debounced 300ms
    await new Promise((r) => setTimeout(r, 350))
    await flushPromises()
    const cards = wrap.findAll('[data-testid="shop-product-card"]')
    expect(cards).toHaveLength(1)
    expect(cards[0].text()).toContain('Bravo Mug')
  })
})
