import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { verifyShopifyHmac } from '../../_shared/shopify-hmac'
import { publishToQStash } from '../../_shared/qstash'

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
  workerOrigin: string,
): Promise<void> {
  if (payload.status !== 'completed' || !payload.url) return

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

  await publishToQStash(`${workerOrigin}/api/shopify/sync/worker`, {
    brand_id: brandId,
    url: payload.url,
    cursor: 0,
    count_total: payload.object_count,
  })
}

export default async function handler(req: Request): Promise<Response> {
  const body = await req.text()
  const sig = req.headers.get('x-shopify-hmac-sha256') ?? ''

  if (!await verifyShopifyHmac(body, sig, process.env.SHOPIFY_WEBHOOK_SECRET!)) {
    return new Response('Unauthorized', { status: 401 })
  }

  const payload = JSON.parse(body) as BulkFinishPayload
  const shop = req.headers.get('x-shopify-shop-domain') ?? ''
  const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { data: conn } = await admin
    .from('shopify_connections')
    .select('brand_id')
    .eq('shop_domain', shop)
    .single()
  if (!conn) return new Response('No connection', { status: 200 })

  await processBulkFinish(admin, conn.brand_id, payload, new URL(req.url).origin)

  return new Response('ok', { status: 200 })
}
