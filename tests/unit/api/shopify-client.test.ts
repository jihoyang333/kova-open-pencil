import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import {
  normalizeShopDomain,
  probeShopExists,
  SHOPIFY_API_VERSION,
  SHOPIFY_SCOPES,
} from '../../../api/_shared/shopify-client'

const originalFetch = globalThis.fetch

describe('normalizeShopDomain', () => {
  test('accepts a valid myshopify domain', () => {
    expect(normalizeShopDomain('foo.myshopify.com')).toBe('foo.myshopify.com')
  })

  test('lowercases mixed-case input', () => {
    expect(normalizeShopDomain('FooBar.MyShopify.COM')).toBe(
      'foobar.myshopify.com'
    )
  })

  test('trims whitespace', () => {
    expect(normalizeShopDomain('  foo.myshopify.com  ')).toBe(
      'foo.myshopify.com'
    )
  })

  test('strips https scheme and path', () => {
    expect(normalizeShopDomain('https://foo.myshopify.com/admin')).toBe(
      'foo.myshopify.com'
    )
  })

  test('strips http scheme', () => {
    expect(normalizeShopDomain('http://foo.myshopify.com')).toBe(
      'foo.myshopify.com'
    )
  })

  test('accepts domains with hyphens and digits', () => {
    expect(normalizeShopDomain('shop-123.myshopify.com')).toBe(
      'shop-123.myshopify.com'
    )
  })

  test('rejects non-myshopify domains', () => {
    expect(normalizeShopDomain('example.com')).toBeNull()
  })

  test('rejects empty input', () => {
    expect(normalizeShopDomain('')).toBeNull()
  })

  test('rejects domains with injected characters', () => {
    expect(normalizeShopDomain('<evil>.myshopify.com')).toBeNull()
  })

  test('rejects domains starting with a hyphen', () => {
    expect(normalizeShopDomain('-bad.myshopify.com')).toBeNull()
  })

  test('rejects subdomains under myshopify', () => {
    expect(normalizeShopDomain('foo.bar.myshopify.com')).toBeNull()
  })
})

describe('probeShopExists', () => {
  beforeEach(() => {
    globalThis.fetch = originalFetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  test('returns true on 401 (shop exists, unauthenticated)', async () => {
    const fetchMock = mock(() => Promise.resolve(new Response(null, { status: 401 })))
    globalThis.fetch = fetchMock as unknown as typeof fetch
    expect(await probeShopExists('foo.myshopify.com')).toBe(true)
  })

  test('returns true on 403', async () => {
    const fetchMock = mock(() => Promise.resolve(new Response(null, { status: 403 })))
    globalThis.fetch = fetchMock as unknown as typeof fetch
    expect(await probeShopExists('foo.myshopify.com')).toBe(true)
  })

  test('returns true on 200', async () => {
    const fetchMock = mock(() => Promise.resolve(new Response(null, { status: 200 })))
    globalThis.fetch = fetchMock as unknown as typeof fetch
    expect(await probeShopExists('foo.myshopify.com')).toBe(true)
  })

  test('returns false on 404', async () => {
    const fetchMock = mock(() => Promise.resolve(new Response(null, { status: 404 })))
    globalThis.fetch = fetchMock as unknown as typeof fetch
    expect(await probeShopExists('missing.myshopify.com')).toBe(false)
  })

  test('returns false when fetch throws', async () => {
    globalThis.fetch = (() => Promise.reject(new Error('network'))) as typeof fetch
    expect(await probeShopExists('foo.myshopify.com')).toBe(false)
  })

  test('calls the admin shop.json endpoint with current API version via HEAD', async () => {
    const fetchMock = mock(() => Promise.resolve(new Response(null, { status: 401 })))
    globalThis.fetch = fetchMock as unknown as typeof fetch
    await probeShopExists('foo.myshopify.com')
    const call = fetchMock.mock.calls[0]
    expect(call?.[0]).toBe(
      `https://foo.myshopify.com/admin/api/${SHOPIFY_API_VERSION}/shop.json`
    )
    expect((call?.[1] as RequestInit | undefined)?.method).toBe('HEAD')
  })
})

describe('SHOPIFY_SCOPES', () => {
  test('includes read_products scope', () => {
    expect(SHOPIFY_SCOPES).toContain('read_products')
  })

  test('includes read_themes scope', () => {
    expect(SHOPIFY_SCOPES).toContain('read_themes')
  })

  test('scopes are comma-separated without spaces', () => {
    expect(SHOPIFY_SCOPES).not.toContain(' ')
    expect(SHOPIFY_SCOPES.split(',').length).toBeGreaterThan(1)
  })
})

describe('SHOPIFY_API_VERSION', () => {
  test('matches YYYY-MM format', () => {
    expect(SHOPIFY_API_VERSION).toMatch(/^\d{4}-\d{2}$/)
  })
})
