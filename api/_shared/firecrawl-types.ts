/** Firecrawl v2 branding format response types. */

export interface FirecrawlBrandingColors {
  primary?: string
  secondary?: string
  accent?: string
  background?: string
  textPrimary?: string
  textSecondary?: string
  link?: string
}

export interface FirecrawlBrandingTypography {
  fontFamilies?: { primary?: string; heading?: string; code?: string }
  fontStacks?: Record<string, string[]>
  fontSizes?: Record<string, string>
  fontWeights?: Record<string, number>
}

export interface FirecrawlBrandingFont {
  family: string
  role?: string
}

export interface FirecrawlBrandingImages {
  logo?: string
  favicon?: string
  ogImage?: string
  logoHref?: string
  logoAlt?: string
}

export interface FirecrawlBranding {
  colorScheme?: 'dark' | 'light'
  colors?: FirecrawlBrandingColors
  typography?: FirecrawlBrandingTypography
  fonts?: FirecrawlBrandingFont[]
  images?: FirecrawlBrandingImages
}

export interface FirecrawlScrapeData {
  branding?: FirecrawlBranding
  screenshot?: string
  html?: string
  markdown?: string
}
