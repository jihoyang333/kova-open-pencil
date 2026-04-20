import { describe, test, expect } from 'bun:test'
import { normalizeShopDomain } from '@/utils/shopify-validators'

describe('normalizeShopDomain', () => {
  test('accepts a valid myshopify domain', () => {
    expect(normalizeShopDomain('foo.myshopify.com')).toBe('foo.myshopify.com')
  })

  test('lowercases mixed-case input', () => {
    expect(normalizeShopDomain('FooBar.MyShopify.COM')).toBe('foobar.myshopify.com')
  })

  test('trims whitespace', () => {
    expect(normalizeShopDomain('  foo.myshopify.com  ')).toBe('foo.myshopify.com')
  })

  test('strips https scheme and path', () => {
    expect(normalizeShopDomain('https://foo.myshopify.com/admin')).toBe('foo.myshopify.com')
  })

  test('strips http scheme', () => {
    expect(normalizeShopDomain('http://foo.myshopify.com')).toBe('foo.myshopify.com')
  })

  test('accepts domains with hyphens and digits', () => {
    expect(normalizeShopDomain('shop-123.myshopify.com')).toBe('shop-123.myshopify.com')
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
