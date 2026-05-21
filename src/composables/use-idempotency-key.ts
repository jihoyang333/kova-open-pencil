/**
 * Generates a fresh idempotency key for a write request.
 * Uses `crypto.randomUUID()` (CLAUDE.md hard rule — no `Math.random()`).
 *
 * PRD 11 §5.5 + Plan 11 Task 2.3 / Task 1.3.
 *
 * The key is sent as `X-Idempotency-Key` header to any Edge Function that
 * mutates state. Server-side `verifyIdempotency()` hashes the body and
 * caches the response for 24 h (cron-pruned).
 */
export function useIdempotencyKey(): () => string {
  return () => crypto.randomUUID()
}
