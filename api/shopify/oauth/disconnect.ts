import { createClient } from '@supabase/supabase-js'

import { authenticateRequest } from '../../_shared/auth'

export const config = { runtime: 'edge' as const } as const

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const

const PURGE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000

interface DisconnectBody {
  brand_id?: unknown
}

interface ShopifyConnectionRow {
  brand_id: string
  shop_domain: string
  access_token_secret_id: string
  status: string
}

function jsonError(status: number, error: string): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: JSON_HEADERS,
  })
}

function makeAdmin(url: string, key: string) {
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

async function readBrandId(req: Request): Promise<string | null> {
  try {
    const body = (await req.json()) as DisconnectBody
    if (typeof body.brand_id === 'string' && body.brand_id.length > 0) {
      return body.brand_id
    }
    return null
  } catch {
    return null
  }
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return jsonError(405, 'Method not allowed')

  const authResult = await authenticateRequest(req)
  if (authResult instanceof Response) return authResult
  const { userId } = authResult

  const brandId = await readBrandId(req)
  if (!brandId) return jsonError(400, 'Invalid brand_id')

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonError(500, 'Server configuration error')
  }

  const admin = makeAdmin(supabaseUrl, serviceRoleKey)

  const { data: ownedBrand, error: ownedErr } = await admin
    .from('brands')
    .select('id')
    .eq('id', brandId)
    .eq('user_id', userId)
    .maybeSingle()
  if (ownedErr || !ownedBrand) return jsonError(403, 'Forbidden')

  const { data: connectionData } = await admin
    .from('shopify_connections')
    .select('*')
    .eq('brand_id', brandId)
    .maybeSingle()
  const connection = connectionData as ShopifyConnectionRow | null
  if (!connection) return jsonError(404, 'Connection not found')

  const { error: updateErr } = await admin
    .from('shopify_connections')
    .update({ status: 'disconnected' })
    .eq('brand_id', brandId)
  if (updateErr) return jsonError(500, 'Failed to flip connection status')

  const { error: rpcErr } = await admin.rpc('delete_shopify_token', {
    p_brand_id: brandId,
  })
  if (rpcErr) return jsonError(500, 'Failed to revoke token')

  const scheduledAt = new Date(Date.now() + PURGE_WINDOW_MS).toISOString()
  const { error: purgeErr } = await admin
    .from('shopify_purge_queue')
    .insert({ brand_id: brandId, scheduled_at: scheduledAt })
  if (purgeErr) return jsonError(500, 'Failed to schedule data purge')

  return new Response(
    JSON.stringify({ success: true, scheduled_purge_at: scheduledAt }),
    { status: 200, headers: JSON_HEADERS }
  )
}
