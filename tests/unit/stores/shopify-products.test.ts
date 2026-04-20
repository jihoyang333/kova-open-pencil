import { describe, test, expect, beforeEach, mock } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'

const products = [{ id: 'p1', brand_id: 'b1', handle: 'tee', title: 'Tee', status: 'active' }]
const variants = [{ id: 'v1', product_id: 'p1', shopify_variant_id: 'gid://shopify/ProductVariant/1', title: 'S', price: 25, inventory_qty: 10, available: true }]
const collections = [{ id: 'c1', brand_id: 'b1', title: 'Summer', handle: 'summer', products_count: 1 }]
const discounts = [{ id: 'd1', brand_id: 'b1', code: 'SAVE10', title: '10% off', status: 'active' }]

const mockChannel = {
  on: mock(() => mockChannel),
  subscribe: mock(() => mockChannel),
  unsubscribe: mock(() => Promise.resolve('ok' as const)),
}

const mockFrom = mock((table: string) => {
  const rows: Record<string, unknown[]> = {
    shopify_products: products,
    shopify_variants: variants,
    shopify_collections: collections,
    shopify_discounts: discounts,
  }
  return {
    select: () => ({ eq: () => Promise.resolve({ data: rows[table] ?? [], error: null }) }),
  }
})

mock.module('@/lib/supabase', () => ({
  supabase: {
    from: mockFrom,
    channel: mock(() => mockChannel),
    rpc: mock(() => Promise.resolve({ data: null, error: null })),
  },
}))

const { useShopifyProductsStore } = await import('@/stores/shopify-products')

describe('shopify-products store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockFrom.mockClear()
    mockChannel.on.mockClear()
    mockChannel.subscribe.mockClear()
  })

  test('loadForBrand populates all maps', async () => {
    const store = useShopifyProductsStore()
    await store.loadForBrand('b1')

    expect(store.productsById.size).toBe(1)
    expect(store.productsById.get('p1')?.title).toBe('Tee')
    expect(store.variantsById.size).toBe(1)
    expect(store.variantsByGid.size).toBe(1)
    expect(store.collectionsById.size).toBe(1)
    expect(store.discountsById.size).toBe(1)
    expect(store.activeBrandId).toBe('b1')
  })

  test('loadForBrand resets maps before loading', async () => {
    const store = useShopifyProductsStore()
    store._setVariantsForTest([{ id: 'old', product_id: 'p0', shopify_variant_id: 'gid://old', title: 'Old', price: 0, inventory_qty: 0, available: false }])
    expect(store.variantsById.size).toBe(1)

    await store.loadForBrand('b1')

    expect(store.variantsById.size).toBe(1)
    expect(store.variantsById.has('old')).toBe(false)
  })

  test('findVariant returns variant by shopify GID', async () => {
    const store = useShopifyProductsStore()
    await store.loadForBrand('b1')

    const v = store.findVariant('gid://shopify/ProductVariant/1')
    expect(v?.id).toBe('v1')
    expect(v?.price).toBe(25)
  })

  test('findVariant returns undefined for unknown GID', async () => {
    const store = useShopifyProductsStore()
    expect(store.findVariant('gid://shopify/ProductVariant/999')).toBeUndefined()
  })

  test('_setVariantsForTest populates variantsById and variantsByGid', () => {
    const store = useShopifyProductsStore()
    store._setVariantsForTest([
      { id: 'v2', product_id: 'p1', shopify_variant_id: 'gid://shopify/ProductVariant/2', title: 'M', price: 30, inventory_qty: 5, available: true },
    ])
    expect(store.variantsById.get('v2')?.title).toBe('M')
    expect(store.findVariant('gid://shopify/ProductVariant/2')?.price).toBe(30)
  })

  test('_simulateRealtimeFailureForTest switches syncMode to polling', () => {
    const store = useShopifyProductsStore()
    store.activeBrandId = 'b1'
    expect(store.syncMode).toBe('realtime')

    store._simulateRealtimeFailureForTest()

    expect(store.syncMode).toBe('polling')
  })
})
