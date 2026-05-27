import { writeAudit } from '../_shared/audit'
import { validateBrandId } from '../_shared/brand-validation'
import { verifyIdempotency, IdempotencyHttpError } from '../_shared/idempotency'
import { enforceRateLimit, rateLimitResponse } from '../_shared/rate-limit'
import { getAdminClient } from '../_shared/supabase-admin'
import { verifyAuthFull, UnauthenticatedError } from '../_shared/verify-auth-full'

// W9b Cluster 03 — POST /api/brands/archive (Plan 03 Task 13).
// Sets archived_at. If archived brand was the user's selected brand, returns
// next_brand_id so frontend can navigate.
// Rate-limited per PRD 03 §5.1.3 (30 req/min/user).
//
// M7 (next_brand_id semantics): the value returned is the MOST-RECENTLY-EDITED
// remaining active brand (ORDER BY updated_at DESC LIMIT 1). PRD §5.1.3 names
// it "oldest active" but the founder-locked UX intent is "drop the user onto
// the brand they were last working in" — newest-by-updated_at matches that
// intent and matches the store's `sortedActiveBrands[0]` (the brand the user
// would see first in their picker). When PRD §5.1.3 is next revised this
// wording should be corrected.

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const
const ENDPOINT = 'brands.archive'
const RATE_LIMIT_MAX = 30

interface BrandRow {
  id: string
  name: string
  archived_at: string | null
}

interface ResponseBody {
  brand?: BrandRow | null
  next_brand_id?: string | null
  error?: string
  request_id?: string
}

function jsonResponse(body: ResponseBody, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS })
}
function errorResponse(error: string, status: number): Response {
  return jsonResponse({ error, request_id: crypto.randomUUID() }, status)
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return errorResponse('method_not_allowed', 405)

  let auth
  try {
    auth = await verifyAuthFull(req)
  } catch (err) {
    if (err instanceof UnauthenticatedError) return errorResponse('unauthenticated', 401)
    throw err
  }

  let body: unknown
  try {
    body = await req.clone().json()
  } catch {
    return errorResponse('invalid_json', 400)
  }
  const validation = validateBrandId(body as Record<string, unknown>)
  if (!validation.ok) return errorResponse(validation.error, 422)

  const admin = getAdminClient()

  const rate = await enforceRateLimit(admin, auth.userId, ENDPOINT, RATE_LIMIT_MAX)
  if (!rate.allowed) return rateLimitResponse()

  let idem
  try {
    idem = await verifyIdempotency(admin, req, auth.userId, ENDPOINT)
  } catch (err) {
    if (err instanceof IdempotencyHttpError) {
      return jsonResponse({ ...err.payload, request_id: crypto.randomUUID() }, err.status)
    }
    throw err
  }
  if (idem.cached) {
    return new Response(JSON.stringify(idem.body), { status: idem.status, headers: JSON_HEADERS })
  }

  const { data, error } = await auth.supabase.rpc('archive_brand', {
    p_brand_id: validation.value.brand_id,
  })

  if (error) {
    const code = error.message
    if (code === 'already_archived') {
      const resp: ResponseBody = { error: 'already_archived', request_id: crypto.randomUUID() }
      await idem.persist(409, resp)
      return jsonResponse(resp, 409)
    }
    if (code === 'not_found') {
      const resp: ResponseBody = { error: 'not_found', request_id: crypto.randomUUID() }
      await idem.persist(404, resp)
      return jsonResponse(resp, 404)
    }
    console.error('[brands/archive] RPC failed:', error)
    return errorResponse('internal_error', 500)
  }

  const brand = data as BrandRow | null

  // M7: most-recently-edited remaining active brand for UI redirect.
  const { data: nextRow } = await auth.supabase
    .from('brands')
    .select('id')
    .is('archived_at', null)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  const nextBrandId = (nextRow as { id?: string } | null)?.id ?? null

  // M8: surface count failures so audit-log under-reporting becomes visible.
  // Note: canvas_count is a point-in-time snapshot (L8) — later cron edits do
  // not retroactively update the audit row.
  const { count: canvasCount, error: countErr } = await auth.supabase
    .from('canvases')
    .select('id', { count: 'exact', head: true })
    .eq('brand_id', validation.value.brand_id)
  if (countErr) {
    console.warn('[brands/archive] canvas count failed:', countErr.message)
  }

  const resp: ResponseBody = { brand, next_brand_id: nextBrandId }
  await idem.persist(200, resp)

  void writeAudit(admin, {
    userId: auth.userId,
    eventType: 'brand.archived',
    payload: { brand_id: brand?.id, name: brand?.name, canvas_count: canvasCount ?? 0 },
    clusterOwner: '03',
  })

  return jsonResponse(resp, 200)
}
