import { writeAudit } from '../_shared/audit'
import { validateBrandId } from '../_shared/brand-validation'
import { loadEnvOrSkip } from '../_shared/env'
import { verifyIdempotency, IdempotencyHttpError } from '../_shared/idempotency'
import { getAdminClient } from '../_shared/supabase-admin'
import { verifyAuthFull, UnauthenticatedError } from '../_shared/verify-auth-full'

// W9b Cluster 03 — POST /api/brands/restore (Plan 03 Task 13.5).
// MVP per 2026-05-17 reversal. Honors BRANDS_RESTORE_ENABLED kill-switch.

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const
const ENDPOINT = 'brands.restore'

interface ResponseBody {
  brand?: unknown
  error?: string
  request_id?: string
}

function jsonResponse(body: ResponseBody, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS })
}
function errorResponse(error: string, status: number): Response {
  return jsonResponse({ error, request_id: crypto.randomUUID() }, status)
}

function restoreEnabled(): boolean {
  // Default-on per PRD §10 feature-flags table. Only disabled if explicitly set to "false".
  const flag = loadEnvOrSkip('BRANDS_RESTORE_ENABLED')
  if (flag === null) return true
  return flag !== 'false'
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return errorResponse('method_not_allowed', 405)

  if (!restoreEnabled()) {
    return errorResponse('feature_disabled', 503)
  }

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

  const { data, error } = await auth.supabase.rpc('restore_brand', {
    p_brand_id: validation.value.brand_id,
  })

  if (error) {
    const code = error.message
    if (code === 'not_archived') {
      const resp: ResponseBody = { error: 'not_archived', request_id: crypto.randomUUID() }
      await idem.persist(409, resp)
      return jsonResponse(resp, 409)
    }
    if (code === 'not_found') {
      const resp: ResponseBody = { error: 'not_found', request_id: crypto.randomUUID() }
      await idem.persist(404, resp)
      return jsonResponse(resp, 404)
    }
    console.error('[brands/restore] RPC failed:', error)
    return errorResponse('internal_error', 500)
  }

  const brand = data as { id: string; name: string; archived_at: string | null } | null
  const resp: ResponseBody = { brand }
  await idem.persist(200, resp)

  void writeAudit(admin, {
    userId: auth.userId,
    eventType: 'brand.restored',
    payload: { brand_id: brand?.id, name: brand?.name, archived_at: brand?.archived_at },
    clusterOwner: '03',
  })

  return jsonResponse(resp, 200)
}
