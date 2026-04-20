import { describe, it, expect, beforeAll, beforeEach, mock } from 'bun:test'
import { createPinia, setActivePinia } from 'pinia'

type CreateProductVariantFrame = typeof import('../../../src/canvas-extensions/product-variant/factory')['createProductVariantFrame']
type UseProductVariantBindingsStore = typeof import('../../../src/stores/product-variant-bindings')['useProductVariantBindingsStore']

let createProductVariantFrame: CreateProductVariantFrame
let useProductVariantBindingsStore: UseProductVariantBindingsStore

let nodeCounter = 0

const variant = {
  id: 'v1', product_id: 'p1',
  shopify_variant_id: 'gid://shopify/ProductVariant/10',
  title: 'Medium', price: 19.99, inventory_qty: 42, available: true,
  image_url: 'https://cdn/img.jpg',
}

const BRAND_ID = '00000000-0000-0000-0000-000000000001'

describe('createProductVariantFrame', () => {
  beforeAll(async () => {
    mock.module('@/engine/tool-calls', () => ({
      createNode: () => Promise.resolve(`node-${++nodeCounter}`),
      setLayout: () => Promise.resolve(),
      setText: () => Promise.resolve(),
      setImage: () => Promise.resolve(),
      setFill: () => Promise.resolve(),
    }))
    const factoryMod = await import('../../../src/canvas-extensions/product-variant/factory')
    const storeMod = await import('../../../src/stores/product-variant-bindings')
    createProductVariantFrame = factoryMod.createProductVariantFrame
    useProductVariantBindingsStore = storeMod.useProductVariantBindingsStore
  })

  beforeEach(() => setActivePinia(createPinia()))

  it('creates a frame, image child, title text child, price text child', async () => {
    const { frame_id, child_ids } = await createProductVariantFrame({ variant, brand_id: BRAND_ID })
    expect(frame_id).toMatch(/^[a-z0-9-]+$/i)
    expect(child_ids.image_node_id).toBeTruthy()
    expect(child_ids.title_node_id).toBeTruthy()
    expect(child_ids.price_node_id).toBeTruthy()
  })

  it('registers a binding with default live bindings and snapshot', async () => {
    const { frame_id } = await createProductVariantFrame({ variant, brand_id: BRAND_ID })
    const binding = useProductVariantBindingsStore().get(frame_id)
    expect(binding).toBeDefined()
    expect(binding?.bindings.price).toBe('live')
    expect(binding?.snapshot?.price).toBe(19.99)
  })
})
