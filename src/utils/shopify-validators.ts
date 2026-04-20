const SHOP_RE = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/

export function normalizeShopDomain(input: string): string | null {
  if (!input) return null

  const trimmed = input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')

  return SHOP_RE.test(trimmed) ? trimmed : null
}
