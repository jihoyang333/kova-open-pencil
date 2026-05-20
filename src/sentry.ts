// Browser Sentry installer (Cluster 11 Plan Task 1.4 — STUB until pre-launch).
//
// At MVP, Sentry is not wired (founder lock #19 / project_external_accounts_deferred).
// `installSentry()` is a no-op when VITE_SENTRY_DSN_BROWSER is unset and emits
// a one-time breadcrumb so dev/CI can see the stub is active. When the env
// is set (pre-launch §11), the TODO branch will hand off to @sentry/vue.

import type { App } from 'vue'
import type { Router } from 'vue-router'

const dsn = import.meta.env['VITE_SENTRY_DSN_BROWSER']

export function installSentry(app: App, router: Router): void {
  if (!dsn) {
    console.warn(
      '[sentry] VITE_SENTRY_DSN_BROWSER missing — Sentry disabled (stub mode)',
    )
    return
  }
  // TODO(pre-launch §11): import { init, browserTracingIntegration } from '@sentry/vue'
  //                       init({ app, dsn, integrations: [browserTracingIntegration({ router })] })
  void app
  void router
}
