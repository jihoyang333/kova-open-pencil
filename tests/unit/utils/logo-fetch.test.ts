import { describe, test, expect, afterEach } from 'bun:test'
import { fetchFavicon, normalizeDomain } from '@/utils/logo-fetch'

describe('normalizeDomain', () => {
  test('strips https protocol', () => expect(normalizeDomain('https://nike.com')).toBe('nike.com'))
  test('strips http protocol', () => expect(normalizeDomain('http://nike.com')).toBe('nike.com'))
  test('strips trailing slash', () => expect(normalizeDomain('nike.com/')).toBe('nike.com'))
  test('strips path', () => expect(normalizeDomain('nike.com/products')).toBe('nike.com'))
  test('accepts bare hostname', () => expect(normalizeDomain('nike.com')).toBe('nike.com'))
  test('returns null for empty', () => expect(normalizeDomain('')).toBeNull())
  test('returns null for whitespace', () => expect(normalizeDomain('   ')).toBeNull())
  test('returns null for invalid input', () => expect(normalizeDomain('not a domain')).toBeNull())
  test('returns null for missing tld', () => expect(normalizeDomain('nike')).toBeNull())
  test('preserves subdomain', () => expect(normalizeDomain('shop.nike.com')).toBe('shop.nike.com'))
})

const originalImage = globalThis.Image

afterEach(() => {
  ;(globalThis as { Image: typeof originalImage }).Image = originalImage
})

describe('fetchFavicon', () => {
  test('returns URL string on Image load', async () => {
    class MockImage {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      set src(_v: string) { queueMicrotask(() => this.onload?.()) }
    }
    ;(globalThis as { Image: typeof MockImage }).Image = MockImage
    const result = await fetchFavicon('nike.com')
    expect(result).toBe('https://nike.com/favicon.ico')
  })

  test('returns null on Image error', async () => {
    class MockImage {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      set src(_v: string) { queueMicrotask(() => this.onerror?.()) }
    }
    ;(globalThis as { Image: typeof MockImage }).Image = MockImage
    const result = await fetchFavicon('does-not-exist.example')
    expect(result).toBeNull()
  })

  test('returns null when input is invalid', async () => {
    const result = await fetchFavicon('not a domain')
    expect(result).toBeNull()
  })
})
