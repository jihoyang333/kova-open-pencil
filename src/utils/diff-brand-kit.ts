import type { ShopifyBrandKit } from '@/stores/brands'

export interface KitDiffRow {
  key: keyof ShopifyBrandKit
  label: string
  current: string | undefined
  proposed: string
  selected: boolean
}

const KIT_FIELD_LABELS: Record<keyof ShopifyBrandKit, string> = {
  primaryColor: 'Primary color',
  secondaryColor: 'Secondary color',
  headingFont: 'Heading font',
  bodyFont: 'Body font',
  logoUrl: 'Logo',
} as const

export function diffBrandKits(
  current: Readonly<ShopifyBrandKit>,
  proposed: Readonly<ShopifyBrandKit>
): KitDiffRow[] {
  return (Object.keys(KIT_FIELD_LABELS) as Array<keyof ShopifyBrandKit>).flatMap((key) => {
    const proposedVal = proposed[key]
    if (proposedVal === undefined) return []
    if (current[key] === proposedVal) return []
    return [
      {
        key,
        label: KIT_FIELD_LABELS[key],
        current: current[key],
        proposed: proposedVal,
        selected: true,
      },
    ]
  })
}

export function applySelection(rows: readonly KitDiffRow[]): ShopifyBrandKit {
  const kit: ShopifyBrandKit = {}
  for (const row of rows) {
    if (row.selected) {
      ;(kit as Record<string, string>)[row.key] = row.proposed
    }
  }
  return kit
}
