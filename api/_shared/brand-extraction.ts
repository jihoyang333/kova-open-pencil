/**
 * Pure helper functions for brand extraction.
 * No server-side dependencies — safe to import in tests.
 */

import type { FirecrawlBranding, FirecrawlBrandingImages } from './firecrawl-types'

export type {
  ExtractBrandColors,
  ExtractBrandFonts,
  ExtractBrandResponse,
} from '../../src/types/kova/extraction'

import type { ExtractBrandColors, ExtractBrandFonts } from '../../src/types/kova/extraction'

// ── Pure helpers ──────────────────────────────────────────────────────

export function extractColorsFromBranding(
  branding: FirecrawlBranding | undefined,
): ExtractBrandColors | null {
  const colors = branding?.colors
  if (!colors?.primary) return null

  return {
    primary: colors.primary,
    secondary: colors.textPrimary ?? colors.secondary ?? colors.primary,
    accent: colors.accent ?? colors.link ?? colors.primary,
    background: colors.background ?? '#ffffff',
  }
}

export function extractFontsFromBranding(
  branding: FirecrawlBranding | undefined,
): ExtractBrandFonts {
  // Try typography.fontFamilies first (structured)
  const families = branding?.typography?.fontFamilies
  if (families?.heading || families?.primary) {
    return {
      heading: families.heading ?? families.primary ?? null,
      body: families.primary ?? null,
    }
  }

  // Fall back to fonts[] array (role-annotated)
  const fonts = branding?.fonts
  if (fonts && fonts.length > 0) {
    const heading = fonts.find((f) => f.role === 'heading')?.family ?? null
    const body = fonts.find((f) => f.role === 'body')?.family ?? fonts[0].family ?? null
    return { heading: heading ?? body, body }
  }

  return { heading: null, body: null }
}

export function extractLogoFromBranding(
  images: FirecrawlBrandingImages | undefined,
): string | null {
  if (!images) return null

  // Prefer actual logo URL; skip data: URIs (inline SVG blobs aren't useful)
  if (images.logo && !images.logo.startsWith('data:')) return images.logo

  // ogImage is usually a good fallback (high-res, social-friendly)
  if (images.ogImage) return images.ogImage

  // favicon as last resort
  if (images.favicon) return images.favicon

  return null
}

export function extractLogoFromHtml(html: string, baseUrl: string): string | null {
  const patterns = [
    /property="og:image"\s+content="([^"]+)"/i,
    /content="([^"]+)"\s+property="og:image"/i,
    /rel="apple-touch-icon"[^>]+href="([^"]+)"/i,
    /rel="icon"[^>]+href="([^"]+)"/i,
    /rel="shortcut icon"[^>]+href="([^"]+)"/i,
  ]

  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match?.[1]) {
      const url = match[1]
      if (url.startsWith('http')) return url
      if (url.startsWith('//')) return `https:${url}`
      if (url.startsWith('/')) {
        try {
          const base = new URL(baseUrl)
          return `${base.origin}${url}`
        } catch {
          return null
        }
      }
      return url
    }
  }

  return null
}
