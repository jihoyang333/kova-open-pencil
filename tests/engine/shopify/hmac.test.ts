import { describe, it, expect } from 'bun:test'
import { verifyShopifyHmac } from '../../../api/_shared/shopify-hmac'
import { createHmac } from 'node:crypto'

const secret = 'test-secret'
const body = JSON.stringify({ hello: 'world' })
const sig = createHmac('sha256', secret).update(body).digest('base64')

describe('verifyShopifyHmac', () => {
  it('accepts a valid signature', async () => {
    expect(await verifyShopifyHmac(body, sig, secret)).toBe(true)
  })

  it('rejects a tampered body', async () => {
    expect(await verifyShopifyHmac(body + '!', sig, secret)).toBe(false)
  })

  it('rejects a wrong signature', async () => {
    expect(await verifyShopifyHmac(body, 'aaaa', secret)).toBe(false)
  })

  it('uses timing-safe comparison', async () => {
    expect(await verifyShopifyHmac(body, 'x'.repeat(sig.length), secret)).toBe(false)
    expect(await verifyShopifyHmac(body, 'y'.repeat(sig.length), secret)).toBe(false)
  })

  it('rejects empty signature', async () => {
    expect(await verifyShopifyHmac(body, '', secret)).toBe(false)
  })

  it('rejects empty secret', async () => {
    expect(await verifyShopifyHmac(body, sig, '')).toBe(false)
  })
})
