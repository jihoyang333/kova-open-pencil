/**
 * Shared types for the brand extraction API response.
 * Used by both the API handlers (api/) and frontend components (src/).
 */

export interface ExtractBrandColors {
  primary: string
  secondary: string
  accent: string
  background: string
}

export interface ExtractBrandFonts {
  heading: string | null
  body: string | null
}

export interface ExtractBrandResponse {
  logo_url: string | null
  colors: ExtractBrandColors | null
  fonts: ExtractBrandFonts
  writing_style: string | null
}
