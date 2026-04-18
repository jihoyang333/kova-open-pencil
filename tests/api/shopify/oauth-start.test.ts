import { describe, it, expect } from 'bun:test'
import handler from '../../../api/shopify/oauth/start'

function req(url: string, headers: Record<string, string> = {}): Request {
  return new Request(url, { headers })
}

describe('GET /api/shopify/oauth/start', () => {
  it('rejects invalid shop domain', async () => {
    const res = await handler(
      req('http://local/api/shopify/oauth/start?shop=<evil>&brand_id=x')
    )
    expect(res.status).toBe(400)
  })

  it('rejects when user does not own brand_id', async () => {
    // Mock auth helper to return a user who doesn't own brand_id "b1"
    const res = await handler(
      req(
        'http://local/api/shopify/oauth/start?shop=foo.myshopify.com&brand_id=b1',
        { Authorization: 'Bearer fake-other-user' }
      )
    )
    expect(res.status).toBe(403)
  })

  it('302s to Shopify authorize URL with state param stored', async () => {
    // uses test-only auth bypass that returns an owner of 'b1'
    const res = await handler(
      req(
        'http://local/api/shopify/oauth/start?shop=foo.myshopify.com&brand_id=b1',
        { Authorization: 'Bearer test-owner-of-b1' }
      )
    )
    expect(res.status).toBe(302)
    const loc = res.headers.get('location') ?? ''
    expect(loc).toMatch(/^https:\/\/foo\.myshopify\.com\/admin\/oauth\/authorize/)
    expect(loc).toContain('client_id=')
    expect(loc).toContain('scope=read_products')
    expect(loc).toMatch(/state=[a-f0-9]{64}/)
  })
})
