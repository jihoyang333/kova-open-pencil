// PRD 02 §6.4.3 + Plan T23 — 5 founder-locked composer chip presets.

export interface ComposerPreset {
  id: string
  label: string
  icon: string
  seedText: string
}

export const COMPOSER_PRESETS: readonly ComposerPreset[] = [
  { id: 'sale', label: 'Promote a sale', icon: 'tag', seedText: 'Promote a sale: ' },
  { id: 'product', label: 'Showcase a product', icon: 'package', seedText: 'Showcase a product: ' },
  { id: 'teach', label: 'Teach customers', icon: 'book-open', seedText: 'Teach customers about: ' },
  { id: 'reviews', label: 'Share reviews', icon: 'quote', seedText: 'Share customer reviews: ' },
  { id: 'commun', label: 'Build community', icon: 'users', seedText: 'Build community around: ' },
] as const
