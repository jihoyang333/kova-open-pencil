import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Receiver } from '@upstash/qstash'

interface WorkerPayload {
  webhook_id: string
  topic: string
  shop: string
  brand_id: string | null
  payload: Record<string, unknown>
}

export default async function handler(req: Request): Promise<Response> {
  const body = await req.text()

  const receiver = new Receiver({
    currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY!,
    nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY!,
  })

  const sig = req.headers.get('upstash-signature') ?? ''
  const valid = await receiver.verify({ signature: sig, body })
  if (!valid) return new Response('Unauthorized', { status: 401 })

  const msg = JSON.parse(body) as WorkerPayload
  const { webhook_id, topic, shop, brand_id, payload } = msg

  if (!brand_id) return new Response('OK', { status: 200 })

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  await routeTopic(supabase, topic, shop, brand_id, payload)

  await supabase
    .from('shopify_webhook_log')
    .update({ status: 'processed' })
    .eq('webhook_id', webhook_id)

  return new Response('OK', { status: 200 })
}

async function routeTopic(
  supabase: SupabaseClient,
  topic: string,
  _shop: string,
  brandId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  switch (topic) {
    case 'products/create':
    case 'products/update':
      await supabase.from('shopify_products').upsert({
        brand_id: brandId,
        shopify_id: String(payload.id),
        title: payload.title,
        handle: payload.handle,
        status: payload.status,
      })
      break

    case 'products/delete':
      await supabase
        .from('shopify_products')
        .delete()
        .eq('brand_id', brandId)
        .eq('shopify_id', String(payload.id))
      break

    case 'inventory_levels/update':
      await supabase
        .from('shopify_variants')
        .update({ inventory_qty: payload.available })
        .eq('inventory_item_id', String(payload.inventory_item_id))
      break

    case 'app/uninstalled':
      await supabase.rpc('delete_shopify_token', { p_brand_id: brandId })
      await supabase
        .from('shopify_connections')
        .update({ status: 'disconnected', disconnected_at: new Date().toISOString() })
        .eq('brand_id', brandId)
      await supabase.from('shopify_purge_queue').insert({ brand_id: brandId })
      break
  }
}
