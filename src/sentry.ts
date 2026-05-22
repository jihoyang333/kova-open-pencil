import * as Sentry from '@sentry/vue'

import type { App } from 'vue'
import type { Router } from 'vue-router'

// W6 Cluster 11 Phase 5c — browser-side Sentry init (Plan 11 Task 1.4).
//
// Env-guarded stub. VITE_SENTRY_DSN_BROWSER absent → no-op + warn breadcrumb.
// Real DSN wired pre-launch per scope-plan §11 + memory
// `project_external_accounts_deferred`.
//
// Why a thin wrapper:
//   - Standardizes the `release` + `environment` tags across Kova (web build).
//   - Lets Cluster 11 own the integration list (BrowserTracing, Replay later)
//     in one place; consumer surfaces just call `captureBrowserException`.
//   - Aligns with founder lock #10 — no `import.meta.env.X!`; guards on
//     `=== undefined` instead.

interface SentryInitOptions {
  app: App
  router: Router
}

let initialized = false

export function initBrowserSentry({ app, router }: SentryInitOptions): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN_BROWSER
  if (typeof dsn !== 'string' || dsn === '') {
    console.warn(
      '[sentry] VITE_SENTRY_DSN_BROWSER not set — Sentry stays disabled until pre-launch wiring.'
    )
    return
  }

  Sentry.init({
    app,
    dsn,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_RELEASE ?? 'dev',
    integrations: [Sentry.browserTracingIntegration({ router })],
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
  })

  initialized = true
}

/**
 * Capture an unhandled exception with Kova context tags. No-ops when Sentry
 * isn't initialized (dev / env-missing). Use this instead of calling
 * `Sentry.captureException` directly so the env guard stays centralized.
 */
export function captureBrowserException(
  err: unknown,
  ctx?: Record<string, string>
): void {
  if (!initialized) return
  Sentry.withScope((scope) => {
    if (ctx) {
      for (const [key, value] of Object.entries(ctx)) {
        scope.setTag(key, value)
      }
    }
    Sentry.captureException(err)
  })
}

export function isBrowserSentryActive(): boolean {
  return initialized
}
