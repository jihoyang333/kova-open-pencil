import type { SupabaseClient } from '@supabase/supabase-js'

import { writeAudit } from '../../../_shared/audit'
import { verifyIdempotency, IdempotencyHttpError } from '../../../_shared/idempotency'
import { getAdminClient } from '../../../_shared/supabase-admin'
import { verifyAuthFull, UnauthenticatedError } from '../../../_shared/verify-auth-full'

// Cluster 05 PRD §5.1.6 — POST /api/brands/:id/voice-draft/confirm.
//
// One-way write — X-Idempotency-Key is REQUIRED.
//
// Algorithm:
//   1. Verify JWT + brand-ownership.
//   2. If edited_payload provided, UPDATE voice_drafts.draft_payload while the
//      draft is still unresolved (confirmed_at IS NULL AND discarded_at IS NULL).
//   3. Call RPC confirm_voice_draft(draft_id) — atomic commit to
//      brands.identity.voice + append tone_snippets + mark confirmed.
//   4. writeAudit brand_kit.voice_draft_confirmed.
//   5. Return { success, voice_word_count, tone_snippet_count }.
//
// The confirm RPC runs SECURITY DEFINER but checks auth.uid() internally, so it
// MUST be called with the caller's JWT-scoped client (RLS), not service-role.

export const config = { runtime: 'nodejs' as const } as const

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface ToneSnippet {
  label?: string
  category?: string
  content?: string
}

interface DraftPayload {
  voice?: { content?: string }
  tone_snippets?: ToneSnippet[]
}

interface ConfirmBody {
  draft_id: string
  edited_payload?: DraftPayload
}

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS })
}

function brandIdFromUrl(req: Request): string | null {
  try {
    // /api/brands/{id}/voice-draft/confirm
    const segments = new URL(req.url).pathname.split('/').filter((s) => s.length > 0)
    const idx = segments.indexOf('brands')
    const id = idx >= 0 ? segments[idx + 1] : undefined
    if (id && UUID_RE.test(id)) return id
    return null
  } catch {
    return null
  }
}

async function parseBody(req: Request): Promise<ConfirmBody | null> {
  try {
    const raw = (await req.clone().json()) as unknown
    if (!raw || typeof raw !== 'object') return null
    const draftId = (raw as Record<string, unknown>).draft_id
    if (typeof draftId !== 'string' || !UUID_RE.test(draftId)) return null
    const edited = (raw as Record<string, unknown>).edited_payload
    const editedPayload =
      edited && typeof edited === 'object' ? (edited as DraftPayload) : undefined
    return { draft_id: draftId, edited_payload: editedPayload }
  } catch {
    return null
  }
}

function wordCount(text: string): number {
  const trimmed = text.trim()
  if (trimmed === '') return 0
  return trimmed.split(/\s+/).length
}

async function resolvePayloadForCounts(
  userClient: SupabaseClient,
  draftId: string,
  brandId: string,
  edited: DraftPayload | undefined
): Promise<DraftPayload> {
  if (edited) return edited
  const { data } = await userClient
    .from('voice_drafts')
    .select('draft_payload')
    .eq('id', draftId)
    .eq('brand_id', brandId)
    .maybeSingle()
  const row = data as { draft_payload?: DraftPayload } | null
  return row?.draft_payload ?? {}
}

function isDraftNotFound(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  return (
    error.code === 'P0002' ||
    (error.message?.includes('draft_not_found_or_already_resolved') ?? false)
  )
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return jsonResponse(405, { error: 'method_not_allowed' })

  let auth
  try {
    auth = await verifyAuthFull(req)
  } catch (err) {
    if (err instanceof UnauthenticatedError) return jsonResponse(401, { error: 'unauthenticated' })
    throw err
  }

  const brandId = brandIdFromUrl(req)
  if (brandId === null) return jsonResponse(400, { error: 'invalid_request' })

  const body = await parseBody(req)
  if (body === null) return jsonResponse(400, { error: 'invalid_request' })

  const admin = getAdminClient()

  // Brand-ownership.
  const { data: ownedBrand } = await admin
    .from('brands')
    .select('id')
    .eq('id', brandId)
    .eq('user_id', auth.userId)
    .maybeSingle()
  if (!ownedBrand) return jsonResponse(403, { error: 'forbidden' })

  // X-Idempotency-Key REQUIRED for this one-way write.
  if (req.headers.get('X-Idempotency-Key') === null) {
    return jsonResponse(400, { error: 'idempotency_key_required' })
  }
  let idem
  try {
    idem = await verifyIdempotency(admin, req, auth.userId, 'brands.voice-draft.confirm')
  } catch (err) {
    if (err instanceof IdempotencyHttpError) return jsonResponse(err.status, err.payload)
    throw err
  }
  if (idem.cached) {
    return new Response(JSON.stringify(idem.body), { status: idem.status, headers: JSON_HEADERS })
  }

  // 2. Optionally overwrite the draft payload while still unresolved (RLS:
  //    voice_drafts has no UPDATE policy for authenticated, so the
  //    service-role admin client performs the constrained update).
  if (body.edited_payload) {
    const { error: updateErr } = await admin
      .from('voice_drafts')
      .update({ draft_payload: body.edited_payload })
      .eq('id', body.draft_id)
      .eq('brand_id', brandId)
      .is('confirmed_at', null)
      .is('discarded_at', null)
    if (updateErr) {
      return jsonResponse(500, { error: 'internal_error', request_id: crypto.randomUUID() })
    }
  }

  // Compute response counts from the payload that will be committed.
  const payload = await resolvePayloadForCounts(auth.supabase, body.draft_id, brandId, body.edited_payload)
  const voiceWordCount = wordCount(payload.voice?.content ?? '')
  const toneSnippetCount = Array.isArray(payload.tone_snippets) ? payload.tone_snippets.length : 0

  // 3. Commit via RPC (JWT-scoped — RPC reads auth.uid()).
  const { error: rpcErr } = await auth.supabase.rpc('confirm_voice_draft', {
    p_draft_id: body.draft_id,
  })
  if (rpcErr) {
    if (isDraftNotFound(rpcErr)) {
      return jsonResponse(404, { error: 'draft_not_found_or_already_resolved' })
    }
    console.error('[voice-draft/confirm] RPC failed:', rpcErr)
    return jsonResponse(500, { error: 'internal_error', request_id: crypto.randomUUID() })
  }

  // 4. Audit-log (best-effort — never blocks the response).
  await writeAudit(admin, {
    userId: auth.userId,
    eventType: 'brand_kit.voice_draft_confirmed',
    payload: {
      brand_id: brandId,
      draft_id: body.draft_id,
      voice_word_count: voiceWordCount,
      tone_snippet_count: toneSnippetCount,
    },
    clusterOwner: '05',
  })

  const responseBody = {
    success: true,
    voice_word_count: voiceWordCount,
    tone_snippet_count: toneSnippetCount,
  }
  await idem.persist(200, responseBody)
  return jsonResponse(200, responseBody)
}
