import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { verifyShopifyHmac } from '../../_shared/shopify-hmac'
import { processBulkJsonl } from '../../_shared/shopify-bulk-processor'
import { logShopifyError } from '../../_shared/shopify-error'

export const config = { runtime: 'edge' as const }

export interface BulkFinishPayload {
  admin_graphql_api_id: string
  url: string
  status: string
  object_count: number
}

export async function processBulkFinish(
  supabase: SupabaseClient,
  brandId: string,
  payload: BulkFinishPayload,
  _workerOrigin: string,
): Promise<void> {
  if (payload.status === 'failed' || payload.status === 'cancelled') {
    await supabase
      .from('shopify_connections')
      .update({ sync_progress: { phase: 'error', error: `Bulk operation ${payload.status}` } })
      .eq('brand_id', brandId)
    return
  }

  if (payload.status !== 'completed' || !payload.url) return

  // Idempotency comes from upserts in processBulkJsonl, not from a mutex.
  // If webhook and poll race, both run; upserts converge to the same rows.
  await supabase
    .from('shopify_connections')
    .update({
      sync_progress: {
        phase: 'parsing',
        count_done: 0,
        count_total: payload.object_count,
        url: payload.url,
      },
    })
    .eq('brand_id', brandId)

  try {
    await processBulkJsonl(supabase, brandId, payload.url, payload.object_count)
  } catch (err: unknown) {
    logShopifyError(err instanceof Error ? err : new Error('processBulkJsonl failed'), { brand_id: brandId })
    await supabase
      .from('shopify_connections')
      .update({
        sync_progress: {
          phase: 'error',
          error: err instanceof Error ? err.message : 'Sync failed',
        },
      })
      .eq('brand_id', brandId)
  }
}

export default async function handler(req: Request): Promise<Response> {
  const body = await req.text()
  const sig = req.headers.get('x-shopify-hmac-sha256') ?? ''

  const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET
  if (!webhookSecret) return new Response('Server configuration error', { status: 500 })
  if (!await verifyShopifyHmac(body, sig, webhookSecret)) {
    return new Response('Unauthorized', { status: 401 })
  }

  const payload = JSON.parse(body) as BulkFinishPayload
  const shop = req.headers.get('x-shopify-shop-domain') ?? ''
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) return new Response('Server configuration error', { status: 500 })
  const admin = createClient(supabaseUrl, serviceRoleKey)

  const { data: conn } = await admin
    .from('shopify_connections')
    .select('brand_id')
    .eq('shop_domain', shop)
    .single()
  if (!conn) return new Response('No connection', { status: 200 })

  await processBulkFinish(admin, conn.brand_id, payload, new URL(req.url).origin)

  return new Response('ok', { status: 200 })
}
