import Anthropic from '@anthropic-ai/sdk'
import { differenceCie76, parse as parseColor } from 'culori'

import { authenticateRequest } from './_shared/auth'
import {
  extractColorsFromBranding,
  extractFontsFromBranding,
  extractLogoFromBranding,
  extractLogoFromHtml,
} from './_shared/brand-extraction'
import type { ExtractBrandColors, ExtractBrandResponse } from './_shared/brand-extraction'
import type { FirecrawlBrandingColors, FirecrawlScrapeData } from './_shared/firecrawl-types'
import { validateUrl } from './_shared/url-validation'

export type { ExtractBrandColors, ExtractBrandResponse }

// ── Color helpers ─────────────────────────────────────────────────────

const SNAP_THRESHOLD = 5

/** Snap a hex color to the nearest palette color if deltaE < threshold. */
export function snapToPalette(hex: string, palette: string[], threshold = SNAP_THRESHOLD): string {
  const color = parseColor(hex)
  if (!color) return hex

  const diff = differenceCie76()
  let bestMatch = hex
  let bestDelta = threshold

  for (const candidate of palette) {
    const parsed = parseColor(candidate)
    if (!parsed) continue
    const delta = diff(color, parsed)
    if (delta < bestDelta) {
      bestDelta = delta
      bestMatch = candidate
    }
  }

  return bestMatch
}

/** Flatten FirecrawlBrandingColors into a deduplicated list of hex strings.
 *  Excludes textPrimary and textSecondary — these are structural text colors
 *  (always dark neutrals) and are never brand identity colors. Including them
 *  primes the vision model toward returning dark results for all brands. */
export function flattenPalette(cssColors: FirecrawlBrandingColors | null | undefined): string[] {
  if (!cssColors) return []
  const { textPrimary: _tp, textSecondary: _ts, ...brandColors } = cssColors
  return [...new Set(Object.values(brandColors).filter((v): v is string => typeof v === 'string'))]
}

// ── Vision-based color extraction (primary path) ─────────────────────

async function extractColorsViaVision(
  screenshotUrl: string,
  apiKey: string,
  cssColors?: FirecrawlBrandingColors | null,
): Promise<ExtractBrandColors | null> {
  const paletteHexes = flattenPalette(cssColors)
  const hasPalette = paletteHexes.length > 0

  const client = new Anthropic({ apiKey })

  const response = await client.messages.create(
    {
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'url', url: screenshotUrl } },
            {
              type: 'text',
              text: `Analyze this website screenshot and identify the brand's 4 core visual identity colors.

${hasPalette ? `The following hex colors were found on the site: ${paletteHexes.join(', ')}\nWhen a listed color closely matches what you see visually, use the exact hex from this list.` : ''}

Return ONLY a JSON object:
{"primary":"#hex","secondary":"#hex","accent":"#hex","background":"#hex"}

Rules:
- primary = the brand's most distinctive, recognizable color. Look at the logo, brand mark, and nav bar. Brand colors often appear in logos and CTAs — NOT in large background areas. If the logo or brand mark has a strong color (e.g. green, purple, orange), that IS the primary.
- Avoid returning pure black (#000000) or pure white (#ffffff) as primary unless the brand's logo is literally black or white (e.g. a black Nike swoosh, white Apple logo). Text color is never the brand primary.
- secondary = second most prominent brand color (can be a darker/lighter brand shade, or a complementary color used in headings or section backgrounds)
- accent = a highlight or contrast color used sparingly (CTAs, badges, links) — this is where a single CTA accent color belongs if it differs from primary
- background = main page background color
- For truly monochrome brands where the logo, nav, and hero are all black/white/grey with zero distinctive color anywhere, return those exact neutrals
- ${hasPalette ? 'Prefer exact hex values from the list above when they match what you see' : 'All colors as 6-digit hex with # prefix'}

Return ONLY the JSON, no markdown or explanation.`,
            },
          ],
        },
      ],
    },
    { timeout: 25_000 },
  )

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  console.log('[extract-brand] Vision raw response:', text)

  try {
    const parsed = JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim()) as Record<
      string,
      unknown
    >

    if (typeof parsed.primary !== 'string') return null

    const result: ExtractBrandColors = {
      primary: parsed.primary as string,
      secondary: (parsed.secondary as string) ?? parsed.primary,
      accent: (parsed.accent as string) ?? parsed.primary,
      background: (parsed.background as string) ?? '#ffffff',
    }

    // Snap to exact CSS palette values when close enough
    if (hasPalette) {
      return {
        primary: snapToPalette(result.primary, paletteHexes),
        secondary: snapToPalette(result.secondary, paletteHexes),
        accent: snapToPalette(result.accent, paletteHexes),
        background: snapToPalette(result.background, paletteHexes),
      }
    }

    return result
  } catch {
    console.error('[extract-brand] Vision response not parseable as JSON')
    return null
  }
}

// ── Writing style + industry extraction ───────────────────────────────

/** Extract brand writing style and industry from scraped markdown.
 *  Returns { writingStyle: null, industry: null } when markdown is empty
 *  or when the Claude call fails — never throws. */
