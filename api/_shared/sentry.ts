// Server-side Sentry helper (Cluster 11 Plan Task 1.5 — STUB until pre-launch).
//
// At MVP, Sentry is not wired (founder lock #19 / project_external_accounts_deferred).
// `captureException()` and `initSentry()` are no-ops when SENTRY_DSN_SERVER is
// unset. When the env is set, the helper lazily loads @sentry/node and
// forwards the error + context. Lazy loading keeps the @sentry/node dep out
// of the bundle until pre-launch wiring is added.
//
// The older `sentryCapture(err, ctx, client)` export is preserved for the M9
// Shopify code path that injects its own client. Cluster 11 + downstream
// consumers use the env-driven `captureException` API below.

import { loadEnvOrSkip } from './env'

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

// Cached DSN lookup. First call emits the loadEnvOrSkip warn breadcrumb;
// subsequent calls hit the cache so we don't spam stderr per request.
let cachedDsn: string | null | undefined
function getDsn(): string | null {
  if (cachedDsn === undefined) {
    cachedDsn = loadEnvOrSkip('SENTRY_DSN_SERVER')
  }
  return cachedDsn
}

// Reset hook for tests that mutate SENTRY_DSN_SERVER between cases.
export function _resetSentryDsnCache(): void {
  cachedDsn = undefined
  initialized = false
}

let initialized = false

export function initSentry(): void {
  const dsn = getDsn()
  if (!dsn) return
  if (initialized) return
  // TODO(pre-launch §11): import + init @sentry/node here once DSN provisioned
  initialized = true
}

// Sentry-style capture used by writeAudit / verifyIdempotency / cron handlers.
// When SENTRY_DSN_SERVER is unset (MVP default per founder lock #19), this is
// a no-op — the breadcrumb that the DSN is missing already fired via
// loadEnvOrSkip on first lookup.
// When wired pre-launch §11, the TODO branch will hand off to @sentry/node.
export function captureException(
  err: unknown,
  context?: Record<string, unknown>,
): void {
  const dsn = getDsn()
  if (!dsn) return
  // TODO(pre-launch §11): Sentry.captureException(err, { extra: context })
  void err
  void context
}
