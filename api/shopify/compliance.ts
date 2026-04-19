import { createClient } from '@supabase/supabase-js'
import { verifyShopifyHmac } from '../_shared/shopify-hmac'

export default async function handler(req: Request): Promise<Response> {
  const rawBody = await req.text()
  const sig = req.headers.get('x-shopify-hmac-sha256') ?? ''
  const shop = req.headers.get('x-shopify-shop-domain') ?? ''
  const topic = req.headers.get('x-shopify-topic') ?? ''

  const valid = await verifyShopifyHmac(rawBody, sig, process.env.SHOPIFY_WEBHOOK_SECRET ?? '')
  if (!valid) return new Response('Unauthorized', { status: 401 })

  const payload = JSON.parse(rawBody) as Record<string, unknown>
  const customerRaw = (payload.customer as Record<string, unknown> | null)?.id
  const customerId = customerRaw != null ? String(customerRaw) : null

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: conn } = await supabase
    .from('shopify_connections')
    .select('brand_id')
    .eq('shop_domain', shop)
    .maybeSingle()

  const brandId = conn?.brand_id ?? null

  await supabase.from('shopify_compliance_log').insert({
    topic,
    brand_id: brandId,
    shop_domain: shop,
    customer_id: customerId,
  })

  if (topic === 'shop/redact' && brandId) {
    await supabase.from('shopify_purge_queue').insert({
      brand_id: brandId,
      scheduled_at: new Date().toISOString(),
    })
  }

  return new Response('OK', { status: 200 })
}
