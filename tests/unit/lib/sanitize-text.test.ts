import { describe, expect, test } from 'bun:test'

import { sanitizePlainText } from '@/lib/sanitize-text'

// W9b Cluster 03 — client-side sanitizer (B-CRIT14 defense in depth).

describe('sanitizePlainText', () => {
  test('strips HTML tags', () => {
    expect(sanitizePlainText('<script>alert(1)</script>Patagonia')).toBe('alert(1)Patagonia')
    expect(sanitizePlainText('Hi <b>there</b>')).toBe('Hi there')
  })

  test('strips control chars except tab/newline/CR', () => {
    expect(sanitizePlainText('A\x00B\x07C')).toBe('ABC')
    // Tab/newline collapse to single space via whitespace pass
    expect(sanitizePlainText('A\tB\nC')).toBe('A B C')
  })

  test('collapses whitespace runs', () => {
    expect(sanitizePlainText('  Patagonia    Co.   ')).toBe('Patagonia Co.')
  })

  test('preserves unicode names', () => {
    expect(sanitizePlainText('Brüning & Söhne')).toBe('Brüning & Söhne')
  })

  test('empty + whitespace-only', () => {
    expect(sanitizePlainText('')).toBe('')
    expect(sanitizePlainText('   ')).toBe('')
  })

  test('image-tag style XSS attempts', () => {
    expect(sanitizePlainText('<img src=x onerror=alert(1)>Co')).toBe('Co')
    expect(sanitizePlainText('javascript:alert(1)')).toBe('javascript:alert(1)')
    // ^ raw text fine — sanitizeUrl is the boundary for URLs, not plain text
  })
})
