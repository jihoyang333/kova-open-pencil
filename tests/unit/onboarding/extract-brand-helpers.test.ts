import { describe, test, expect } from 'bun:test'

import {
  extractColorsFromBranding,
  extractFontsFromBranding,
  extractLogoFromBranding,
  extractLogoFromHtml,
} from '../../../api/_shared/brand-extraction'
import type { ExtractBrandResponse } from '../../../src/types/kova/extraction'

// ── extractColorsFromBranding ──────────────────────────────────────────

describe('extractColorsFromBranding', () => {
  test('extracts full color set from branding', () => {
    const result = extractColorsFromBranding({
      colors: {
        primary: '#5E6AD2',
        secondary: '#28282C',
        accent: '#FF6B6B',
        background: '#08090A',
        textPrimary: '#D0D6E0',
      },
    })

    expect(result).toEqual({
      primary: '#5E6AD2',
      secondary: '#D0D6E0',
      accent: '#FF6B6B',
      background: '#08090A',
    })
  })

  test('uses textPrimary as secondary when secondary is missing', () => {
    const result = extractColorsFromBranding({
      colors: { primary: '#5E6AD2', textPrimary: '#D0D6E0' },
    })

    expect(result).toEqual({
      primary: '#5E6AD2',
      secondary: '#D0D6E0',
      accent: '#5E6AD2',
      background: '#ffffff',
    })
  })

  test('uses link as accent fallback', () => {
    const result = extractColorsFromBranding({
      colors: { primary: '#5E6AD2', link: '#FF0000' },
    })

    expect(result).toEqual({
      primary: '#5E6AD2',
      secondary: '#5E6AD2',
      accent: '#FF0000',
      background: '#ffffff',
    })
  })

  test('returns null when primary is missing', () => {
    const result = extractColorsFromBranding({
      colors: { accent: '#FF6B6B', background: '#08090A' },
    })

    expect(result).toBeNull()
  })

  test('returns null when colors object is missing', () => {
    expect(extractColorsFromBranding({})).toBeNull()
  })

  test('returns null for undefined branding', () => {
    expect(extractColorsFromBranding(undefined)).toBeNull()
  })
})

// ── extractFontsFromBranding ──────────────────────────────────────────

describe('extractFontsFromBranding', () => {
  test('extracts from typography.fontFamilies', () => {
    const result = extractFontsFromBranding({
      typography: {
        fontFamilies: { primary: 'Inter', heading: 'SF Pro Display' },
      },
    })

    expect(result).toEqual({ heading: 'SF Pro Display', body: 'Inter' })
  })

  test('uses primary for both when heading is missing', () => {
    const result = extractFontsFromBranding({
      typography: { fontFamilies: { primary: 'Inter' } },
    })

    expect(result).toEqual({ heading: 'Inter', body: 'Inter' })
  })

  test('falls back to fonts[] array with roles', () => {
    const result = extractFontsFromBranding({
      fonts: [
        { family: 'Inter', role: 'body' },
        { family: 'SF Pro Display', role: 'heading' },
      ],
    })

    expect(result).toEqual({ heading: 'SF Pro Display', body: 'Inter' })
  })

  test('uses first font as body when no role matches', () => {
    const result = extractFontsFromBranding({
      fonts: [{ family: 'Roboto' }],
    })

    expect(result).toEqual({ heading: 'Roboto', body: 'Roboto' })
  })

  test('prefers typography over fonts array', () => {
    const result = extractFontsFromBranding({
      typography: { fontFamilies: { primary: 'Inter', heading: 'Montserrat' } },
      fonts: [{ family: 'Arial', role: 'body' }],
    })

    expect(result).toEqual({ heading: 'Montserrat', body: 'Inter' })
  })

  test('returns nulls for empty branding', () => {
    expect(extractFontsFromBranding({})).toEqual({ heading: null, body: null })
  })

  test('returns nulls for undefined branding', () => {
    expect(extractFontsFromBranding(undefined)).toEqual({ heading: null, body: null })
  })
})

// ── extractLogoFromBranding ───────────────────────────────────────────

describe('extractLogoFromBranding', () => {
  test('returns logo URL when present', () => {
    const result = extractLogoFromBranding({
      logo: 'https://example.com/logo.png',
      favicon: 'https://example.com/favicon.ico',
    })

    expect(result).toBe('https://example.com/logo.png')
  })

  test('skips data: URI logos and falls back to ogImage', () => {
    const result = extractLogoFromBranding({
      logo: 'data:image/svg+xml;utf8,%3Csvg%3E%3C/svg%3E',
      ogImage: 'https://example.com/og.jpg',
      favicon: 'https://example.com/favicon.ico',
    })

    expect(result).toBe('https://example.com/og.jpg')
  })

  test('falls back to favicon when logo and ogImage are missing', () => {
    const result = extractLogoFromBranding({
      favicon: 'https://example.com/favicon.ico',
    })

    expect(result).toBe('https://example.com/favicon.ico')
  })

  test('returns null for empty images', () => {
    expect(extractLogoFromBranding({})).toBeNull()
  })

  test('returns null for undefined images', () => {
    expect(extractLogoFromBranding(undefined)).toBeNull()
  })
})

// ── extractLogoFromHtml ───────────────────────────────────────────────

describe('extractLogoFromHtml', () => {
  test('extracts og:image', () => {
    const html = '<meta property="og:image" content="https://example.com/og.jpg">'
    expect(extractLogoFromHtml(html, 'https://example.com')).toBe('https://example.com/og.jpg')
  })

  test('extracts og:image with reversed attribute order', () => {
    const html = '<meta content="https://example.com/og.jpg" property="og:image">'
    expect(extractLogoFromHtml(html, 'https://example.com')).toBe('https://example.com/og.jpg')
  })

  test('extracts apple-touch-icon', () => {
    const html = '<link rel="apple-touch-icon" href="https://example.com/touch.png">'
    expect(extractLogoFromHtml(html, 'https://example.com')).toBe(
      'https://example.com/touch.png',
    )
  })

  test('resolves relative URL with leading slash', () => {
    const html = '<link rel="icon" href="/favicon.png">'
    expect(extractLogoFromHtml(html, 'https://example.com/about')).toBe(
      'https://example.com/favicon.png',
    )
  })

  test('resolves protocol-relative URL', () => {
    const html = '<meta property="og:image" content="//cdn.example.com/img.png">'
    expect(extractLogoFromHtml(html, 'https://example.com')).toBe(
      'https://cdn.example.com/img.png',
    )
  })

  test('returns null for HTML with no matching tags', () => {
    expect(extractLogoFromHtml('<html><body>Hello</body></html>', 'https://example.com')).toBeNull()
  })

  test('returns null for empty HTML', () => {
    expect(extractLogoFromHtml('', 'https://example.com')).toBeNull()
  })
})

// ── ExtractBrandResponse type check ─────────────────────────────────

describe('ExtractBrandResponse', () => {
  test('includes writing_style field', () => {
    const response: ExtractBrandResponse = {
      logo_url: null,
      colors: null,
      fonts: { heading: null, body: null },
      writing_style: 'Professional and concise tone.',
    }

    expect(response.writing_style).toBe('Professional and concise tone.')
  })

  test('writing_style can be null', () => {
    const response: ExtractBrandResponse = {
      logo_url: null,
      colors: null,
      fonts: { heading: null, body: null },
      writing_style: null,
    }

    expect(response.writing_style).toBeNull()
  })
})
