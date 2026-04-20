/**
 * Nightly cron — aggregates Shopify orders into shopify_orders_agg.
 * Runs at 02:00 UTC daily (vercel.json schedule: "0 2 * * *").
 * Zero PII: only variant_id, date, qty_sold, revenue are persisted.
 */
import { createClient } from '@supabase/supabase-js'
import { SHOPIFY_API_VERSION } from '../../_shared/shopify-client'

export const maxDuration = 300

interface ShopifyLineItem {
  variant_id: number | null
  quantity: number
  price: string
}

interface ShopifyOrder {
  created_at: string
  line_items: ShopifyLineItem[]
}

interface ShopifyOrdersResponse {
  orders: ShopifyOrder[]
}

interface AggEntry {
  qty: number
  revenue: number
}

interface Connection {
  brand_id: string
  shop_domain: string
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

  const { data: connections, error: connErr } = await admin
    .from('shopify_connections')
    .select('brand_id, shop_domain')
    .eq('status', 'active')

  if (connErr) {
    return new Response(JSON.stringify({ error: connErr.message }), { status: 500 })
  }

  const updatedAtMin = yesterdayStartIso()
  const errors: string[] = []

  for (const conn of (connections ?? []) as Connection[]) {
    try {
      await processOneBrand(admin, conn.brand_id, conn.shop_domain, updatedAtMin)
    } catch (err) {
      errors.push(`${conn.brand_id}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  if (errors.length > 0) {
    return new Response(JSON.stringify({ ok: false, errors }), { status: 207 })
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 })
}

function yesterdayStartIso(): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - 1)
  d.setUTCHours(0, 0, 0, 0)
  return d.toISOString()
}

async function processOneBrand(
  admin: ReturnType<typeof createClient>,
  brandId: string,
  shopDomain: string,
  updatedAtMin: string,
): Promise<void> {
  const { data: token } = await admin.rpc('read_shopify_token', { p_brand_id: brandId })
  if (!token) return

  const orders = await fetchAllOrders(shopDomain, token as string, updatedAtMin)
  if (orders.length === 0) return

  const shopifyVariantIds = collectVariantIds(orders)
  if (shopifyVariantIds.size === 0) return

  const variantIdMap = await resolveVariantIds(admin, brandId, shopifyVariantIds)
  if (variantIdMap.size === 0) return

  const agg = aggregateOrders(orders, variantIdMap)
  if (agg.size === 0) return

  const rows = buildUpsertRows(brandId, agg)

  await admin.from('shopify_orders_agg').upsert(rows, {
    onConflict: 'brand_id,variant_id,date',
  })
}

function collectVariantIds(orders: ShopifyOrder[]): Set<string> {
  const ids = new Set<string>()
  for (const order of orders) {
    for (const item of order.line_items) {
      if (item.variant_id != null) ids.add(String(item.variant_id))
    }
  }
  return ids
}

async function resolveVariantIds(
  admin: ReturnType<typeof createClient>,
  brandId: string,
  numericIds: Set<string>,
): Promise<Map<string, string>> {
  // REST API returns numeric IDs; DB stores GID format: gid://shopify/ProductVariant/{id}
  const gids = Array.from(numericIds).map((id) => `gid://shopify/ProductVariant/${id}`)

  const { data } = await admin
    .from('shopify_variants')
    .select('id, shopify_variant_id')
    .eq('brand_id', brandId)
    .in('shopify_variant_id', gids)

  const map = new Map<string, string>()
  for (const row of (data ?? []) as Array<{ id: string; shopify_variant_id: string }>) {
    const numeric = row.shopify_variant_id.split('/').pop()
    if (numeric) map.set(numeric, row.id)
  }
  return map
}

function aggregateOrders(
  orders: ShopifyOrder[],
  variantIdMap: Map<string, string>,
): Map<string, AggEntry> {
  const agg = new Map<string, AggEntry>()

  for (const order of orders) {
    const date = order.created_at.substring(0, 10)
    for (const item of order.line_items) {
      if (item.variant_id == null) continue
      const localId = variantIdMap.get(String(item.variant_id))
      if (!localId) continue

      const key = `${date}::${localId}`
      const prev = agg.get(key)
      const itemRevenue = parseFloat(item.price) * item.quantity
      agg.set(key, {
        qty: (prev?.qty ?? 0) + item.quantity,
        revenue: (prev?.revenue ?? 0) + itemRevenue,
      })
    }
  }

  return agg
}

function buildUpsertRows(
  brandId: string,
  agg: Map<string, AggEntry>,
): Array<{ brand_id: string; variant_id: string; date: string; qty_sold: number; revenue: number }> {
  return Array.from(agg.entries()).map(([key, value]) => {
    const sepIdx = key.indexOf('::')
    const date = key.substring(0, sepIdx)
    const variantId = key.substring(sepIdx + 2)
    return {
      brand_id: brandId,
      variant_id: variantId,
      date,
      qty_sold: value.qty,
      revenue: Math.round(value.revenue * 100) / 100,
    }
  })
}

async function fetchAllOrders(
  shopDomain: string,
  accessToken: string,
  updatedAtMin: string,
): Promise<ShopifyOrder[]> {
  const orders: ShopifyOrder[] = []
  let url: string | null =
    `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/orders.json` +
    `?status=any&updated_at_min=${encodeURIComponent(updatedAtMin)}&limit=250`

  while (url) {
    const res = await fetch(url, {
      headers: { 'X-Shopify-Access-Token': accessToken },
    })

    if (res.status === 429) {
      await sleep(2000)
      continue
    }

    if (!res.ok) {
      throw new Error(`Shopify orders fetch failed with status ${res.status}`)
    }

    const body = (await res.json()) as ShopifyOrdersResponse
    orders.push(...body.orders)
    url = parseLinkNext(res.headers.get('link'))
  }

  return orders
}

function parseLinkNext(linkHeader: string | null): string | null {
  if (!linkHeader) return null
  const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/)
  return match ? (match[1] ?? null) : null
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
