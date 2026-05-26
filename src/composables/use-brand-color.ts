import type { BrandColor } from '@/types/kova/database'

// W9b Cluster 03 — brand-color helpers (Plan 03 Task 20).
//
// `brands.color` is a stable enum assigned at insert by the create_brand
// RPC. The view layer maps it to the `.k-<tint>` class on the brand glyph.
// This composable centralizes the mapping so we never hand-roll the class
// string in components (refactor-safe: if the palette ever moves to a
// computed class generator, all callers update at once).

export function brandLogoClass(color: BrandColor): string {
  return `bp-card__logo k-${color}`
}

export function brandLogoTintClass(color: BrandColor): string {
  return `k-${color}`
}
