// Browser-side idempotency-key generator (Cluster 11 Plan Task 2.3).
// Produces a UUID v4 per call. Caller passes it in the `X-Idempotency-Key`
// header; api/_shared/idempotency.ts validates + dedupes downstream.

export function useIdempotencyKey() {
  function generate(): string {
    return crypto.randomUUID()
  }
  return { generate }
}
