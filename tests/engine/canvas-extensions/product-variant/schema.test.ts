import { describe, expect, it } from 'bun:test'
import * as v from 'valibot'
import { ProductVariantBindingSchema } from '../../../../src/canvas-extensions/product-variant/schema'

const validBinding = {
  frame_id: 'frame-abc-123',
  brand_id: '550e8400-e29b-41d4-a716-446655440000',
  shopify_variant_id: 'gid://shopify/ProductVariant/12345',
  bindings: {
    image: 'live' as const,
    price: 'snapshot' as const,
    title: 'live' as const,
    inventory: 'snapshot' as const,
  },
  child_ids: {
    image_node_id: 'node-img-1',
    title_node_id: 'node-title-1',
    price_node_id: 'node-price-1',
  },
}

describe('ProductVariantBindingSchema', () => {
  it('accepts a fully valid binding without snapshot', () => {
    const result = v.safeParse(ProductVariantBindingSchema, validBinding)
    expect(result.success).toBe(true)
  })

  it('accepts a valid binding with snapshot', () => {
    const withSnapshot = {
      ...validBinding,
      snapshot: {
        title: 'Cool T-Shirt',
        price: 29.99,
        currency: 'USD',
        image_url: 'https://cdn.shopify.com/img.jpg',
        inventory: 10,
        captured_at: '2026-04-20T00:00:00Z',
      },
    }
    const result = v.safeParse(ProductVariantBindingSchema, withSnapshot)
    expect(result.success).toBe(true)
  })

  it('rejects when brand_id is not a UUID', () => {
    const result = v.safeParse(ProductVariantBindingSchema, {
      ...validBinding,
      brand_id: 'not-a-uuid',
    })
    expect(result.success).toBe(false)
  })

  it('rejects when frame_id is missing', () => {
    const { frame_id: _, ...rest } = validBinding
    const result = v.safeParse(ProductVariantBindingSchema, rest)
    expect(result.success).toBe(false)
  })

  it('rejects when a binding mode is not live or snapshot', () => {
    const result = v.safeParse(ProductVariantBindingSchema, {
      ...validBinding,
      bindings: { ...validBinding.bindings, image: 'manual' },
    })
    expect(result.success).toBe(false)
  })

  it('rejects when child_ids is missing price_node_id', () => {
    const result = v.safeParse(ProductVariantBindingSchema, {
      ...validBinding,
      child_ids: { image_node_id: 'a', title_node_id: 'b' },
    })
    expect(result.success).toBe(false)
  })

  it('snapshot is optional — omitting it is valid', () => {
    const { snapshot: _snap, ...rest } = { ...validBinding, snapshot: undefined }
    const result = v.safeParse(ProductVariantBindingSchema, rest)
    expect(result.success).toBe(true)
  })
})
