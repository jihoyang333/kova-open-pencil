/**
 * Nightly cron — deferred Shopify data purge.
 * Processes shopify_purge_queue rows with scheduled_at < now() AND completed_at IS NULL.
 * Cascade-deletes all shopify_* data for each brand, then marks completed_at.
 * Runs nightly (vercel.json schedule: "0 2 * * *").
 */
import { createClient } from '@supabase/supabase-js'
import { logShopifyError } from '../../_shared/shopify-error'

export const maxDuration = 300

interface PurgeRow {
  id: string
  brand_id: string
  scheduled_at: string
}

export default async function handler(req: Request): Promise<Response> {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    if (req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
      return new Response('Unauthorized', { status: 401 })
    }
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) return new Response('Server configuration error', { status: 500 })
  const admin = createClient(supabaseUrl, serviceRoleKey)

  const { data: rows, error: queueErr } = await admin
    .from('shopify_purge_queue')
    .select('id, brand_id')
    .lt('scheduled_at', new Date().toISOString())
    .is('completed_at', null)

  if (queueErr) {
    return new Response(JSON.stringify({ error: queueErr.message }), { status: 500 })
  }

  const errors: string[] = []

  for (const row of (rows ?? []) as PurgeRow[]) {
    try {
      await purgeOneBrand(admin, row.brand_id)
      await admin
        .from('shopify_purge_queue')
        .update({ completed_at: new Date().toISOString() })
        .eq('id', row.id)
    } catch (err) {
      logShopifyError(err, { brand_id: row.brand_id })
      errors.push(`${row.brand_id}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  if (errors.length > 0) {
    return new Response(JSON.stringify({ ok: false, errors }), { status: 207 })
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 })
}

async function purgeOneBrand(
  admin: ReturnType<typeof createClient>,
  brandId: string,
): Promise<void> {
  // Resolve IDs needed for junction tables before deleting parents
  const variantIds = await fetchIds(admin, 'shopify_variants', brandId)
  const collectionIds = await fetchIds(admin, 'shopify_collections', brandId)

  // Delete junction tables that reference variant/collection IDs (no brand_id column)
  if (variantIds.length > 0) {
    const { error } = await admin
      .from('shopify_variant_prices')
      .delete()
      .in('variant_id', variantIds)
    if (error) throw new Error(`shopify_variant_prices: ${error.message}`)
  }

  if (collectionIds.length > 0) {
    const { error } = await admin
      .from('shopify_collection_products')
      .delete()
      .in('collection_id', collectionIds)
    if (error) throw new Error(`shopify_collection_products: ${error.message}`)
  }

  // Delete all tables that have direct brand_id columns
  const directTables = [
    'shopify_metafields',
    'shopify_orders_agg',
    'shopify_media',
    'shopify_variants',
    'shopify_products',
    'shopify_collections',
    'shopify_discounts',
    'shopify_compliance_log',
    'shopify_connections',
  ]

  for (const table of directTables) {
    const { error } = await admin.from(table).delete().eq('brand_id', brandId)
    if (error) throw new Error(`${table}: ${error.message}`)
  }
}

async function fetchIds(
  admin: ReturnType<typeof createClient>,
  table: string,
  brandId: string,
): Promise<string[]> {
  const { data } = await admin.from(table).select('id').eq('brand_id', brandId)
  return (data ?? []).map((r: { id: string }) => r.id)
}
