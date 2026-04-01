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

const isNeutral = (hex: string): boolean => /^#(0{3,6}|f{3,6})$/i.test(hex)

export function extractColorsFromBranding(
  branding: FirecrawlBranding | undefined,
): ExtractBrandColors | null {
  const colors = branding?.colors
  if (!colors?.primary) return null

  // When Firecrawl reports a neutral primary (black/white), it's usually the
  // text color — not the brand identity color. Prefer accent or link if they
  // are more distinctive.
  let primary = colors.primary
  if (isNeutral(primary)) {
    const candidates = [colors.accent, colors.link].filter(
      (c): c is string => typeof c === 'string' && !isNeutral(c),
    )
    if (candidates.length > 0) primary = candidates[0]
  }

  return {
    primary,
    secondary: colors.textPrimary ?? colors.secondary ?? primary,
    accent: colors.accent ?? colors.link ?? primary,
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
