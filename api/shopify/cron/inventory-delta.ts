/**
 * Hourly cron — webhook-loss fallback for inventory.
 * Fetches inventory_levels updated in the last hour and syncs
 * inventory_qty into shopify_variants.
 * Runs at :00 every hour (vercel.json schedule: "0 * * * *").
 */
import { createClient } from '@supabase/supabase-js'
import { SHOPIFY_API_VERSION } from '../../_shared/shopify-client'

export const maxDuration = 300

interface InventoryLevel {
  inventory_item_id: number
  available: number | null
}

interface InventoryLevelsResponse {
  inventory_levels: InventoryLevel[]
}

interface InventoryItem {
  id: number
  variant_id: number | null
}

interface InventoryItemsResponse {
  inventory_items: InventoryItem[]
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

  const updatedAtMin = lastHourIso()
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

function lastHourIso(): string {
  const d = new Date()
  d.setUTCHours(d.getUTCHours() - 1, 0, 0, 0)
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

  const levels = await fetchAllInventoryLevels(shopDomain, token as string, updatedAtMin)
  if (levels.length === 0) return

  // Sum available across all locations per inventory_item_id
  const qtyByItemId = aggregateByItem(levels)

  // Resolve inventory_item_id → numeric variant_id via Shopify REST
  const variantNumericByItemId = await resolveInventoryItems(
    shopDomain,
    token as string,
    Array.from(qtyByItemId.keys()),
  )

  // Map numeric variant_id → local UUID
  const localIdMap = await resolveLocalVariantIds(admin, brandId, variantNumericByItemId)
  if (localIdMap.size === 0) return

  const updates = buildUpdates(qtyByItemId, variantNumericByItemId, localIdMap)

  for (const { id, inventory_qty } of updates) {
    await admin
      .from('shopify_variants')
      .update({ inventory_qty })
      .eq('id', id)
  }
}

export function aggregateByItem(levels: InventoryLevel[]): Map<number, number> {
  const agg = new Map<number, number>()
  for (const level of levels) {
    if (level.available == null) continue
    agg.set(level.inventory_item_id, (agg.get(level.inventory_item_id) ?? 0) + level.available)
  }
  return agg
}

export async function resolveInventoryItems(
  shopDomain: string,
  accessToken: string,
  itemIds: number[],
): Promise<Map<number, number>> {
  const itemToVariant = new Map<number, number>()

  for (let i = 0; i < itemIds.length; i += 250) {
    const batch = itemIds.slice(i, i + 250)
    const url =
      `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/inventory_items.json` +
      `?ids=${batch.join(',')}`

    const res = await fetch(url, {
      headers: { 'X-Shopify-Access-Token': accessToken },
    })

    if (!res.ok) {
      throw new Error(`Shopify inventory_items fetch failed with status ${res.status}`)
    }

    const body = (await res.json()) as InventoryItemsResponse
    for (const item of body.inventory_items) {
      if (item.variant_id != null) {
        itemToVariant.set(item.id, item.variant_id)
      }
    }
  }

  return itemToVariant
}

async function resolveLocalVariantIds(
  admin: ReturnType<typeof createClient>,
  brandId: string,
  variantNumericByItemId: Map<number, number>,
): Promise<Map<number, string>> {
  const numericIds = Array.from(new Set(variantNumericByItemId.values()))
  if (numericIds.length === 0) return new Map()

  const gids = numericIds.map((id) => `gid://shopify/ProductVariant/${id}`)

  const { data } = await admin
    .from('shopify_variants')
    .select('id, shopify_variant_id')
    .eq('brand_id', brandId)
    .in('shopify_variant_id', gids)

  const map = new Map<number, string>()
  for (const row of (data ?? []) as Array<{ id: string; shopify_variant_id: string }>) {
    const numeric = Number(row.shopify_variant_id.split('/').pop())
    if (!isNaN(numeric)) map.set(numeric, row.id)
  }
  return map
}

export function buildUpdates(
  qtyByItemId: Map<number, number>,
  variantNumericByItemId: Map<number, number>,
  localIdMap: Map<number, string>,
): Array<{ id: string; inventory_qty: number }> {
  const rows: Array<{ id: string; inventory_qty: number }> = []

  for (const [itemId, qty] of qtyByItemId) {
    const numericVariantId = variantNumericByItemId.get(itemId)
    if (numericVariantId == null) continue
    const localId = localIdMap.get(numericVariantId)
    if (!localId) continue
    rows.push({ id: localId, inventory_qty: qty })
  }

  return rows
}

async function fetchAllInventoryLevels(
  shopDomain: string,
  accessToken: string,
  updatedAtMin: string,
): Promise<InventoryLevel[]> {
  const levels: InventoryLevel[] = []
  let url: string | null =
    `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/inventory_levels.json` +
    `?updated_at_min=${encodeURIComponent(updatedAtMin)}&limit=250`

  while (url) {
    const res = await fetch(url, {
      headers: { 'X-Shopify-Access-Token': accessToken },
    })

    if (res.status === 429) {
      await sleep(2000)
      continue
    }

    if (!res.ok) {
      throw new Error(`Shopify inventory_levels fetch failed with status ${res.status}`)
    }

    const body = (await res.json()) as InventoryLevelsResponse
    levels.push(...body.inventory_levels)
    url = parseLinkNext(res.headers.get('link'))
  }

  return levels
}

function parseLinkNext(linkHeader: string | null): string | null {
  if (!linkHeader) return null
  const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/)
  return match ? (match[1] ?? null) : null
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
