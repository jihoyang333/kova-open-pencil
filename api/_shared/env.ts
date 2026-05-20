// Cluster 11 env helpers (Plan Tasks 1.3b + 1.3c — W0-9 / W0-13).
//
// Required env: requireEnv(name) returns a typed string, throws on absence.
// Replaces the founder-lock-#10-forbidden `process.env.X!` non-null assertion
// pattern (QA-B HIGH-1 flagged 24 callsites across the plan corpus).
//
// Optional env: loadEnvOrSkip(name) returns null + breadcrumb when unset.
// For stub-mode integrations (Sentry / Resend / marketing-email cron) where
// absence is expected at MVP per 00-PRD_SCOPE_PLAN.md §11.

export function requireEnv(name: string): string {
  const value = process.env[name]
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

/**
 * Read OPTIONAL env var. Returns null + console.warn breadcrumb when missing
 * or empty. Caller short-circuits (typically 200 { ok: true, skipped: true }).
 *
 * For REQUIRED env that must throw on absence, use requireEnv() above.
 *
 * Use for stub-mode integrations (Resend, Sentry, marketing-email) where
 * absence is expected at MVP per 00-PRD_SCOPE_PLAN.md §11. Pre-launch §11
 * graduates the warn to Sentry.captureMessage(`env_skipped:${name}`, 'warning').
 */
export function loadEnvOrSkip(name: string): string | null {
  const value = process.env[name]
  if (value === undefined || value === '') {
    console.warn(`[env] skipped — ${name} unset (stub mode)`)
    return null
  }
  return value
}
