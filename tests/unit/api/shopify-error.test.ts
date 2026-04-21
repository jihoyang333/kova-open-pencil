import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { logShopifyError } from '../../../api/_shared/shopify-error'

describe('logShopifyError', () => {
  const captured: unknown[][] = []
  const originalError = console.error

  beforeEach(() => {
    captured.length = 0
    console.error = (...args: unknown[]) => {
      captured.push(args)
    }
  })

  afterEach(() => {
    console.error = originalError
  })

  test('includes m9.shopify tag in log output', () => {
    logShopifyError(new Error('oops'), { brand_id: 'brand-1' })
    expect(JSON.stringify(captured)).toContain('m9.shopify')
  })

  test('includes brand_id in log output', () => {
    logShopifyError(new Error('oops'), { brand_id: 'brand-abc' })
    expect(JSON.stringify(captured)).toContain('brand-abc')
  })

  test('includes shop_domain when provided', () => {
    logShopifyError(new Error('oops'), {
      brand_id: 'brand-1',
      shop_domain: 'myshop.myshopify.com',
    })
    expect(JSON.stringify(captured)).toContain('myshop.myshopify.com')
  })

  test('omits shop_domain key when not provided', () => {
    logShopifyError(new Error('oops'), { brand_id: 'brand-1' })
    const output = JSON.stringify(captured[0])
    expect(output).not.toContain('shop_domain')
  })

  test('logs the error message', () => {
    logShopifyError(new Error('something went wrong'), { brand_id: 'brand-1' })
    expect(JSON.stringify(captured)).toContain('something went wrong')
  })

  test('handles non-Error thrown values', () => {
    logShopifyError('string error', { brand_id: 'brand-1' })
    expect(JSON.stringify(captured)).toContain('string error')
  })

  test('never includes access_token in log output', () => {
    logShopifyError(new Error('token expired'), {
      brand_id: 'brand-1',
      shop_domain: 'shop.myshopify.com',
    })
    expect(JSON.stringify(captured)).not.toContain('access_token')
  })

  test('never includes customer_id in log output', () => {
    logShopifyError(new Error('customer error'), {
      brand_id: 'brand-1',
      shop_domain: 'shop.myshopify.com',
    })
    expect(JSON.stringify(captured)).not.toContain('customer_id')
  })
})
