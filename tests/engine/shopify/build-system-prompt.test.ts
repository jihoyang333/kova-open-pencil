import { describe, it, expect } from 'bun:test'
import { buildShopifyContextBlock } from '../../../src/ai/build-system-prompt'

describe('buildShopifyContextBlock', () => {
  it('emits a "not connected" line when no connection row exists', async () => {
    const text = await buildShopifyContextBlock({ brandId: 'b1', hasConnection: false } as never)
    expect(text).toContain('Shopify: not connected')
  })
  it('emits shop domain, currency, timezone, top collections, bestsellers when connected', async () => {
    const text = await buildShopifyContextBlock({
      brandId: 'b1', hasConnection: true,
      conn: { shop_domain: 'foo.myshopify.com', currency: 'USD', timezone: 'America/Los_Angeles' },
      topCollections: [{ title: 'Summer' }], bestsellers: [{ title: 'Tshirt' }],
    } as never)
    expect(text).toContain('foo.myshopify.com')
    expect(text).toContain('USD')
    expect(text).toContain('Summer')
    expect(text).toContain('Tshirt')
  })
})