export async function extractWritingStyleAndIndustry(
  markdown: string,
  apiKey: string,
): Promise<{ writingStyle: string | null; industry: string | null }> {
  if (!markdown.trim()) return { writingStyle: null, industry: null }

  try {
    const truncatedText = markdown.slice(0, 5000)
    const client = new Anthropic({ apiKey })
    const analysisResponse = await client.messages.create(
      {
        model: 'claude-sonnet-4-6',
        max_tokens: 300,
        messages: [
          {
            role: 'user',
            content: `Analyze this brand's website and return a JSON object with two fields:

1. "writing_style": Describe their writing style in 1-2 sentences. Focus on tone, formality, personality, and voice. Be specific and actionable — a copywriter should be able to use your description to write in this brand's voice.

2. "industry": The brand's industry in 2-3 words max (e.g. "Technology", "Fashion", "Food & Beverage", "Health & Wellness", "Financial Services", "Education", "Real Estate", "Travel & Hospitality").

Website copy:
${truncatedText}

Return ONLY a JSON object like {"writing_style": "...", "industry": "..."}, no markdown or explanation.`,
          },
        ],
      },
      { timeout: 25_000 },
    )
    const rawText =
      analysisResponse.content[0].type === 'text'
        ? analysisResponse.content[0].text.trim()
        : ''
    try {
      const parsed = JSON.parse(rawText.replace(/```json\n?|\n?```/g, '').trim()) as Record<
        string,
        unknown
      >
      return {
        writingStyle: typeof parsed.writing_style === 'string' ? parsed.writing_style : null,
        industry: typeof parsed.industry === 'string' ? parsed.industry : null,
      }
    } catch {
      // Claude returned non-JSON — use raw text as writing style fallback
      return { writingStyle: rawText || null, industry: null }
    }
  } catch (err) {
    console.error('[extract-brand] Writing style + industry analysis failed:', err)
    return { writingStyle: null, industry: null }
  }
}

// ── Main handler ──────────────────────────────────────────────────────

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const authResult = await authenticateRequest(req)
  if (authResult instanceof Response) return authResult

  try {
    const body = (await req.json()) as { url: string }

    const urlResult = validateUrl(body.url)
    if ('error' in urlResult) {
      return new Response(JSON.stringify({ error: urlResult.error }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const firecrawlKey = process.env.FIRECRAWL_API_KEY
    if (!firecrawlKey) {
      return new Response(JSON.stringify({ error: 'Scraping service not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const normalizedUrl = urlResult.url

    // ── Scrape with Firecrawl v2 (branding + screenshot + html) ──────
    const scrapeResponse = await fetch('https://api.firecrawl.dev/v2/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${firecrawlKey}`,
      },
      body: JSON.stringify({
        url: normalizedUrl,
        formats: ['branding', 'screenshot', 'html', 'markdown'],
      }),
    })

    if (!scrapeResponse.ok) {
      console.error('[extract-brand] Firecrawl scrape failed:', await scrapeResponse.text())
      return new Response(JSON.stringify({ error: 'Failed to analyze website' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const scrapeJson = (await scrapeResponse.json()) as { data?: FirecrawlScrapeData }
    const scrapeData = scrapeJson.data
    const branding = scrapeData?.branding

    console.log(
      '[extract-brand] Firecrawl data:',
      JSON.stringify({
        hasColors: !!branding?.colors,
        hasTypography: !!branding?.typography,
        hasFonts: !!branding?.fonts,
        hasImages: !!branding?.images,
        hasScreenshot: !!scrapeData?.screenshot,
        markdownLength: scrapeData?.markdown?.length ?? 0,
      }),
    )

    // ── Colors + Writing style: run Vision and writing style in PARALLEL ──
    // Both depend only on Firecrawl data already in hand. Sequential execution
    // added 5–13 s of unnecessary latency and pushed the endpoint toward Vercel's
    // 30 s timeout. Running them concurrently halves the post-Firecrawl latency.
    const [visionColors, { writingStyle, industry }] = await Promise.all([
      scrapeData?.screenshot
        ? extractColorsViaVision(scrapeData.screenshot, apiKey, branding?.colors).catch((err) => {
            console.error('[extract-brand] Vision extraction error (falling back to branding):', err)
            return null
          })
        : Promise.resolve(null),
      extractWritingStyleAndIndustry(scrapeData?.markdown ?? '', apiKey),
    ])

    // Vision result → Firecrawl branding fallback → null
    const colors = visionColors ?? extractColorsFromBranding(branding)
    const colorsSource = visionColors ? 'vision' : (colors ? 'branding' : 'none')

    // ── Fonts: branding only (Vision can't reliably detect fonts) ────
    const fonts = extractFontsFromBranding(branding)

    // ── Logo: branding → HTML regex → null ───────────────────────────
    let logoUrl = extractLogoFromBranding(branding?.images)
    let logoSource = logoUrl ? 'branding' : 'none'

    if (!logoUrl) {
      const html = scrapeData?.html ?? ''
      logoUrl = extractLogoFromHtml(html, normalizedUrl)
      logoSource = logoUrl ? 'html-regex' : 'none'
    }

    console.log('[extract-brand] Extraction results:', JSON.stringify({
      colors: colors ? colorsSource : 'none',
      fonts: fonts.heading || fonts.body ? 'branding' : 'none',
      logo: logoUrl ? logoSource : 'none',
      writingStyle: writingStyle ? 'extracted' : 'none',
      industry: industry ? 'extracted' : 'none',
    }))

    const result: ExtractBrandResponse = { logo_url: logoUrl, colors, fonts, writing_style: writingStyle, industry }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[extract-brand] Brand extraction error:', err)
    return new Response(JSON.stringify({ error: 'Brand extraction failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
