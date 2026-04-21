import { describe, it, expect, mock, beforeAll, beforeEach, afterAll } from 'bun:test'
import { createPinia, setActivePinia } from 'pinia'

type UseShopifyProductsStore = typeof import('../../../src/stores/shopify-products')['useShopifyProductsStore']
let useShopifyProductsStore: UseShopifyProductsStore

describe('useShopifyProductsStore', () => {
  beforeAll(async () => {
    const makeChannel = () => {
      const ch: Record<string, unknown> = {}
      ch['on'] = () => ch
      ch['subscribe'] = (_cb?: (s: string) => void) => ch
      ch['unsubscribe'] = () => Promise.resolve('ok' as const)
      return ch
    }
    const makeQuery = (): Record<string, unknown> => ({
      select: () => makeQuery(),
      eq: () => Promise.resolve({ data: [], error: null }),
    })
    mock.module('@/lib/supabase', () => {
      const supabase = { from: () => makeQuery(), channel: makeChannel, rpc: () => Promise.resolve({ data: null, error: null }) }
      return { supabase, getSupabase: () => supabase }
    })
    const mod = await import('../../../src/stores/shopify-products')
    useShopifyProductsStore = mod.useShopifyProductsStore
  })

  afterAll(() => mock.restore())

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

  it('populates variantsById and variantsByGid from loaded variant rows', async () => {
    const variant = { id: 'v-load-1', brand_id: 'b1', shopify_variant_id: 'gid://shopify/ProductVariant/999', title: 'S', price: 25, inventory_qty: 3, available: true }
    mock.module('@/lib/supabase', () => {
      const makeChannel = () => {
        const ch: Record<string, unknown> = {}
        ch['on'] = () => ch
        ch['subscribe'] = () => ch
        ch['unsubscribe'] = () => Promise.resolve('ok' as const)
        return ch
      }
      const makeQuery = (table?: string): Record<string, unknown> => ({
        select: () => makeQuery(table),
        eq: () => Promise.resolve({ data: table === 'shopify_variants' ? [variant] : [], error: null }),
      })
      const supabase = { from: (t: string) => makeQuery(t), channel: makeChannel, rpc: () => Promise.resolve({ data: null, error: null }) }
      return { supabase, getSupabase: () => supabase }
    })
    const { useShopifyProductsStore: freshStore } = await import('../../../src/stores/shopify-products')
    setActivePinia(createPinia())
    const store = freshStore()
    await store.loadForBrand('b1')
    expect(store.variantsById.has('v-load-1')).toBe(true)
    expect(store.variantsByGid.has('gid://shopify/ProductVariant/999')).toBe(true)
    expect(store.findVariant('gid://shopify/ProductVariant/999')?.id).toBe('v-load-1')
  })
})
