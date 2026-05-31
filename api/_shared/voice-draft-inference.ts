import { createAnthropic } from '@ai-sdk/anthropic'
import { generateText } from 'ai'
import type { SupabaseClient } from '@supabase/supabase-js'

// Cluster 05 PRD §5.1.5 — brand-voice inference for the Shopify extract endpoint.
//
// Given storefront content (About page + a sample of product descriptions),
// asks claude-sonnet-4-6 to infer a short brand-voice description plus a few
// tone-snippet candidates, then persists the result as an UNRESOLVED
// voice_drafts row (confirm-before-write guardrail per 00e §6 #5).
//
// This module NEVER writes to brands.* — that path is gated solely by
// /api/brands/:id/voice-draft/confirm. It is best-effort: any failure (no
// Anthropic key, scrape error, malformed model output) returns null so the
// caller still returns the existing visual brand kit.
//
// CLAUDE.md: use @ai-sdk/anthropic + claude-sonnet-4-6. NEVER expose
// ANTHROPIC_API_KEY to the browser — this runs server-side only.

const MODEL = 'claude-sonnet-4-6'
const MAX_PRODUCTS = 5
const MAX_CONTENT_CHARS = 8000

const SYSTEM_PROMPT =
  'You are a brand-voice analyst. Given storefront content, infer a 2-3 sentence ' +
  'brand-voice description and 3-8 tone-snippet candidates as short labeled passages. ' +
  'Return JSON only, matching exactly: ' +
  '{"voice":{"content":"<2-3 sentences>"},"tone_snippets":[{"label":"<short label>",' +
  '"category":"<one of GREETING|VALUE_PROP|CTA|CLOSING|CUSTOM>","content":"<short passage>"}]}. ' +
  'No markdown, no preamble, no code fences.'

export interface ToneSnippetCandidate {
  label: string
  category: string
  content: string
}

export interface VoiceDraftPayload {
  voice: { content: string }
  tone_snippets: ToneSnippetCandidate[]
}

export interface VoiceDraftResult {
  draft_id: string
  draft_payload: VoiceDraftPayload
}

interface ProductRow {
  title: string
  description_html: string | null
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Fetch the public storefront About page HTML (no API key — minimal-scope per
 * Shopify ToS §4). Best-effort: returns '' on any failure.
 */
async function fetchAboutPage(shopDomain: string): Promise<string> {
  try {
    const res = await fetch(`https://${shopDomain}/pages/about`, {
      headers: { Accept: 'text/html' },
    })
    if (!res.ok) return ''
    const html = await res.text()
    return stripHtml(html).slice(0, MAX_CONTENT_CHARS)
  } catch {
    return ''
  }
}

async function fetchTopProductDescriptions(
  admin: SupabaseClient,
  brandId: string
): Promise<string> {
  const { data } = await admin
    .from('shopify_products')
    .select('title, description_html')
    .eq('brand_id', brandId)
    .order('created_at', { ascending: false })
    .limit(MAX_PRODUCTS)
  const rows = (data as ProductRow[] | null) ?? []
  return rows
    .map((r) => `${r.title}: ${stripHtml(r.description_html ?? '')}`)
    .join('\n\n')
    .slice(0, MAX_CONTENT_CHARS)
}

function parseModelJson(text: string): VoiceDraftPayload | null {
  // Be lenient: strip a leading/trailing code fence if the model added one.
  const cleaned = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
  let raw: unknown
  try {
    raw = JSON.parse(cleaned)
  } catch {
    return null
  }
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>
  const voice = obj.voice as { content?: unknown } | undefined
  const voiceContent = typeof voice?.content === 'string' ? voice.content : null
  if (voiceContent === null) return null

  const rawSnips = Array.isArray(obj.tone_snippets) ? obj.tone_snippets : []
  const snippets: ToneSnippetCandidate[] = []
  for (const s of rawSnips) {
    if (!s || typeof s !== 'object') continue
    const rec = s as Record<string, unknown>
    if (typeof rec.content !== 'string') continue
    snippets.push({
      label: typeof rec.label === 'string' ? rec.label : 'Voice sample',
      category: typeof rec.category === 'string' ? rec.category : 'CUSTOM',
      content: rec.content,
    })
  }

  return { voice: { content: voiceContent }, tone_snippets: snippets }
}

/**
 * Run the full inference + persistence flow. Returns null when it cannot
 * produce a draft (missing key, no content, model error) — caller keeps the
 * existing visual extraction behavior unchanged.
 *
 * Single-open-draft invariant: any prior unresolved draft for this brand is
 * discarded before the new one is inserted.
 */
export async function inferAndPersistVoiceDraft(
  admin: SupabaseClient,
  brandId: string,
  userId: string,
  shopDomain: string
): Promise<VoiceDraftResult | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null

  try {
    const [about, products] = await Promise.all([
      fetchAboutPage(shopDomain),
      fetchTopProductDescriptions(admin, brandId),
    ])
    const corpus = [about, products].filter((s) => s.trim() !== '').join('\n\n')
    if (corpus.trim() === '') return null

    const anthropic = createAnthropic({ apiKey })
    const { text } = await generateText({
      model: anthropic(MODEL),
      system: SYSTEM_PROMPT,
      prompt: corpus.slice(0, MAX_CONTENT_CHARS),
    })

    const payload = parseModelJson(text)
    if (payload === null) return null

    // Single-open-draft: discard any prior unresolved draft for this brand.
    await admin
      .from('voice_drafts')
      .update({ discarded_at: new Date().toISOString() })
      .eq('brand_id', brandId)
      .is('confirmed_at', null)
      .is('discarded_at', null)

    const draftId = crypto.randomUUID()
    const { error: insertErr } = await admin.from('voice_drafts').insert({
      id: draftId,
      brand_id: brandId,
      user_id: userId,
      source: 'shopify_extract',
      draft_payload: payload,
    })
    if (insertErr) {
      console.error('[voice-draft-inference] insert failed:', insertErr)
      return null
    }

    return { draft_id: draftId, draft_payload: payload }
  } catch (err) {
    console.error('[voice-draft-inference] inference failed (best-effort):', err)
    return null
  }
}
