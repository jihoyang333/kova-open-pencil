import type { SupabaseClient } from '@supabase/supabase-js'

import { parseBulkJsonl } from './shopify-bulk-parser'
import { logShopifyError } from './shopify-error'

const BATCH_SIZE = 500

export async function processBulkJsonl(
  admin: SupabaseClient,
  brandId: string,
  url: string,
  countTotal: number,
): Promise<{ count_done: number }> {
  const fileRes = await fetch(url)
  if (!fileRes.ok || !fileRes.body) {
    throw new Error(`bulk JSONL fetch failed: ${fileRes.status}`)
  }

  const batches = new Map<string, Array<Record<string, unknown>>>()
  let count = 0

  const flush = async (): Promise<void> => {
    for (const [table, rows] of batches) {
      if (rows.length === 0) continue
      const resolved = await resolveFks(admin, brandId, table, rows)
      const { error } = await admin.from(table).upsert(resolved)
      if (error) logShopifyError(new Error(`upsert failed for ${table}: ${error.message}`), { brand_id: brandId })
      batches.set(table, [])
    }
  }

  for await (const { table, record } of parseBulkJsonl(fileRes.body, 0)) {
    const rec = { brand_id: brandId, ...record }
    const arr = batches.get(table) ?? (batches.set(table, []).get(table) as Array<Record<string, unknown>>)
    arr.push(rec)
    count++
    if (arr.length >= BATCH_SIZE) await flush()
  }

  await flush()

  await admin
    .from('shopify_connections')
    .update({
      sync_progress: { phase: 'done', count_done: count, count_total: countTotal },
      last_synced_at: new Date().toISOString(),
    })
    .eq('brand_id', brandId)

  return { count_done: count }
}

type AdminClient = SupabaseClient

export async function resolveFks(
  admin: AdminClient,
  brand_id: string,
  table: string,
  rows: Array<Record<string, unknown>>,
): Promise<Array<Record<string, unknown>>> {
  if (table === 'shopify_products' || table === 'shopify_collections') {
    return rows
  }

  if (table === 'shopify_variants') {
    return resolveVariants(admin, brand_id, rows)
  }

  if (table === 'shopify_media' || table === 'shopify_metafields') {
    return resolveOwned(admin, brand_id, rows)
  }

  if (table === 'shopify_collection_products') {
    return resolveCollectionProducts(admin, brand_id, rows)
  }

  return rows
}

async function resolveVariants(
  admin: AdminClient,
  brand_id: string,
  rows: Array<Record<string, unknown>>,
): Promise<Array<Record<string, unknown>>> {
  const parentIds = [...new Set(rows.map((r) => r._parent_shopify_product_id as string).filter(Boolean))]
  if (parentIds.length === 0) return rows

  const { data } = await admin
    .from('shopify_products')
    .select('id, shopify_product_id')
    .eq('brand_id', brand_id)
    .in('shopify_product_id', parentIds)

  const idMap = new Map((data ?? []).map((r) => [r.shopify_product_id as string, r.id as string]))

  return rows.map((row) => {
    const { _parent_shopify_product_id, ...rest } = row
    return { ...rest, product_id: idMap.get(_parent_shopify_product_id as string) }
  })
}

async function resolveOwned(
  admin: AdminClient,
  brand_id: string,
  rows: Array<Record<string, unknown>>,
): Promise<Array<Record<string, unknown>>> {
  const productParents = rows
    .filter((r) => r._parent_type === 'product')
    .map((r) => r._parent_id as string)
    .filter(Boolean)

  const variantParents = rows
    .filter((r) => r._parent_type === 'productvariant')
    .map((r) => r._parent_id as string)
    .filter(Boolean)

  const productMap = new Map<string, string>()
  const variantMap = new Map<string, string>()

  if (productParents.length > 0) {
    const { data } = await admin
      .from('shopify_products')
      .select('id, shopify_product_id')
      .eq('brand_id', brand_id)
      .in('shopify_product_id', [...new Set(productParents)])
    ;(data ?? []).forEach((r) => productMap.set(r.shopify_product_id as string, r.id as string))
  }

  if (variantParents.length > 0) {
    const { data } = await admin
      .from('shopify_variants')
      .select('id, shopify_variant_id')
      .eq('brand_id', brand_id)
      .in('shopify_variant_id', [...new Set(variantParents)])
    ;(data ?? []).forEach((r) => variantMap.set(r.shopify_variant_id as string, r.id as string))
  }

  return rows.map((row) => {
    const { _parent_id, _parent_type, ...rest } = row
    const ownerMap = _parent_type === 'productvariant' ? variantMap : productMap
    return { ...rest, owner_id: ownerMap.get(_parent_id as string) }
  })
}

async function resolveCollectionProducts(
  admin: AdminClient,
  brand_id: string,
  rows: Array<Record<string, unknown>>,
): Promise<Array<Record<string, unknown>>> {
  const collectionIds = [...new Set(rows.map((r) => r._parent_collection_shopify_id as string).filter(Boolean))]
  const productIds = [...new Set(rows.map((r) => r._product_shopify_id as string).filter(Boolean))]

  const collectionMap = new Map<string, string>()
  const productMap = new Map<string, string>()

  if (collectionIds.length > 0) {
    const { data } = await admin
      .from('shopify_collections')
      .select('id, shopify_collection_id')
      .eq('brand_id', brand_id)
      .in('shopify_collection_id', collectionIds)
    ;(data ?? []).forEach((r) => collectionMap.set(r.shopify_collection_id as string, r.id as string))
  }

  if (productIds.length > 0) {
    const { data } = await admin
      .from('shopify_products')
      .select('id, shopify_product_id')
      .eq('brand_id', brand_id)
      .in('shopify_product_id', productIds)
    ;(data ?? []).forEach((r) => productMap.set(r.shopify_product_id as string, r.id as string))
  }

  return rows.map((row) => {
    const { _parent_collection_shopify_id, _product_shopify_id, ...rest } = row
    return {
      ...rest,
      collection_id: collectionMap.get(_parent_collection_shopify_id as string),
      product_id: productMap.get(_product_shopify_id as string),
    }
  })
}
