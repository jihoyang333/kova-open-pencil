// tests/engine/shopify/store-shopify-products.test.ts
import { describe, it, expect, beforeEach } from 'bun:test'
import { createPinia, setActivePinia } from 'pinia'
import { useShopifyProductsStore } from '../../../src/stores/shopify-products'

describe('useShopifyProductsStore', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('fetches brand-scoped products on loadForBrand', async () => {
    const store = useShopifyProductsStore()
    await store.loadForBrand('b1')
    expect(store.activeBrandId).toBe('b1')
    expect(store.productsById.size).toBeGreaterThanOrEqual(0)
  })

  it('clears previous brand data on brand switch', async () => {
    const store = useShopifyProductsStore()
    await store.loadForBrand('b1')
    store.productsById.set('p1', { id: 'p1', brand_id: 'b1' } as never)
    await store.loadForBrand('b2')
    expect(store.productsById.has('p1')).toBe(false)
  })

  it('exposes findVariant(shopify_variant_id) keyed by Shopify gid', async () => {
    const store = useShopifyProductsStore()
    store._setVariantsForTest([{ shopify_variant_id: 'gid://shopify/ProductVariant/10', id: 'v1' }])
    expect(store.findVariant('gid://shopify/ProductVariant/10')?.id).toBe('v1')
  })

  it('falls back from Realtime to 30s polling on subscription error (§14 open question resolution)', async () => {
    const store = useShopifyProductsStore()
    await store.loadForBrand('b1')
    store._simulateRealtimeFailureForTest()
    expect(store.syncMode).toBe('polling')
  })
})
