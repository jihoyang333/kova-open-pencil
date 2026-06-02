import { describe, expect, test } from 'bun:test'
import type { ChatConversation, ChatProductReference } from '@/types/kova/chat'

describe('ChatProductReference type', () => {
  test('accepts all required fields', () => {
    const ref: ChatProductReference = {
      product_id: 'gid://shopify/Product/1',
      title: 'Navy Stripe Tee',
      primary_image_url: 'https://cdn.shopify.com/x.jpg',
      price_low: '29.00',
      price_high: null,
      currency: 'USD',
      handle: 'navy-stripe-tee',
      added_at: '2026-06-20T00:00:00Z'
    }
    expect(ref.product_id).toBe('gid://shopify/Product/1')
  })

  test('ChatConversation carries product_references array', () => {
    const conv: ChatConversation = {
      id: 'c1', user_id: 'u1', brand_id: 'b1', canvas_id: 'cv1',
      title: null, created_at: '2026-06-20T00:00:00Z', updated_at: '2026-06-20T00:00:00Z',
      product_references: []
    }
    expect(conv.product_references).toEqual([])
  })
})
