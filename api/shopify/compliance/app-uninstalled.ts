import { createClient } from '@supabase/supabase-js'
import { verifyShopifyHmac } from '../../_shared/shopify-hmac'

export const config = { runtime: 'edge' as const }

export default async function handler(req: Request): Promise<Response> {
  const body = await req.text()
  const sig = req.headers.get('x-shopify-hmac-sha256') ?? ''
  if (!await verifyShopifyHmac(body, sig, process.env.SHOPIFY_WEBHOOK_SECRET ?? '')) {
    return new Response('Unauthorized', { status: 401 })
  }

  const shop = req.headers.get('x-shopify-shop-domain') ?? ''
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) return new Response('Server configuration error', { status: 500 })
  const admin = createClient(supabaseUrl, serviceRoleKey)

  const { data: conn } = await admin
    .from('shopify_connections')
    .select('brand_id')
    .eq('shop_domain', shop)
    .maybeSingle()

  const brandId = conn?.brand_id ?? null

  await admin.from('shopify_compliance_log').insert({
    topic: 'app/uninstalled',
    brand_id: brandId,
    shop_domain: shop,
    customer_id: null,
    status: 'acknowledged',
    responded_at: new Date().toISOString(),
  })

  if (brandId) {
    await admin.rpc('delete_shopify_token', { p_brand_id: brandId })
    await admin
      .from('shopify_connections')
      .update({ status: 'disconnected', disconnected_at: new Date().toISOString() })
      .eq('brand_id', brandId)
    await admin.from('shopify_purge_queue').insert({ brand_id: brandId })
  }

  return new Response('ok', { status: 200 })
}
