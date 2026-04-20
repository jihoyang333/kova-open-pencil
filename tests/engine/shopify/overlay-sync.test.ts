import { describe, it, expect, beforeAll, beforeEach, mock } from 'bun:test'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'

type StartProductVariantSync = typeof import('../../../src/canvas-extensions/product-variant/sync')['startProductVariantSync']
type ResetSyncForTest = typeof import('../../../src/canvas-extensions/product-variant/sync')['_resetSyncForTest']
type UseShopifyProductsStore = typeof import('../../../src/stores/shopify-products')['useShopifyProductsStore']
type UseProductVariantBindingsStore = typeof import('../../../src/stores/product-variant-bindings')['useProductVariantBindingsStore']

let startProductVariantSync: StartProductVariantSync
let _resetSyncForTest: ResetSyncForTest
let useShopifyProductsStore: UseShopifyProductsStore
let useProductVariantBindingsStore: UseProductVariantBindingsStore

const mockSetText = mock(() => Promise.resolve())
const mockSetImage = mock(() => Promise.resolve())

const BRAND_ID = '00000000-0000-0000-0000-000000000001'
const GID = 'gid://shopify/ProductVariant/10'

const BINDING = {
  frame_id: 'frame-1',
  brand_id: BRAND_ID,
  shopify_variant_id: GID,
  bindings: { image: 'live' as const, price: 'live' as const, title: 'live' as const, inventory: 'live' as const },
  snapshot: {
    title: 'Medium', price: 19.99, currency: 'USD',
    image_url: 'https://cdn/img.jpg', inventory: 42,
    captured_at: '2026-04-20T00:00:00.000Z',
  },
  child_ids: { image_node_id: 'img-1', title_node_id: 'txt-1', price_node_id: 'price-1' },
}

const makeChannel = () => {
  const ch: Record<string, unknown> = {}
  ch['on'] = () => ch
  ch['subscribe'] = () => ch
  ch['unsubscribe'] = () => Promise.resolve('ok' as const)
  return ch
}
const makeQuery = (): Record<string, unknown> => ({
  select: () => makeQuery(),
  eq: () => Promise.resolve({ data: [], error: null }),
})

describe('startProductVariantSync', () => {
  beforeAll(async () => {
    mock.module('@/lib/supabase', () => ({
      supabase: { from: () => makeQuery(), channel: makeChannel, rpc: () => Promise.resolve({ data: null, error: null }) },
      getSupabase: () => ({ from: () => makeQuery() }),
    }))
    mock.module('@/engine/tool-calls', () => ({
      createNode: () => Promise.resolve('node-1'),
      setLayout: () => Promise.resolve(),
      setText: mockSetText,
      setImage: mockSetImage,
      setFill: () => Promise.resolve(),
    }))
    const syncMod = await import('../../../src/canvas-extensions/product-variant/sync')
    const productsMod = await import('../../../src/stores/shopify-products')
    const bindingsMod = await import('../../../src/stores/product-variant-bindings')
    startProductVariantSync = syncMod.startProductVariantSync
    _resetSyncForTest = syncMod._resetSyncForTest
    useShopifyProductsStore = productsMod.useShopifyProductsStore
    useProductVariantBindingsStore = bindingsMod.useProductVariantBindingsStore
  })

  beforeEach(() => {
    setActivePinia(createPinia())
    _resetSyncForTest()
    mockSetText.mockClear()
    mockSetImage.mockClear()
  })

  it('dispatches setText on title and price nodes when variantsByGid changes', async () => {
    const bindings = useProductVariantBindingsStore()
    const products = useShopifyProductsStore()
    bindings.set(BINDING)
    startProductVariantSync()
    products._setVariantsForTest([{
      id: 'v1', product_id: 'p1', shopify_variant_id: GID,
      title: 'Large', price: 29.99, inventory_qty: 5, available: true, image_url: 'https://cdn/img2.jpg',
    }])
    await nextTick()
    await nextTick()
    expect(mockSetText).toHaveBeenCalledWith('txt-1', 'Large')
    expect(mockSetText).toHaveBeenCalledWith('price-1', expect.stringContaining('29.99'))
  })

  it('dispatches setImage when variant has an image_url', async () => {
    const bindings = useProductVariantBindingsStore()
    const products = useShopifyProductsStore()
    bindings.set(BINDING)
    startProductVariantSync()
    products._setVariantsForTest([{
      id: 'v1', product_id: 'p1', shopify_variant_id: GID,
      title: 'Large', price: 29.99, inventory_qty: 5, available: true, image_url: 'https://cdn/updated.jpg',
    }])
    await nextTick()
    await nextTick()
    expect(mockSetImage).toHaveBeenCalledWith('img-1', 'https://cdn/updated.jpg')
  })

  it('skips setImage when variant has no image_url', async () => {
    const bindings = useProductVariantBindingsStore()
    const products = useShopifyProductsStore()
    bindings.set(BINDING)
    startProductVariantSync()
    products._setVariantsForTest([{
      id: 'v1', product_id: 'p1', shopify_variant_id: GID,
      title: 'Large', price: 29.99, inventory_qty: 5, available: true,
    }])
    await nextTick()
    await nextTick()
    expect(mockSetImage).not.toHaveBeenCalled()
  })

  it('skips updates when no binding matches the variant gid', async () => {
    const products = useShopifyProductsStore()
    startProductVariantSync()
    products._setVariantsForTest([{
      id: 'v99', product_id: 'p1', shopify_variant_id: 'gid://shopify/ProductVariant/999',
      title: 'Unknown', price: 1.00, inventory_qty: 0, available: false,
    }])
    await nextTick()
    await nextTick()
    expect(mockSetText).not.toHaveBeenCalled()
    expect(mockSetImage).not.toHaveBeenCalled()
  })

  it('does not start a second watcher when called again', async () => {
    const bindings = useProductVariantBindingsStore()
    const products = useShopifyProductsStore()
    bindings.set(BINDING)
    startProductVariantSync()
    startProductVariantSync()
    products._setVariantsForTest([{
      id: 'v1', product_id: 'p1', shopify_variant_id: GID,
      title: 'Small', price: 9.99, inventory_qty: 1, available: true,
    }])
    await nextTick()
    await nextTick()
    const titleCalls = mockSetText.mock.calls.filter(([id]) => id === 'txt-1')
    expect(titleCalls.length).toBe(1)
  })
})
