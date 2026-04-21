import { describe, expect, test } from 'bun:test'
import { sentryCapture, type SentryLike } from '../../../api/_shared/sentry'

interface MockCall {
  method: 'setTag' | 'captureException'
  args: unknown[]
}

function makeMockClient(): { client: SentryLike; calls: MockCall[] } {
  const calls: MockCall[] = []
  const client: SentryLike = {
    setTag: (key: string, value: string) => {
      calls.push({ method: 'setTag', args: [key, value] })
    },
    captureException: (err: unknown) => {
      calls.push({ method: 'captureException', args: [err] })
    },
  }
  return { client, calls }
}

describe('sentryCapture', () => {
  test('sets m9.shopify service tag', () => {
    const { client, calls } = makeMockClient()
    sentryCapture(new Error('test'), { brand_id: 'brand-1' }, client)
    expect(calls).toContainEqual({ method: 'setTag', args: ['service', 'm9.shopify'] })
  })

  test('sets brand_id tag', () => {
    const { client, calls } = makeMockClient()
    sentryCapture(new Error('test'), { brand_id: 'brand-abc' }, client)
    expect(calls).toContainEqual({ method: 'setTag', args: ['brand_id', 'brand-abc'] })
  })

  test('sets shop_domain tag when provided', () => {
    const { client, calls } = makeMockClient()
    sentryCapture(new Error('test'), { brand_id: 'brand-1', shop_domain: 'myshop.myshopify.com' }, client)
    expect(calls).toContainEqual({ method: 'setTag', args: ['shop_domain', 'myshop.myshopify.com'] })
  })

  test('omits shop_domain tag when not provided', () => {
    const { client, calls } = makeMockClient()
    sentryCapture(new Error('test'), { brand_id: 'brand-1' }, client)
    const shopDomainCall = calls.find((c) => c.method === 'setTag' && c.args[0] === 'shop_domain')
    expect(shopDomainCall).toBeUndefined()
  })

  test('calls captureException with the error', () => {
    const { client, calls } = makeMockClient()
    const err = new Error('boom')
    sentryCapture(err, { brand_id: 'brand-1' }, client)
    expect(calls).toContainEqual({ method: 'captureException', args: [err] })
  })

  test('does nothing when client is null', () => {
    expect(() => sentryCapture(new Error('test'), { brand_id: 'brand-1' }, null)).not.toThrow()
  })

  test('never tags access_token', () => {
    const { client, calls } = makeMockClient()
    sentryCapture(new Error('test'), { brand_id: 'brand-1', shop_domain: 'shop.myshopify.com' }, client)
    const leak = calls.find((c) => c.method === 'setTag' && String(c.args[0]).includes('access_token'))
    expect(leak).toBeUndefined()
  })

  test('never tags customer_id', () => {
    const { client, calls } = makeMockClient()
    sentryCapture(new Error('test'), { brand_id: 'brand-1', shop_domain: 'shop.myshopify.com' }, client)
    const leak = calls.find((c) => c.method === 'setTag' && String(c.args[0]).includes('customer_id'))
    expect(leak).toBeUndefined()
  })
})
