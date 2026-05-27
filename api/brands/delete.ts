import { writeAudit } from '../_shared/audit'
import { validateDeleteBrand } from '../_shared/brand-validation'
import { verifyIdempotency, IdempotencyHttpError } from '../_shared/idempotency'
import { enforceRateLimit, rateLimitResponse } from '../_shared/rate-limit'
import { purgeBrandStorageObjects } from '../_shared/storage-sweep'
import { getAdminClient } from '../_shared/supabase-admin'
import { verifyAuthFull, UnauthenticatedError } from '../_shared/verify-auth-full'

// W9b Cluster 03 — DELETE /api/brands/delete (Plan 03 Task 14).
// Typed-confirm + cascade. Storage sweep is best-effort after RPC success.
// Rate-limited per PRD 03 §5.1.5 (10 req/min/user — aggressive cap on
// destructive op).

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const
const ENDPOINT = 'brands.delete'
const RATE_LIMIT_MAX = 10

interface ResponseBody {
  success?: boolean
  deleted_brand_name?: string
  storage_sweep?: { swept: number; failed: string[] }
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
  if (req.method !== 'POST' && req.method !== 'DELETE') {
    return errorResponse('method_not_allowed', 405)
  }

  // B-CRIT9: resolve auth BEFORE the RPC so sweep scope is locked to this user.
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
  const validation = validateDeleteBrand(body as Record<string, unknown>)
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

  const { data, error } = await auth.supabase.rpc('delete_brand', {
    p_brand_id: validation.value.brand_id,
    p_confirm_name: validation.value.confirm_typed,
  })

  if (error) {
    const code = error.message
    if (code === 'confirm_mismatch') {
      const resp: ResponseBody = { error: 'confirm_mismatch', request_id: crypto.randomUUID() }
      await idem.persist(422, resp)
      return jsonResponse(resp, 422)
    }
    if (code === 'not_found') {
      const resp: ResponseBody = { error: 'not_found', request_id: crypto.randomUUID() }
      await idem.persist(404, resp)
      return jsonResponse(resp, 404)
    }
    console.error('[brands/delete] RPC failed:', error)
    return errorResponse('internal_error', 500)
  }

  // M8: narrow the RPC summary at runtime so a future schema drift surfaces
  // as a logged warning rather than a silent 0-canvas_count audit row.
  const summaryRaw = data as Record<string, unknown> | null
  const summaryName = typeof summaryRaw?.name === 'string' ? summaryRaw.name : null
  const summaryCanvasCount =
    typeof summaryRaw?.canvas_count === 'number' ? summaryRaw.canvas_count : null
  if (summaryRaw && summaryCanvasCount === null) {
    console.warn('[brands/delete] RPC summary missing canvas_count', { summaryRaw })
  }

  // M9: write the audit row BEFORE the storage sweep so sweep failure cannot
  // cost us the audit (the brand row is already cascade-deleted; the audit
  // record is the only durable trace).
  void writeAudit(admin, {
    userId: auth.userId,
    eventType: 'brand.deleted',
    payload: {
      brand_id: validation.value.brand_id,
      name: summaryName,
      canvas_count: summaryCanvasCount ?? 0,
    },
    clusterOwner: '03',
  })

  // Storage sweep is best-effort — brand row already cascade-deleted.
  const sweep = await purgeBrandStorageObjects(admin, validation.value.brand_id, auth.userId)

  const resp: ResponseBody = {
    success: true,
    deleted_brand_name: summaryName ?? undefined,
    storage_sweep: sweep,
  }
  await idem.persist(200, resp)

  return jsonResponse(resp, 200)
}
