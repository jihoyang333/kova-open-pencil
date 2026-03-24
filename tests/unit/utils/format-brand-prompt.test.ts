import { describe, test, expect } from 'bun:test'
import { formatBrandKitPrompt } from '@/utils/format-brand-prompt'
import type { Brand } from '@/types/kova/database'

function makeBrand(overrides: Partial<Brand> = {}): Brand {
  return {
    id: 'b1',
    user_id: 'u1',
    name: 'TestBrand',
    colors: { primary: '#FF0000', secondary: '#00FF00', accent: '#0000FF', background: '#FFFFFF' },
    fonts: { heading: 'Montserrat', body: 'Open Sans' },
    logo_url: 'https://example.com/logo.png',
    voice: 'Professional and friendly',
    industry: 'Technology',
    url: 'https://example.com',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('formatBrandKitPrompt', () => {
  test('formats complete brand with all fields', () => {
    const result = formatBrandKitPrompt(makeBrand())

    expect(result).toContain('## Brand Kit: TestBrand')
    expect(result).toContain('primary: #FF0000')
    expect(result).toContain('secondary: #00FF00')
    expect(result).toContain('accent: #0000FF')
    expect(result).toContain('background: #FFFFFF')
    expect(result).toContain('heading: Montserrat')
    expect(result).toContain('body: Open Sans')
    expect(result).toContain('Professional and friendly')
    expect(result).toContain('Technology')
  })

  test('omits colors section when colors is null', () => {
    const result = formatBrandKitPrompt(makeBrand({ colors: null }))

    expect(result).toContain('## Brand Kit: TestBrand')
    expect(result).not.toContain('**Colors:**')
    expect(result).toContain('**Fonts:**')
  })

  test('omits fonts section when fonts is null', () => {
    const result = formatBrandKitPrompt(makeBrand({ fonts: null }))

    expect(result).not.toContain('**Fonts:**')
    expect(result).toContain('**Colors:**')
  })

  test('omits voice section when voice is null', () => {
    const result = formatBrandKitPrompt(makeBrand({ voice: null }))

    expect(result).not.toContain('**Voice:**')
  })

  test('omits industry section when industry is null', () => {
    const result = formatBrandKitPrompt(makeBrand({ industry: null }))

    expect(result).not.toContain('**Industry:**')
  })

  test('does not include logo_url or url in output', () => {
    const result = formatBrandKitPrompt(makeBrand())

    expect(result).not.toContain('https://example.com/logo.png')
    expect(result).not.toContain('https://example.com')
  })

  test('returns only header when all optional fields are null', () => {
    const result = formatBrandKitPrompt(
      makeBrand({ colors: null, fonts: null, voice: null, industry: null })
    )

    expect(result).toBe('## Brand Kit: TestBrand')
  })

  test('omits colors section when all color values are empty strings', () => {
    const result = formatBrandKitPrompt(
      makeBrand({ colors: { primary: '', secondary: '', accent: '', background: '' } })
    )

    expect(result).not.toContain('**Colors:**')
  })

  test('includes only non-empty color values', () => {
    const result = formatBrandKitPrompt(
      makeBrand({ colors: { primary: '#FF0000', secondary: '', accent: '', background: '' } })
    )

    expect(result).toContain('**Colors:** primary: #FF0000')
    expect(result).not.toContain('secondary')
  })

  test('omits fonts section when all font values are empty strings', () => {
    const result = formatBrandKitPrompt(
      makeBrand({ fonts: { heading: '', body: '' } })
    )

    expect(result).not.toContain('**Fonts:**')
  })

  test('includes only non-empty font values', () => {
    const result = formatBrandKitPrompt(
      makeBrand({ fonts: { heading: 'Montserrat', body: '' } })
    )

    expect(result).toContain('**Fonts:** heading: Montserrat')
    expect(result).not.toContain('body')
  })
})
