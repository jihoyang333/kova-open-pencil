import { describe, it, expect, beforeEach } from 'bun:test'
import { createPinia, setActivePinia } from 'pinia'
import { useProductVariantBindingsStore } from '../../../src/stores/product-variant-bindings'

const BINDING = {
  frame_id: 'frame-1',
  brand_id: '00000000-0000-0000-0000-000000000001',
  shopify_variant_id: 'gid://shopify/ProductVariant/10',
  bindings: { image: 'live' as const, price: 'live' as const, title: 'live' as const, inventory: 'live' as const },
  snapshot: {
    title: 'Medium',
    price: 19.99,
    currency: 'USD',
    image_url: 'https://cdn/img.jpg',
    inventory: 42,
    captured_at: '2026-04-20T00:00:00.000Z',
  },
  child_ids: {
    image_node_id: 'img-1',
    title_node_id: 'txt-1',
    price_node_id: 'price-1',
  },
}

describe('useProductVariantBindingsStore', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('set and get a binding by frame_id', () => {
    const store = useProductVariantBindingsStore()
    store.set(BINDING)
    expect(store.get('frame-1')).toEqual(BINDING)
  })

  it('get returns undefined for unknown frame_id', () => {
    const store = useProductVariantBindingsStore()
    expect(store.get('unknown')).toBeUndefined()
  })

  it('remove deletes a binding', () => {
    const store = useProductVariantBindingsStore()
    store.set(BINDING)
    store.remove('frame-1')
    expect(store.get('frame-1')).toBeUndefined()
    expect(store.byFrameId.size).toBe(0)
  })

  it('forCanvas returns all bindings regardless of canvasId', () => {
    const store = useProductVariantBindingsStore()
    const second = { ...BINDING, frame_id: 'frame-2' }
    store.set(BINDING)
    store.set(second)
    expect(store.forCanvas('any-canvas').length).toBe(2)
  })

  it('hydrate clears existing bindings and loads new ones', () => {
    const store = useProductVariantBindingsStore()
    store.set(BINDING)
    const fresh = { ...BINDING, frame_id: 'frame-fresh' }
    store.hydrate([fresh])
    expect(store.get('frame-1')).toBeUndefined()
    expect(store.get('frame-fresh')).toEqual(fresh)
    expect(store.byFrameId.size).toBe(1)
  })

  it('dehydrate returns all bindings as an array', () => {
    const store = useProductVariantBindingsStore()
    store.set(BINDING)
    const result = store.dehydrate()
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual(BINDING)
  })

  it('set rejects invalid bindings (invalid uuid)', () => {
    const store = useProductVariantBindingsStore()
    const bad = { ...BINDING, brand_id: 'not-a-uuid' }
    expect(() => store.set(bad)).toThrow()
    expect(store.byFrameId.size).toBe(0)
  })

  it('set overwrites existing binding for same frame_id', () => {
    const store = useProductVariantBindingsStore()
    store.set(BINDING)
    const updated = { ...BINDING, bindings: { ...BINDING.bindings, price: 'snapshot' as const } }
    store.set(updated)
    expect(store.get('frame-1')?.bindings.price).toBe('snapshot')
    expect(store.byFrameId.size).toBe(1)
  })
})
