import { createClient } from '@supabase/supabase-js'
import { verifyShopifyHmac } from '../_shared/shopify-hmac'
import { publishToQStash } from '../_shared/qstash'

export default async function handler(req: Request): Promise<Response> {
  const rawBody = await req.text()

  const sig = req.headers.get('x-shopify-hmac-sha256') ?? ''
  const shop = req.headers.get('x-shopify-shop-domain') ?? ''
  const topic = req.headers.get('x-shopify-topic') ?? ''
  const webhookId = req.headers.get('x-shopify-webhook-id') ?? ''

  const secret = process.env.SHOPIFY_WEBHOOK_SECRET ?? ''
  const valid = await verifyShopifyHmac(rawBody, sig, secret)
  if (!valid) return new Response('Unauthorized', { status: 401 })

  if (!webhookId) return new Response('Missing webhook id', { status: 400 })
  if (!topic) return new Response('Missing topic', { status: 400 })

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: conn } = await supabase
    .from('shopify_connections')
    .select('brand_id')
    .eq('shop', shop)
    .maybeSingle()

  const brandId: string | null = conn?.brand_id ?? null

  const { error: logErr } = await supabase
    .from('shopify_webhook_log')
    .insert({ webhook_id: webhookId, topic, shop, brand_id: brandId })

  if (logErr && (logErr as { code?: string }).code === '23505') {
    return new Response('OK', { status: 200 })
  }

  const workerUrl = `${process.env.VERCEL_URL ?? 'http://localhost:3000'}/api/shopify/webhook-worker`
  await publishToQStash(workerUrl, {
    webhook_id: webhookId,
    topic,
    shop,
    brand_id: brandId,
    payload: JSON.parse(rawBody),
  })

  return new Response('OK', { status: 200 })
}
