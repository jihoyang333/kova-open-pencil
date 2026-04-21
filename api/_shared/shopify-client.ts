/**
 * Shared Shopify client helpers — shop-domain validation, existence probe,
 * and API version / OAuth scope constants used by `api/shopify/*`.
 *
 * Server-only. Do not import into browser bundles.
 */

export const SHOPIFY_API_VERSION = '2024-10'

export const SHOPIFY_SCOPES =
  'read_products,read_themes,read_online_store_pages,read_orders,read_inventory,read_discounts'

const SHOP_RE = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/

/**
 * Normalize a user-supplied shop domain and validate it matches `<store>.myshopify.com`.
 * Strips scheme, trailing path, and whitespace; lowercases for comparison.
 * Returns the canonical domain, or `null` if invalid.
 */
export function normalizeShopDomain(input: string): string | null {
  if (!input) return null

  const trimmed = input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')

  return SHOP_RE.test(trimmed) ? trimmed : null
}

/**
 * Probe whether a Shopify shop exists by HEAD-requesting its admin shop.json.
 * 200/401/403 all indicate the shop resolves; anything else (incl. network
 * errors) is treated as "does not exist".
 */
export async function probeShopExists(
  shop: string,
  fetchFn: typeof fetch = globalThis.fetch,
): Promise<boolean> {
  try {
    const res = await fetchFn(
      `https://${shop}/admin/api/${SHOPIFY_API_VERSION}/shop.json`,
      { method: 'HEAD' }
    )
    return res.status === 200 || res.status === 401 || res.status === 403
  } catch {
    return false
  }
}
