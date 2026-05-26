import { writeAudit } from '../_shared/audit'
import { validateRenameBrand } from '../_shared/brand-validation'
import { verifyIdempotency, IdempotencyHttpError } from '../_shared/idempotency'
import { getAdminClient } from '../_shared/supabase-admin'
import { verifyAuthFull, UnauthenticatedError } from '../_shared/verify-auth-full'

// W9b Cluster 03 — POST /api/brands/rename (Plan 03 Task 12).

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const
const ENDPOINT = 'brands.rename'

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
  const validation = validateRenameBrand(body as Record<string, unknown>)
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

  // Snapshot the old name for audit before mutating.
  const { data: existing } = await auth.supabase
    .from('brands')
    .select('name')
    .eq('id', validation.value.brand_id)
    .maybeSingle()
  const nameOld = (existing as { name?: string } | null)?.name ?? null

  const { data, error } = await auth.supabase.rpc('rename_brand', {
    p_brand_id: validation.value.brand_id,
    p_name: validation.value.name,
  })

  if (error) {
    const code = error.message
    if (code === 'name_required' || code === 'name_too_long') {
      const resp: ResponseBody = { error: code, request_id: crypto.randomUUID() }
      await idem.persist(422, resp)
      return jsonResponse(resp, 422)
    }
    if (code === 'not_found') {
      const resp: ResponseBody = { error: 'not_found', request_id: crypto.randomUUID() }
      await idem.persist(404, resp)
      return jsonResponse(resp, 404)
    }
    console.error('[brands/rename] RPC failed:', error)
    return errorResponse('internal_error', 500)
  }

  const brand = data as { id: string; name: string } | null
  const resp: ResponseBody = { brand }
  await idem.persist(200, resp)

  void writeAudit(admin, {
    userId: auth.userId,
    eventType: 'brand.renamed',
    payload: { brand_id: brand?.id, name_old: nameOld, name_new: brand?.name },
    clusterOwner: '03',
  })

  return jsonResponse(resp, 200)
}
