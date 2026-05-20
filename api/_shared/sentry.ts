// Server-side Sentry helper (Cluster 11 Plan Task 1.5 — STUB until pre-launch).
//
// At MVP, Sentry is not wired (founder lock #19 / project_external_accounts_deferred).
// `captureException()` is a no-op when SENTRY_DSN_SERVER is unset, which is the
// dev / preview default. When the env is set, the helper lazily loads
// @sentry/node and forwards the error + context. Lazy loading keeps the
// @sentry/node dep out of the bundle until pre-launch wiring is added.
//
// The older `sentryCapture(err, ctx, client)` export is preserved for the M9
// Shopify code path that injects its own client. Cluster 11 + downstream
// consumers use the env-driven `captureException` API below.

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

export interface CaptureOptions {
  tags?: Record<string, string>
  extra?: Record<string, unknown>
}

function isSentryEnabled(): boolean {
  const dsn = process.env['SENTRY_DSN_SERVER']
  return Boolean(dsn && dsn.length > 0)
}

// STUB-friendly capture used by writeAudit / verifyIdempotency / cron handlers.
// Logs to stderr when Sentry is unwired so dev / CI can still see the failure.
// When Sentry is wired (pre-launch), replace the console.error fallback with
// the lazy import:
//   const Sentry = await import('@sentry/node')
//   Sentry.captureException(err, { tags, extra })
export function captureException(err: unknown, options?: CaptureOptions): void {
  if (!isSentryEnabled()) {
    const tagSuffix = options?.tags
      ? ' ' +
        Object.entries(options.tags)
          .map(([k, v]) => `${k}=${v}`)
          .join(' ')
      : ''
    console.error('[sentry-stub]', err, tagSuffix)
    return
  }
  // Pre-launch: replace with @sentry/node call. Stub keeps the contract.
  console.error('[sentry]', err, options)
}
