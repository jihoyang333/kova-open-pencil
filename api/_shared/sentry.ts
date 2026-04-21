export interface SentryLike {
  setTag(key: string, value: string): void
  captureException(err: unknown): void
}

export interface SentryContext {
  brand_id: string
  shop_domain?: string
}

export function sentryCapture(
  err: unknown,
  ctx: SentryContext,
  client: SentryLike | null,
): void {
  if (!client) return
  client.setTag('service', 'm9.shopify')
  client.setTag('brand_id', ctx.brand_id)
  if (ctx.shop_domain !== undefined) {
    client.setTag('shop_domain', ctx.shop_domain)
  }
  client.captureException(err)
}
