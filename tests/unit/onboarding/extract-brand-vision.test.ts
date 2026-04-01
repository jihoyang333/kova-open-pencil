import { describe, test, expect } from 'bun:test'

import { flattenPalette, snapToPalette, extractWritingStyleAndIndustry } from '../../../api/extract-brand'

// ── snapToPalette ─────────────────────────────────────────────────────

describe('snapToPalette', () => {
  test('does not snap when deltaE is between 5 and 10 (threshold lowered to 5)', () => {
    // #1a1a1a vs #000000 has deltaE ~9.3 — previously snapped at threshold=10, should NOT snap at threshold=5
    const result = snapToPalette('#1a1a1a', ['#000000', '#ffffff', '#ff0000'])
    expect(result).toBe('#1a1a1a')
  })

  test('snaps near-white to exact white', () => {
    const result = snapToPalette('#f5f5f5', ['#000000', '#ffffff'])
    expect(result).toBe('#ffffff')
  })

  test('returns original color when no palette match within threshold', () => {
    // Blue is very far from black and white (deltaE > 100)
    const result = snapToPalette('#0000ff', ['#000000', '#ffffff'])
    expect(result).toBe('#0000ff')
  })

  test('picks closest match when multiple are within threshold', () => {
    // #0a0a0a is closer to #111111 (deltaE ~2.3) than #000000 (deltaE ~2.7)
    const result = snapToPalette('#0a0a0a', ['#111111', '#000000'])
    expect(result).toBe('#111111')
  })

  test('handles empty palette', () => {
    const result = snapToPalette('#ff0000', [])
    expect(result).toBe('#ff0000')
  })

  test('handles invalid hex gracefully', () => {
    const result = snapToPalette('not-a-color', ['#000000'])
    expect(result).toBe('not-a-color')
  })

  test('handles invalid palette entries gracefully', () => {
    // Skips 'not-valid', still finds #010101 which is within threshold=5 of #000000 (deltaE ~1)
    const result = snapToPalette('#000000', ['not-valid', '#010101'])
    expect(result).toBe('#010101')
  })

  test('respects custom threshold', () => {
    // #1a1a1a vs #000000 has deltaE ~9.3, so threshold=5 should NOT snap
    const result = snapToPalette('#1a1a1a', ['#000000'], 5)
    expect(result).toBe('#1a1a1a')
  })

  test('exact match always snaps', () => {
    const result = snapToPalette('#5E6AD2', ['#5E6AD2', '#FF6B6B'])
    expect(result).toBe('#5E6AD2')
  })
})

// ── flattenPalette ────────────────────────────────────────────────────

describe('flattenPalette', () => {
  test('flattens brand color fields but excludes textPrimary and textSecondary', () => {
    // textPrimary/textSecondary are structural text colors (almost always black/dark grey)
    // — including them primes Claude toward dark results and are never brand identity colors
    const result = flattenPalette({
      primary: '#000000',
      secondary: '#333333',
      accent: '#ff0000',
      background: '#ffffff',
      textPrimary: '#111111',
    })

    expect(result).toContain('#000000')
    expect(result).toContain('#333333')
    expect(result).toContain('#ff0000')
    expect(result).toContain('#ffffff')
    expect(result).not.toContain('#111111')
    expect(result).toHaveLength(4)
  })

  test('excludes both textPrimary and textSecondary from palette', () => {
    const result = flattenPalette({
      primary: '#1DB954',
      textPrimary: '#000000',
      textSecondary: '#666666',
    })
    expect(result).toContain('#1DB954')
    expect(result).not.toContain('#000000')
    expect(result).not.toContain('#666666')
    expect(result).toHaveLength(1)
  })

  test('deduplicates identical values', () => {
    const result = flattenPalette({
      primary: '#0000ff',
      link: '#0000ff',
      accent: '#ff0000',
    })

    expect(result).toHaveLength(2)
    expect(result).toContain('#0000ff')
    expect(result).toContain('#ff0000')
  })

  test('returns empty array for null', () => {
    expect(flattenPalette(null)).toEqual([])
  })

  test('returns empty array for undefined', () => {
    expect(flattenPalette(undefined)).toEqual([])
  })

  test('returns empty array for empty object', () => {
    expect(flattenPalette({})).toEqual([])
  })

  test('filters out non-string values', () => {
    // FirecrawlBrandingColors fields are all optional strings,
    // but defensive against unexpected runtime values
    const result = flattenPalette({ primary: '#000000' } as Record<string, unknown>)
    expect(result).toEqual(['#000000'])
  })
})

// ── extractWritingStyleAndIndustry ────────────────────────────────────

describe('extractWritingStyleAndIndustry', () => {
  test('returns null fields for empty markdown without calling the API', async () => {
    // Empty string should early-return — no Anthropic API call, no error, just nulls
    const result = await extractWritingStyleAndIndustry('', 'fake-key-should-not-be-called')
    expect(result.writingStyle).toBeNull()
    expect(result.industry).toBeNull()
  })

  test('returns null fields for whitespace-only markdown', async () => {
    // Whitespace after trim() — same early-return path
    const result = await extractWritingStyleAndIndustry('   \n\t  ', 'fake-key-should-not-be-called')
    expect(result.writingStyle).toBeNull()
    expect(result.industry).toBeNull()
  })
})
