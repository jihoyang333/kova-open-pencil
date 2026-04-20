// Client-safe mirror of normalizeShopDomain from api/_shared/shopify-client.ts.
// Duplicated intentionally — api/ is server-only and must not be imported by browser bundles.

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
