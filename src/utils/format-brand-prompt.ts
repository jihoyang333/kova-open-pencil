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
    sections.push(
      `**Colors:** primary: ${primary}, secondary: ${secondary}, accent: ${accent}, background: ${background}`
    )
  }

  if (brand.fonts) {
    sections.push(`**Fonts:** heading: ${brand.fonts.heading}, body: ${brand.fonts.body}`)
  }

  if (brand.voice) {
    sections.push(`**Voice:** ${brand.voice}`)
  }

  if (brand.industry) {
    sections.push(`**Industry:** ${brand.industry}`)
  }

  return sections.join('\n')
}
