import { writeAudit } from '../_shared/audit'
import { validateBrandId } from '../_shared/brand-validation'
import { verifyIdempotency, IdempotencyHttpError } from '../_shared/idempotency'
import { getAdminClient } from '../_shared/supabase-admin'
import { verifyAuthFull, UnauthenticatedError } from '../_shared/verify-auth-full'

// W9b Cluster 03 — POST /api/brands/archive (Plan 03 Task 13).
// Sets archived_at. If archived brand was the user's selected brand, returns
// next_brand_id so frontend can navigate.

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const
const ENDPOINT = 'brands.archive'

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

  // Compute next_brand_id for UI redirect — oldest remaining active brand or null.
  const { data: nextRow } = await auth.supabase
    .from('brands')
    .select('id')
    .is('archived_at', null)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  const nextBrandId = (nextRow as { id?: string } | null)?.id ?? null

  // Canvas count snapshot for audit (best-effort).
  const { count: canvasCount } = await auth.supabase
    .from('canvases')
    .select('id', { count: 'exact', head: true })
    .eq('brand_id', validation.value.brand_id)

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
