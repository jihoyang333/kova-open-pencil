import { describe, test, expect } from 'bun:test'
import { isValidUrl, isValidHexColor, normalizeUrl } from '@/utils/onboarding-validators'

describe('isValidUrl', () => {
  test('accepts domain with TLD', () => {
    expect(isValidUrl('example.com')).toBe(true)
  })

  test('accepts full URL with protocol', () => {
    expect(isValidUrl('https://example.com')).toBe(true)
  })

  test('accepts URL with path', () => {
    expect(isValidUrl('https://example.com/about')).toBe(true)
  })

  test('accepts subdomain', () => {
    expect(isValidUrl('www.example.com')).toBe(true)
  })

  test('rejects empty string', () => {
    expect(isValidUrl('')).toBe(false)
  })

  test('rejects single word', () => {
    expect(isValidUrl('hello')).toBe(false)
  })

  test('rejects spaces', () => {
    expect(isValidUrl('hello world.com')).toBe(false)
  })
})

describe('normalizeUrl', () => {
  test('adds https:// to bare domain', () => {
    expect(normalizeUrl('example.com')).toBe('https://example.com')
  })

  test('preserves existing https://', () => {
    expect(normalizeUrl('https://example.com')).toBe('https://example.com')
  })

  test('preserves existing http://', () => {
    expect(normalizeUrl('http://example.com')).toBe('http://example.com')
  })
})

describe('isValidHexColor', () => {
  test('accepts 6-digit hex', () => {
    expect(isValidHexColor('#2563eb')).toBe(true)
  })

  test('accepts 3-digit hex', () => {
    expect(isValidHexColor('#abc')).toBe(true)
  })

  test('accepts uppercase', () => {
    expect(isValidHexColor('#ABCDEF')).toBe(true)
  })

  test('rejects without hash', () => {
    expect(isValidHexColor('2563eb')).toBe(false)
  })

  test('rejects invalid characters', () => {
    expect(isValidHexColor('#xyz123')).toBe(false)
  })

  test('rejects wrong length', () => {
    expect(isValidHexColor('#12345')).toBe(false)
  })
})
