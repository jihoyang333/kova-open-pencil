import * as SentryNode from '@sentry/node'

import { loadEnvOrSkip } from './env'

// =============================================================================
// W6 Cluster 11 Phase 5c — server-side Sentry init + general capture helper
// =============================================================================
// Plan 11 Task 1.5. Env-guarded behind SENTRY_DSN_SERVER. Missing env → no-op
// + warn breadcrumb (via loadEnvOrSkip). Real DSN wired pre-launch per
// scope-plan §11.
//
// `initServerSentry()` runs once at Edge-Function module-load time.
// `captureServerException()` is the cross-cluster capture surface used by
// writeAudit (already wired) and any consumer Edge Function.
//
// The M9-era `sentryCapture()` below stays in place — it expects a caller-
// supplied client (no env reads), used by Shopify worker tests. Once those
// callers migrate to `captureServerException`, the old helper can retire.

let serverInitialized = false

export function initServerSentry(): void {
  if (serverInitialized) return
  const dsn = loadEnvOrSkip('SENTRY_DSN_SERVER')
  if (dsn === null) return

  SentryNode.init({
    dsn,
    environment: process.env['VERCEL_ENV'] ?? process.env['NODE_ENV'] ?? 'dev',
    release: process.env['VERCEL_GIT_COMMIT_SHA'] ?? 'dev',
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
  })
  serverInitialized = true
}

/**
 * Capture a server-side exception with Kova context tags. No-ops when Sentry
 * isn't initialized (env-missing). Use instead of `Sentry.captureException`.
 */
export function captureServerException(
  err: unknown,
  ctx?: Record<string, string>
): void {
  if (!serverInitialized) return
  SentryNode.withScope((scope) => {
    if (ctx) {
      for (const [key, value] of Object.entries(ctx)) {
        scope.setTag(key, value)
      }
    }
    SentryNode.captureException(err)
  })
}

export function isServerSentryActive(): boolean {
  return serverInitialized
}

// =============================================================================
// M9 Shopify worker — caller-provided client (no env reads). Kept for the
// existing sentry-tagging test surface. Newer code should call
// `captureServerException` above instead of constructing a SentryLike.
// =============================================================================

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
