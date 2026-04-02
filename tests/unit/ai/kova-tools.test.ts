import { describe, test, expect } from 'bun:test'

describe('placeMediaImage URL validation', () => {
  test('rejects non-Supabase URLs', async () => {
    const { validateImageUrl } = await import('@/ai/kova-tools')
    expect(() => validateImageUrl('https://evil.com/malware.png')).toThrow()
    expect(() => validateImageUrl('https://example.com/img.jpg')).toThrow()
  })

  test('accepts Supabase storage URLs', async () => {
    const { validateImageUrl } = await import('@/ai/kova-tools')
    expect(() =>
      validateImageUrl('https://abc.supabase.co/storage/v1/object/public/media-assets/img.png')
    ).not.toThrow()
  })

  test('rejects javascript: and data: URLs', async () => {
    const { validateImageUrl } = await import('@/ai/kova-tools')
    expect(() => validateImageUrl('javascript:alert(1)')).toThrow()
    expect(() => validateImageUrl('data:image/png;base64,abc')).toThrow()
  })
})
