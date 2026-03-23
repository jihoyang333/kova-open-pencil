import Anthropic from '@anthropic-ai/sdk'

import { authenticateRequest } from './_shared/auth'
import {
  extractColorsFromBranding,
  extractFontsFromBranding,
  extractLogoFromBranding,
  extractLogoFromHtml,
} from './_shared/brand-extraction'
import type { ExtractBrandColors, ExtractBrandResponse } from './_shared/brand-extraction'
import type { FirecrawlScrapeData } from './_shared/firecrawl-types'
import { validateUrl } from './_shared/url-validation'

export type { ExtractBrandColors, ExtractBrandResponse }

// ── Vision fallback for colors only ────────────────────────────────────

async function extractColorsViaVision(
  screenshotUrl: string,
  apiKey: string,
): Promise<ExtractBrandColors | null> {
  const client = new Anthropic({ apiKey })

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 300,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'url', url: screenshotUrl } },
          {
            type: 'text',
            text: `Identify the 4 dominant brand colors in this website screenshot.

Return ONLY a JSON object:
{"primary":"#hex","secondary":"#hex","accent":"#hex","background":"#hex"}

Rules:
- primary = main brand color (buttons, links, headers)
- secondary = supporting color (text, dark elements)
- accent = highlight/CTA color
- background = main page background
- All colors as 6-digit hex with # prefix

Return ONLY the JSON, no markdown or explanation.`,
          },
        ],
      },
    ],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  console.log('[extract-brand] Vision raw response:', text)

  try {
    const parsed = JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim()) as Record<
      string,
      unknown
    >

    if (typeof parsed.primary !== 'string') return null

    return {
      primary: parsed.primary as string,
      secondary: (parsed.secondary as string) ?? parsed.primary,
      accent: (parsed.accent as string) ?? parsed.primary,
      background: (parsed.background as string) ?? '#ffffff',
    }
  } catch {
    console.error('[extract-brand] Vision response not parseable as JSON')
    return null
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
      '[extract-brand] Firecrawl branding data:',
      JSON.stringify({
        hasColors: !!branding?.colors,
        hasTypography: !!branding?.typography,
        hasFonts: !!branding?.fonts,
        hasImages: !!branding?.images,
      }),
    )

    // ── Colors: branding → Vision fallback → null ────────────────────
    let colors = extractColorsFromBranding(branding)
    let colorsSource = colors ? 'branding' : 'none'

    if (!colors && scrapeData?.screenshot) {
      colors = await extractColorsViaVision(scrapeData.screenshot, apiKey)
      colorsSource = colors ? 'vision' : 'none'
    }

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

    // ── Writing style: from markdown content via Claude ────────────
    let writingStyle: string | null = null
    const markdown = scrapeData?.markdown
    if (markdown && markdown.trim().length > 0) {
      try {
        const truncatedText = markdown.slice(0, 5000)
        const client = new Anthropic({ apiKey })
        const styleResponse = await client.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 200,
          messages: [
            {
              role: 'user',
              content: `Analyze this brand's website copy and describe their writing style in 1-2 sentences. Focus on tone, formality, personality, and voice. Be specific and actionable — a copywriter should be able to use your description to write in this brand's voice.

Website copy:
${truncatedText}

Return ONLY the writing style description, no quotes or preamble.`,
            },
          ],
        })
        writingStyle =
          styleResponse.content[0].type === 'text'
            ? styleResponse.content[0].text.trim()
            : null
      } catch (styleErr) {
        console.error('[extract-brand] Writing style analysis failed:', styleErr)
      }
    }

    console.log('[extract-brand] Extraction results:', JSON.stringify({
      colors: colors ? colorsSource : 'none',
      fonts: fonts.heading || fonts.body ? 'branding' : 'none',
      logo: logoUrl ? logoSource : 'none',
      writingStyle: writingStyle ? 'extracted' : 'none',
    }))

    const result: ExtractBrandResponse = { logo_url: logoUrl, colors, fonts, writing_style: writingStyle }

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
