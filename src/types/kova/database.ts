export interface BrandColors {
  primary: string
  secondary: string
  accent: string
  background: string
}

export interface BrandFonts {
  heading: string
  body: string
}

export type BrandColor = 'coral' | 'violet' | 'sage' | 'sand' | 'graphite'

export const BRAND_COLOR_PALETTE: readonly BrandColor[] = [
  'coral',
  'violet',
  'sage',
  'sand',
  'graphite',
] as const

export interface Brand {
  id: string
  user_id: string
  name: string
  colors: BrandColors | null
  fonts: BrandFonts | null
  logo_url: string | null
  voice: string | null
  industry: string | null
  url: string | null
  // Cluster 03 lifecycle + display fields (migration 20260607_03_brands_lifecycle).
  archived_at: string | null
  color: BrandColor
  color_assigned_at: string | null
  slug: string | null
  description: string | null
  created_at: string
  updated_at: string
}

export interface Canvas {
  id: string
  brand_id: string
  name: string
  thumbnail_url: string | null
  trashed_at: string | null
  created_at: string
  updated_at: string
}
