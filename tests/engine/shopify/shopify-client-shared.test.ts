import { describe, expect, mock, test } from 'bun:test'

// Clear any module-level mocks registered by other test files (e.g. oauth-start
// mocks the whole shopify-client module) before importing the real implementation.
mock.restore()

const { normalizeShopDomain, probeShopExists } = await import(
  '../../../api/_shared/shopify-client'
)

describe('normalizeShopDomain', () => {
  test('accepts a valid myshopify domain', () => {
    expect(normalizeShopDomain('foo.myshopify.com')).toBe('foo.myshopify.com')
  })

  test('strips https scheme and path', () => {
    expect(normalizeShopDomain('https://foo.myshopify.com/admin')).toBe('foo.myshopify.com')
  })

  test('lowercases mixed-case input', () => {
    expect(normalizeShopDomain('FOO.MyShopify.COM')).toBe('foo.myshopify.com')
  })

  test('rejects non-myshopify domains', () => {
    expect(normalizeShopDomain('example.com')).toBeNull()
  })

  test('rejects empty input', () => {
    expect(normalizeShopDomain('')).toBeNull()
  })
})

describe('probeShopExists', () => {
  test('returns true on 200', async () => {
    const fetchFn = mock(() => Promise.resolve(new Response(null, { status: 200 })))
    expect(await probeShopExists('foo.myshopify.com', fetchFn as typeof fetch)).toBe(true)
  })

  test('returns true on 401 (shop exists, unauthenticated)', async () => {
    const fetchFn = mock(() => Promise.resolve(new Response(null, { status: 401 })))
    expect(await probeShopExists('foo.myshopify.com', fetchFn as typeof fetch)).toBe(true)
  })

  test('returns false on 404', async () => {
    const fetchFn = mock(() => Promise.resolve(new Response(null, { status: 404 })))
    expect(await probeShopExists('missing.myshopify.com', fetchFn as typeof fetch)).toBe(false)
  })

  test('returns false when fetch throws', async () => {
    const fetchFn = (() => Promise.reject(new Error('network'))) as typeof fetch
    expect(await probeShopExists('foo.myshopify.com', fetchFn)).toBe(false)
  })
})
