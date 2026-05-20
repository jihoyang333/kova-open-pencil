// Idempotency contract (C-HIGH11 — read before integrating):
//
//   request_hash = sha256(method + '|' + path + '|' + bodyText)
//
// The helper hashes the raw bodyText byte-for-byte. It does NOT canonicalize
// JSON: two semantically-equivalent payloads with different property order
// (e.g. `{"a":1,"b":2}` vs `{"b":2,"a":1}`) produce DIFFERENT hashes and a
// replay with the second body will throw 422 "key_reused_with_different_body".
//
// Callers that retry the same logical request MUST serialize their JSON
// deterministically (stable key order, no incidental whitespace) before
// sending. V8's `JSON.stringify(obj)` is deterministic for the same input
// object, so callers that send the literal same object twice are safe;
// callers that round-trip through other languages or rebuild the payload
// between retries must enforce determinism themselves.
//
// See PRD 11 §4.1 (column comment) + §5.5 for the contract surface.

import { createHash } from 'node:crypto'
import { supabaseAdmin } from './supabase'

export type IdempotencyResult =
  | { cached: false; persist: (status: number, body: unknown) => Promise<void> }
  | { cached: true; status: number; body: unknown }

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly payload: object,
  ) {
    super(`HTTP ${status}`)
    this.name = 'HttpError'
  }
}

const KEY_PATTERN = /^[a-zA-Z0-9_-]{16,64}$/

export async function verifyIdempotency(
  req: Request,
  userId: string,
  endpoint: string,
): Promise<IdempotencyResult> {
  const key = req.headers.get('X-Idempotency-Key')
  if (!key) {
    return { cached: false, persist: async () => {} }
  }
  if (!KEY_PATTERN.test(key)) {
    throw new HttpError(400, { error: 'invalid_idempotency_key' })
  }

  const bodyText = await req.clone().text()
  const requestHash = createHash('sha256')
    .update(`${req.method}|${new URL(req.url).pathname}|${bodyText}`)
    .digest('hex')

  const { data: existing } = await supabaseAdmin
    .from('idempotency_keys')
    .select('request_hash, response_status, response_body')
    .eq('key', key)
    .maybeSingle()

  if (existing) {
    if (existing.request_hash !== requestHash) {
      throw new HttpError(422, {
        error: 'idempotency_key_reused_with_different_body',
      })
    }
    return {
      cached: true,
      status: existing.response_status as number,
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
