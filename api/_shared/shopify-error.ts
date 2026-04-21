export interface ShopifyErrorContext {
  brand_id: string
  shop_domain?: string
}

export function logShopifyError(err: unknown, context: ShopifyErrorContext): void {
  const message = err instanceof Error ? err.message : String(err)
  const entry = {
    tag: 'm9.shopify',
    brand_id: context.brand_id,
    error: message,
    ...(context.shop_domain !== undefined ? { shop_domain: context.shop_domain } : {}),
  }
  console.error('[m9.shopify]', entry)
}
