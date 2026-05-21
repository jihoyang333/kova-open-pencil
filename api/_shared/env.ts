// W6 Cluster 11 Phase 5c — env helpers (Plan 11 Tasks 1.3b + 1.3c).
//
// Two helpers, one file:
//
//   requireEnv(name)    → string         — throws if missing/empty.
//   loadEnvOrSkip(name) → string | null  — returns null + warn breadcrumb.
//
// Founder lock #10 (Task 1.3b): eliminate the QA-B HIGH-1 `process.env.X!`
// non-null-assertion pattern. `requireEnv` returns `string` (not
// `string | undefined`) so callers never need `!`. The 24 callsites flagged
// by QA-B HIGH-1 migrate in consumer-cluster fix passes.
//
// W0-13 (Task 1.3c): centralize the stub-guard pattern reinvented in 4
// places (Sentry, Resend, marketing-email cron, send-sync-alert). MVP ships
// without those secrets; the helper expresses "absence is expected" once.
//
// Pre-launch §11: the `console.warn` in `loadEnvOrSkip` becomes
// `Sentry.captureMessage(`env_skipped:${name}`, 'warning')` when @sentry/node
// is wired. Signature unchanged — only the breadcrumb emitter swaps.

/**
 * Read a REQUIRED environment variable. Throws if missing or empty.
 *
 * Use this instead of `process.env.X!` (founder lock #10 — no `!`).
 */
export function requireEnv(name: string): string {
  const value = process.env[name]
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

/**
 * Read an OPTIONAL environment variable. Returns null + console.warn
 * breadcrumb when missing or empty. Caller short-circuits — typically
 * `return 200 { ok: true, skipped: true }`.
 *
 * Use for stub-mode integrations (Sentry, Resend, cron) that ship without
 * their secrets in dev / CI per scope plan §11.
 */
export function loadEnvOrSkip(name: string): string | null {
  const value = process.env[name]
  if (value === undefined || value === '') {
    console.warn(
      `[env] ${name} not set — entering stub mode (this integration is a no-op until the env var lands)`
    )
    return null
  }
  return value
}
