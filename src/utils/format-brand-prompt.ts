import type { Brand } from '@/types/kova/database'

/**
 * Formats a brand's profile data into a structured text block
 * for injection into the AI system prompt.
 *
 * Omits sections where values are null/empty.
 * Pure function — no side effects.
 */
export function formatBrandKitPrompt(brand: Brand): string {
  const sections: string[] = [`## Brand Kit: ${brand.name}`]

  if (brand.colors) {
    const { primary, secondary, accent, background } = brand.colors
    const colorEntries = [
      primary && `primary: ${primary}`,
      secondary && `secondary: ${secondary}`,
      accent && `accent: ${accent}`,
      background && `background: ${background}`,
    ].filter(Boolean)
    if (colorEntries.length > 0) {
      sections.push(`**Colors:** ${colorEntries.join(', ')}`)
    }
  }

  if (brand.fonts) {
    const fontEntries = [
      brand.fonts.heading && `heading: ${brand.fonts.heading}`,
      brand.fonts.body && `body: ${brand.fonts.body}`,
    ].filter(Boolean)
    if (fontEntries.length > 0) {
      sections.push(`**Fonts:** ${fontEntries.join(', ')}`)
    }
  }

  if (brand.voice) {
    sections.push(`**Voice:** ${brand.voice}`)
  }

  if (brand.industry) {
    sections.push(`**Industry:** ${brand.industry}`)
  }

  return sections.join('\n')
}
