/**
 * Every-6h cron — webhook-loss fallback for products.
 * Fetches products updated in the last 6h and upserts into shopify_products.
 * Runs every 6 hours (vercel.json schedule: "0 0,6,12,18 * * *").
 */
import { createClient } from '@supabase/supabase-js'
import { SHOPIFY_API_VERSION } from '../../_shared/shopify-client'

export const maxDuration = 300

interface ShopifyProduct {
  id: number
  handle: string
  title: string
  body_html: string | null
  product_type: string | null
  vendor: string | null
  tags: string
  status: string
  published_at: string | null
}

interface ShopifyProductsResponse {
  products: ShopifyProduct[]
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

  const updatedAtMin = last6hIso()
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

export function last6hIso(): string {
  const d = new Date()
  d.setUTCHours(d.getUTCHours() - 6, 0, 0, 0)
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

  const products = await fetchAllProducts(shopDomain, token as string, updatedAtMin)
  if (products.length === 0) return

  const rows = buildUpsertRows(brandId, products)

  await admin.from('shopify_products').upsert(rows, {
    onConflict: 'brand_id,shopify_product_id',
  })
}

export function buildUpsertRows(
  brandId: string,
  products: ShopifyProduct[],
): Array<{
  brand_id: string
  shopify_product_id: string
  handle: string
  title: string
  description_html: string | null
  product_type: string | null
  vendor: string | null
  tags: string[]
  status: string
  published_at: string | null
}> {
  return products.map((p) => ({
    brand_id: brandId,
    shopify_product_id: `gid://shopify/Product/${p.id}`,
    handle: p.handle,
    title: p.title,
    description_html: p.body_html ?? null,
    product_type: p.product_type ?? null,
    vendor: p.vendor ?? null,
    tags: p.tags ? p.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
    status: p.status,
    published_at: p.published_at ?? null,
  }))
}

async function fetchAllProducts(
  shopDomain: string,
  accessToken: string,
  updatedAtMin: string,
): Promise<ShopifyProduct[]> {
  const products: ShopifyProduct[] = []
  let url: string | null =
    `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/products.json` +
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
      throw new Error(`Shopify products fetch failed with status ${res.status}`)
    }

    const body = (await res.json()) as ShopifyProductsResponse
    products.push(...body.products)
    url = parseLinkNext(res.headers.get('link'))
  }

  return products
}

function parseLinkNext(linkHeader: string | null): string | null {
  if (!linkHeader) return null
  const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/)
  return match ? (match[1] ?? null) : null
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
