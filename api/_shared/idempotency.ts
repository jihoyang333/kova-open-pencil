import { createHash } from 'node:crypto'

import type { SupabaseClient } from '@supabase/supabase-js'

// W6 Cluster 11 Phase 5c — verifyIdempotency() helper (Plan 11 Task 1.3).
//
// Edge Functions in Clusters 01 (deletion-request, restore, email-change),
// 04 (Stripe webhook) and 09 (snapshot create) call this BEFORE applying any
// side effect. If the caller supplies `X-Idempotency-Key`, a replayed call
// returns the cached response instead of doing the work twice.
//
// C-HIGH11 — body-hash policy (read before integrating):
//
//   request_hash = sha256(method + '|' + path + '|' + bodyText)
//
// The helper hashes the raw bodyText byte-for-byte. It does NOT canonicalize
// JSON: two semantically-equivalent payloads with different property order
// (`{"a":1,"b":2}` vs `{"b":2,"a":1}`) produce DIFFERENT hashes and the
// second call will throw 422 "idempotency_key_reused_with_different_body".
//
// Callers that retry the same logical request MUST serialize their JSON
// deterministically (stable key order, no incidental whitespace) before
// sending. The TS / V8 default `JSON.stringify(obj)` is deterministic for
// the same input object, so callers that send the literal same object twice
// are safe; callers that round-trip through other languages or rebuild the
// payload between retries must enforce determinism themselves.
//
// Matches the Stripe / GitHub / AWS pattern. See PRD 11 §4.1 + §5.5.

export type IdempotencyResult =
  | { cached: false; persist: (status: number, body: unknown) => Promise<void> }
  | { cached: true; status: number; body: unknown }

export class IdempotencyHttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly payload: { error: string }
  ) {
    super(`HTTP ${status}: ${payload.error}`)
    this.name = 'IdempotencyHttpError'
  }
}

// Idempotency-Key allow-list: 16..64 chars, URL-safe alphabet. Matches the
// CHECK constraint on public.idempotency_keys.key.
const KEY_PATTERN = /^[a-zA-Z0-9_-]{16,64}$/

interface CachedRow {
  request_hash: string
  response_status: number
  response_body: unknown
}

export async function verifyIdempotency(
  supabaseAdmin: SupabaseClient,
  req: Request,
  userId: string,
  endpoint: string
): Promise<IdempotencyResult> {
  const key = req.headers.get('X-Idempotency-Key')

  // No key supplied — caller opted out of idempotency. Return a no-op persist
  // so consumer code can stay symmetric regardless of header presence.
  if (key === null) {
    return { cached: false, persist: async () => {} }
  }

  if (!KEY_PATTERN.test(key)) {
    throw new IdempotencyHttpError(400, { error: 'invalid_idempotency_key' })
  }

  const bodyText = await req.clone().text()
  const requestHash = createHash('sha256')
    .update(`${req.method}|${new URL(req.url).pathname}|${bodyText}`)
    .digest('hex')

  const { data } = await supabaseAdmin
    .from('idempotency_keys')
    .select('request_hash, response_status, response_body')
    .eq('key', key)
    .maybeSingle()
  const existing = data as CachedRow | null

  if (existing) {
    if (existing.request_hash !== requestHash) {
      throw new IdempotencyHttpError(422, {
        error: 'idempotency_key_reused_with_different_body',
      })
    }
    return {
      cached: true,
      status: existing.response_status,
      body: existing.response_body,
    }
  }

  return {
    cached: false,
    persist: async (status, body) => {
      await supabaseAdmin.from('idempotency_keys').insert({
        key,
        user_id: userId,
        endpoint,
        request_hash: requestHash,
        response_status: status,
        response_body: body as object,
      })
    },
  }
}
