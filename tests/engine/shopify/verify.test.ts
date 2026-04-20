// tests/engine/shopify/verify.test.ts
import { describe, it, expect, beforeEach } from 'bun:test'
import { createPinia, setActivePinia } from 'pinia'
import { verifyProductVariantsOnCanvas } from '../../../src/canvas-extensions/product-variant/verify'
import { useProductVariantBindingsStore } from '../../../src/stores/product-variant-bindings'
import { useShopifyProductsStore } from '../../../src/stores/shopify-products'

function seedBinding(frame_id: string, variant_gid: string): void {
  useProductVariantBindingsStore().set({
    frame_id, brand_id: '00000000-0000-0000-0000-000000000001',
    shopify_variant_id: variant_gid,
    bindings: { image: 'live', price: 'live', title: 'live', inventory: 'live' },
    snapshot: { title: 't', price: 1, currency: 'USD', image_url: '', inventory: 1, captured_at: '' },
    child_ids: { image_node_id: 'i', title_node_id: 't', price_node_id: 'p' },
  })
}

describe('verifyProductVariantsOnCanvas', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('ok when all variants present and in stock', async () => {
    seedBinding('f1', 'gid://shopify/ProductVariant/1')
    useShopifyProductsStore()._setVariantsForTest([
      { id: 'v1', product_id: 'p1', shopify_variant_id: 'gid://shopify/ProductVariant/1', title: 't', price: 1, inventory_qty: 5, available: true } as never,
    ])
    const r = await verifyProductVariantsOnCanvas('c1')
    expect(r.ok).toBe(true)
    expect(r.broken).toHaveLength(0)
    expect(r.oos).toHaveLength(0)
  })

  it('reports broken when variant missing', async () => {
    seedBinding('f1', 'gid://shopify/ProductVariant/999')
    const r = await verifyProductVariantsOnCanvas('c1')
    expect(r.ok).toBe(false)
    expect(r.broken).toHaveLength(1)
  })

  it('reports oos separately by default', async () => {
    seedBinding('f1', 'gid://shopify/ProductVariant/2')
    useShopifyProductsStore()._setVariantsForTest([
      { id: 'v2', product_id: 'p1', shopify_variant_id: 'gid://shopify/ProductVariant/2', title: 't', price: 1, inventory_qty: 0, available: false } as never,
    ])
    const r = await verifyProductVariantsOnCanvas('c1')
    expect(r.ok).toBe(true)
    expect(r.oos).toHaveLength(1)
  })

  it('rolls oos into broken when strictMode', async () => {
    seedBinding('f1', 'gid://shopify/ProductVariant/2')
    useShopifyProductsStore()._setVariantsForTest([
      { id: 'v2', product_id: 'p1', shopify_variant_id: 'gid://shopify/ProductVariant/2', title: 't', price: 1, inventory_qty: 0, available: false } as never,
    ])
    const r = await verifyProductVariantsOnCanvas('c1', { strictMode: true })
    expect(r.ok).toBe(false)
    expect(r.broken).toHaveLength(1)
    expect(r.oos).toHaveLength(0)
  })
})
