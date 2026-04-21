export const BANNER_DISMISS_KEY = 'kova:shopify-banner-dismissed'
export const BANNER_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000

export function isBannerSuppressed(
  nowMs: number,
  storage: Pick<Storage, 'getItem'>
): boolean {
  const raw = storage.getItem(BANNER_DISMISS_KEY)
  if (raw === null) return false
  const dismissedAt = Number(raw)
  if (!Number.isFinite(dismissedAt)) return false
  return nowMs - dismissedAt < BANNER_COOLDOWN_MS
}

export function dismissBanner(
  nowMs: number,
  storage: Pick<Storage, 'setItem'>
): void {
  storage.setItem(BANNER_DISMISS_KEY, String(nowMs))
}

export function hasBrandMissingShopify(
  brandIds: string[],
  connectedBrandIds: ReadonlySet<string>
): boolean {
  return brandIds.some((id) => !connectedBrandIds.has(id))
}
