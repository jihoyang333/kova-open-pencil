// NOTE: The onboarding ExtractionStep now calls /api/extract-brand (which merges writing
// style analysis). This endpoint is kept for standalone/future use.
import Anthropic from '@anthropic-ai/sdk'

import { authenticateRequest } from './_shared/auth'
import { validateUrl } from './_shared/url-validation'

interface AnalyzeResponse {
  writing_style: string | null
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Authenticate the request
  const authResult = await authenticateRequest(req)
  if (authResult instanceof Response) return authResult

  try {
    const body = (await req.json()) as { url: string }

    // Validate and sanitize URL
    const urlResult = validateUrl(body.url)
    if ('error' in urlResult) {
      return new Response(JSON.stringify({ error: urlResult.error }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    const firecrawlKey = process.env.FIRECRAWL_API_KEY

    if (!apiKey || !firecrawlKey) {
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const normalizedUrl = urlResult.url

    // Scrape text content
    const scrapeResponse = await fetch('https://api.firecrawl.dev/v2/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${firecrawlKey}`,
      },
      body: JSON.stringify({
        url: normalizedUrl,
        formats: ['markdown'],
      }),
    })

    if (!scrapeResponse.ok) {
      console.error('Firecrawl scrape failed:', await scrapeResponse.text())
      return new Response(
        JSON.stringify({ writing_style: null } as AnalyzeResponse),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }

    const scrapeData = await scrapeResponse.json()
    const textContent = (scrapeData as { data?: { markdown?: string } }).data?.markdown ?? ''

    if (!textContent.trim()) {
      return new Response(
        JSON.stringify({ writing_style: null } as AnalyzeResponse),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }

    // Truncate to avoid excessive token usage
    const truncatedText = textContent.slice(0, 5000)

    const client = new Anthropic({ apiKey })

    const response = await client.messages.create({
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

    const writingStyle =
      response.content[0].type === 'text' ? response.content[0].text.trim() : null

    return new Response(
      JSON.stringify({ writing_style: writingStyle } as AnalyzeResponse),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    // Graceful fallback — return null on any error (don't block onboarding)
    console.error('Writing style analysis error:', err)
    return new Response(
      JSON.stringify({ writing_style: null } as AnalyzeResponse),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  }
}
