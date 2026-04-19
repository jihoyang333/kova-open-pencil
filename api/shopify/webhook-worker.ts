import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Receiver } from '@upstash/qstash'
import { processBulkFinish, type BulkFinishPayload } from './sync/bulk-finish'

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

  await routeTopic(supabase, topic, shop, brand_id, payload, new URL(req.url).origin)

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
  workerOrigin: string,
): Promise<void> {
  switch (topic) {
    case 'products/create':
    case 'products/update':
      await supabase.from('shopify_products').upsert({
        brand_id: brandId,
        shopify_product_id: String(payload.id),
        title: payload.title,
        handle: payload.handle,
        status: payload.status,
        description_html: (payload.body_html as string) ?? null,
        product_type: (payload.product_type as string) ?? null,
        vendor: (payload.vendor as string) ?? null,
        tags: typeof payload.tags === 'string'
          ? payload.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
          : null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'brand_id,shopify_product_id' })
      break

    case 'products/delete':
      await supabase
        .from('shopify_products')
        .delete()
        .eq('brand_id', brandId)
        .eq('shopify_product_id', String(payload.id))
      break

    case 'collections/create':
    case 'collections/update':
      await supabase.from('shopify_collections').upsert({
        brand_id: brandId,
        shopify_collection_id: String(payload.id),
        handle: String(payload.handle ?? ''),
        title: String(payload.title ?? ''),
        description_html: (payload.body_html as string) ?? null,
        collection_type: Array.isArray(payload.rules) && (payload.rules as unknown[]).length > 0
          ? 'smart'
          : 'manual',
        rules: (payload.rules as unknown[]) ?? null,
        image_url: ((payload.image as Record<string, unknown> | null)?.src as string) ?? null,
        products_count: Number(payload.products_count ?? 0),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'brand_id,shopify_collection_id' })
      break

    case 'collections/delete':
      await supabase
        .from('shopify_collections')
        .delete()
        .eq('brand_id', brandId)
        .eq('shopify_collection_id', String(payload.id))
      break

    case 'discounts/create':
    case 'discounts/update': {
      const rawStatus = String(payload.status ?? 'active').toLowerCase()
      const status = rawStatus === 'enabled' ? 'active' : rawStatus
      await supabase.from('shopify_discounts').upsert({
        brand_id: brandId,
        shopify_discount_id: String(payload.id),
        code: (payload.code as string) ?? null,
        title: String(payload.title ?? ''),
        status,
        starts_at: (payload.starts_at as string) ?? null,
        ends_at: (payload.ends_at as string) ?? null,
        value_type: (payload.value_type as string) ?? null,
        value: payload.value != null ? Number(payload.value) : null,
      }, { onConflict: 'brand_id,shopify_discount_id' })
      break
    }

    case 'discounts/delete':
      await supabase
        .from('shopify_discounts')
        .delete()
        .eq('brand_id', brandId)
        .eq('shopify_discount_id', String(payload.id))
      break

    case 'inventory_levels/update':
      await supabase
        .from('shopify_variants')
        .update({ inventory_qty: payload.available })
        .eq('inventory_item_id', String(payload.inventory_item_id))
      break

    case 'shop/update':
      await supabase
        .from('shopify_connections')
        .update({
          currency: payload.currency,
          timezone: payload.iana_timezone ?? payload.timezone,
          primary_locale: payload.primary_locale,
          updated_at: new Date().toISOString(),
        })
        .eq('brand_id', brandId)
      break

    case 'bulk_operations/finish':
      await processBulkFinish(
        supabase,
        brandId,
        payload as unknown as BulkFinishPayload,
        workerOrigin,
      )
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
