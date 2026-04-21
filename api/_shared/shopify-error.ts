export interface ShopifyErrorContext {
  brand_id: string
  shop_domain?: string
}

export function logShopifyError(err: unknown, context: ShopifyErrorContext): void {
  const message = err instanceof Error ? err.message : String(err)
  const entry: Record<string, string> = {
    tag: 'm9.shopify',
    brand_id: context.brand_id,
    error: message,
  }
  if (context.shop_domain !== undefined) {
    entry.shop_domain = context.shop_domain
  }
  console.error('[m9.shopify]', entry)
}
