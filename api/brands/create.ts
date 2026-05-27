import { writeAudit } from '../_shared/audit'
import { validateCreateBrand } from '../_shared/brand-validation'
import { verifyIdempotency, IdempotencyHttpError } from '../_shared/idempotency'
import { enforceRateLimit, rateLimitResponse } from '../_shared/rate-limit'
import { getAdminClient } from '../_shared/supabase-admin'
import { verifyAuthFull, UnauthenticatedError } from '../_shared/verify-auth-full'

// W9b Cluster 03 — POST /api/brands/create (Plan 03 Task 11).
// Calls create_brand RPC (auto-assigns color + slug). Audits + idempotent.
// Rate-limited per PRD 03 §5.1.1 (30 req/min/user).

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const
const ENDPOINT = 'brands.create'
const RATE_LIMIT_MAX = 30

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
  const validation = validateCreateBrand(body as Record<string, unknown>)
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

  const { data, error } = await auth.supabase.rpc('create_brand', {
    p_name: validation.value.name,
    p_url: validation.value.url,
    p_description: validation.value.description,
  })

  if (error) {
    const code = error.message
    if (code === 'name_required' || code === 'name_too_long' || code === 'description_too_long') {
      const resp: ResponseBody = { error: code, request_id: crypto.randomUUID() }
      await idem.persist(422, resp)
      return jsonResponse(resp, 422)
    }
    // H2: create_brand may raise 'slug_collision' (ERRCODE 40001) under
    // concurrent same-user same-name creates. Surface as 409 so the client
    // can retry with a fresh idempotency-key — the retry will land a
    // different slug because the winning row now occupies the previous one.
    if (code === 'slug_collision') {
      const resp: ResponseBody = { error: 'slug_collision', request_id: crypto.randomUUID() }
      await idem.persist(409, resp)
      return jsonResponse(resp, 409)
    }
    console.error('[brands/create] RPC failed:', error)
    return errorResponse('internal_error', 500)
  }

  const brand = data as { id: string; name: string; slug: string; color: string } | null
  const resp: ResponseBody = { brand }
  await idem.persist(200, resp)

  void writeAudit(admin, {
    userId: auth.userId,
    eventType: 'brand.created',
    payload: { brand_id: brand?.id, name: brand?.name, slug: brand?.slug, color: brand?.color },
    clusterOwner: '03',
  })

  return jsonResponse(resp, 200)
}
