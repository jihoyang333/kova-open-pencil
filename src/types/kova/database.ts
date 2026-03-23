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
