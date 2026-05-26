import { createClient } from '@supabase/supabase-js'

import { authenticateRequest } from '../../_shared/auth'
import {
  normalizeShopDomain,
  probeShopExists,
  SHOPIFY_SCOPES,
} from '../../_shared/shopify-client'

export const config = { runtime: 'edge' as const } as const

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const
const BRAND_ID_RE = /^[A-Za-z0-9_-]{1,64}$/
const STATE_BYTE_LEN = 32

function jsonError(status: number, error: string): Response {
  return new Response(JSON.stringify({ error }), { status, headers: JSON_HEADERS })
}

function randomStateHex(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(STATE_BYTE_LEN))
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

interface StartBody {
  shop?: unknown
  brand_id?: unknown
  brandId?: unknown
}

export default async function handler(req: Request): Promise<Response> {
  // PRD 02 §5.4.1 — Bearer-header POST only. The legacy GET-with-redirect
  // path leaked the supabase JWT through 302 Location headers, browser
  // history, and access logs. Closed in W9a-T03.
  if (req.method !== 'POST') {
    return jsonError(405, 'Method not allowed')
  }

  const authResult = await authenticateRequest(req)
  if (authResult instanceof Response) return authResult
  const { userId } = authResult

  let body: StartBody
  try {
    body = (await req.json()) as StartBody
  } catch {
    return jsonError(400, 'Invalid JSON body')
  }

  const shopRaw = typeof body.shop === 'string' ? body.shop : ''
  const brandIdRaw =
    typeof body.brand_id === 'string'
      ? body.brand_id
      : typeof body.brandId === 'string'
        ? body.brandId
        : ''

  const shop = normalizeShopDomain(shopRaw)
  if (!shop) return jsonError(400, 'Invalid shop domain')
  if (!BRAND_ID_RE.test(brandIdRaw)) return jsonError(400, 'Invalid brand_id')

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonError(500, 'Server configuration error')
  }

  const clientId = process.env.KOVA_SHOPIFY_CLIENT_ID
  if (!clientId) {
    return jsonError(500, 'Shopify client not configured')
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: ownedBrand, error: ownedErr } = await admin
    .from('brands')
    .select('id')
    .eq('id', brandIdRaw)
    .eq('user_id', userId)
    .maybeSingle()
  if (ownedErr || !ownedBrand) return jsonError(403, 'Forbidden')

  if (!(await probeShopExists(shop))) return jsonError(404, 'Shop not found')

  const state = randomStateHex()
  const { error: stateErr } = await admin.from('shopify_oauth_state').insert({
    state,
    user_id: userId,
    brand_id: brandIdRaw,
    shop,
  })
  if (stateErr) return jsonError(500, 'Failed to persist OAuth state')

  const origin = new URL(req.url).origin
  const redirectUri = `${origin}/api/shopify/oauth/callback`
  const authorize = new URL(`https://${shop}/admin/oauth/authorize`)
  authorize.searchParams.set('client_id', clientId)
  authorize.searchParams.set('scope', SHOPIFY_SCOPES)
  authorize.searchParams.set('redirect_uri', redirectUri)
  authorize.searchParams.set('state', state)

  return new Response(JSON.stringify({ redirectUrl: authorize.toString() }), {
    status: 200,
    headers: JSON_HEADERS,
  })
}
