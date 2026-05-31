import { writeAudit } from '../../../_shared/audit'
import { getAdminClient } from '../../../_shared/supabase-admin'
import { verifyAuthFull, UnauthenticatedError } from '../../../_shared/verify-auth-full'

// Cluster 05 PRD §5.1.7 — POST /api/brands/:id/voice-draft/discard.
//
// Parallels confirm: calls discard_voice_draft(draft_id) RPC + audit-logs
// brand_kit.voice_draft_discarded. No mutations to brands.*.
//
// The discard RPC runs SECURITY DEFINER but checks auth.uid(), so it MUST be
// called with the caller's JWT-scoped client, not service-role.

export const config = { runtime: 'nodejs' as const } as const

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface DiscardBody {
  draft_id: string
}

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS })
}

function brandIdFromUrl(req: Request): string | null {
  try {
    const segments = new URL(req.url).pathname.split('/').filter((s) => s.length > 0)
    const idx = segments.indexOf('brands')
    const id = idx >= 0 ? segments[idx + 1] : undefined
    if (id && UUID_RE.test(id)) return id
    return null
  } catch {
    return null
  }
}

async function parseBody(req: Request): Promise<DiscardBody | null> {
  try {
    const raw = (await req.json()) as unknown
    if (!raw || typeof raw !== 'object') return null
    const draftId = (raw as Record<string, unknown>).draft_id
    if (typeof draftId !== 'string' || !UUID_RE.test(draftId)) return null
    return { draft_id: draftId }
  } catch {
    return null
  }
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

  const { data: ownedBrand } = await admin
    .from('brands')
    .select('id')
    .eq('id', brandId)
    .eq('user_id', auth.userId)
    .maybeSingle()
  if (!ownedBrand) return jsonResponse(403, { error: 'forbidden' })

  const { error: rpcErr } = await auth.supabase.rpc('discard_voice_draft', {
    p_draft_id: body.draft_id,
  })
  if (rpcErr) {
    if (isDraftNotFound(rpcErr)) {
      return jsonResponse(404, { error: 'draft_not_found_or_already_resolved' })
    }
    console.error('[voice-draft/discard] RPC failed:', rpcErr)
    return jsonResponse(500, { error: 'internal_error', request_id: crypto.randomUUID() })
  }

  await writeAudit(admin, {
    userId: auth.userId,
    eventType: 'brand_kit.voice_draft_discarded',
    payload: { brand_id: brandId, draft_id: body.draft_id },
    clusterOwner: '05',
  })

  return jsonResponse(200, { success: true })
}
