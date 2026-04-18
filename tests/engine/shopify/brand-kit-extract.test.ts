import { describe, expect, it } from 'bun:test'
import { extractBrandKitFromThemeSettings } from '../../../api/_shared/shopify-brand-kit'
import fixture from './fixtures/theme-settings-dawn.json'

describe('extractBrandKitFromThemeSettings', () => {
  it('pulls primary + secondary colors from current settings block', () => {
    const kit = extractBrandKitFromThemeSettings(fixture)
    expect(kit.primaryColor).toMatch(/^#[0-9a-f]{6}$/i)
    expect(kit.secondaryColor).toMatch(/^#[0-9a-f]{6}$/i)
  })

  it('pulls heading + body font names', () => {
    const kit = extractBrandKitFromThemeSettings(fixture)
    expect(kit.headingFont).toBeTruthy()
    expect(kit.bodyFont).toBeTruthy()
  })

  it('pulls logo_url when present', () => {
    const kit = extractBrandKitFromThemeSettings(fixture)
    expect(kit.logoUrl).toMatch(/^https?:\/\//)
  })

  it('returns partial kit with only populated fields (no crash) on sparse theme', () => {
    const kit = extractBrandKitFromThemeSettings({ current: {} })
    expect(kit).toEqual({})
  })
})
