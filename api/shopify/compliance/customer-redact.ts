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
  const payload = JSON.parse(body) as { customer?: { id?: number } }
  const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { data: conn } = await admin
    .from('shopify_connections')
    .select('brand_id')
    .eq('shop_domain', shop)
    .maybeSingle()

  await admin.from('shopify_compliance_log').insert({
    topic: 'customers/redact',
    brand_id: conn?.brand_id ?? null,
    shop_domain: shop,
    customer_id: payload.customer?.id != null ? String(payload.customer.id) : null,
    status: 'acknowledged_no_data',
    responded_at: new Date().toISOString(),
  })

  return new Response('ok', { status: 200 })
}
