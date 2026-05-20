// Browser Sentry capture wrapper (Cluster 11 Plan Task 2.5 — STUB).
//
// Wraps the browser-side capture in a `kova` scope context so every error
// surface (composable, store, component) reports the same shape:
//   scope.setContext('kova', { brandId, canvasId, feature })
//   Sentry.captureException(err)
//
// STUB mode: VITE_SENTRY_DSN_BROWSER is unset at MVP per founder lock #19.
// The composable no-ops gracefully so callers can guard with `useSentry()`
// without conditional branches in user code. Pre-launch §11 wires the import
// to @sentry/vue.

export interface KovaContext {
  brandId?: string
  canvasId?: string
  feature?: string
}

const dsn = import.meta.env['VITE_SENTRY_DSN_BROWSER']

export function useSentry() {
  function capture(err: unknown, context: KovaContext = {}): void {
    void err
    void context
    if (!dsn) {
      // TODO(pre-launch §11): once @sentry/vue is installed and initialised in
      // src/sentry.ts:installSentry(), forward via:
      //   Sentry.withScope((scope) => { scope.setContext('kova', context); Sentry.captureException(err) })
      return
    }
    // TODO(pre-launch §11): replace with the @sentry/vue call above.
  }
  return { capture }
}
