import Anthropic from '@anthropic-ai/sdk'

interface ExtractBrandRequest {
  url: string
}

interface ExtractBrandResponse {
  logo_url: string | null
  colors: {
    primary: string
    secondary: string
    accent: string
    background: string
  }
  fonts: {
    heading: string | null
    body: string | null
  }
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const body = (await req.json()) as ExtractBrandRequest

    if (!body.url || typeof body.url !== 'string') {
      return new Response(JSON.stringify({ error: 'URL is required' }), {
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

    const normalizedUrl = body.url.startsWith('http') ? body.url : `https://${body.url}`

    // Step 1: Scrape the website using Firecrawl
    const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${firecrawlKey}`,
      },
      body: JSON.stringify({
        url: normalizedUrl,
        formats: ['screenshot', 'html'],
        actions: [{ type: 'screenshot', fullPage: false }],
      }),
    })

    if (!scrapeResponse.ok) {
      return new Response(
        JSON.stringify({ error: 'Failed to scrape website', details: await scrapeResponse.text() }),
        { status: 502, headers: { 'Content-Type': 'application/json' } },
      )
    }

    const scrapeData = await scrapeResponse.json()

    // Step 2: Extract logo from HTML meta tags
    const html = (scrapeData as { data?: { html?: string } }).data?.html ?? ''
    const logoUrl = extractLogoFromHtml(html, normalizedUrl)

    // Step 3: Send screenshot to Claude Vision for color/font analysis
    const screenshotUrl = (scrapeData as { data?: { screenshot?: string } }).data?.screenshot
    const client = new Anthropic({ apiKey })

    const content: Anthropic.Messages.ContentBlockParam[] = []

    if (screenshotUrl) {
      content.push({
        type: 'image',
        source: { type: 'url', url: screenshotUrl },
      })
    }

    content.push({
      type: 'text',
      text: `Analyze this website screenshot and identify the brand's visual identity.

Return a JSON object with:
- "colors": { "primary": "#hex", "secondary": "#hex", "accent": "#hex", "background": "#hex" }
- "fonts": { "heading": "font name or null", "body": "font name or null" }

Rules:
- Colors should be the DOMINANT brand colors, not incidental UI colors
- Primary = main brand color (usually buttons, links, headers)
- Secondary = supporting color (usually text, dark elements)
- Accent = highlight/CTA color
- Background = main page background
- All colors as 6-digit hex with # prefix
- Font names should be the actual font family, not generic (not "sans-serif")
- If you can't determine a font, use null

Return ONLY the JSON object, no markdown or explanation.`,
    })

    const visionResponse = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 500,
      messages: [{ role: 'user', content }],
    })

    const responseText =
      visionResponse.content[0].type === 'text' ? visionResponse.content[0].text : ''

    let extracted: Partial<ExtractBrandResponse> = {}
    try {
      extracted = JSON.parse(responseText.replace(/```json\n?|\n?```/g, '').trim())
    } catch {
      // Fallback defaults used below
    }

    const result: ExtractBrandResponse = {
      logo_url: logoUrl,
      colors: {
        primary: extracted.colors?.primary ?? '#2563eb',
        secondary: extracted.colors?.secondary ?? '#1e293b',
        accent: extracted.colors?.accent ?? '#f59e0b',
        background: extracted.colors?.background ?? '#ffffff',
      },
      fonts: {
        heading: extracted.fonts?.heading ?? null,
        body: extracted.fonts?.body ?? null,
      },
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

function extractLogoFromHtml(html: string, baseUrl: string): string | null {
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
