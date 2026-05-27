import type { SupabaseClient } from '@supabase/supabase-js'

// W9b audit H1 — shared per-(user, endpoint) rate limiter.
//
// Backed by public.bump_rate_limit (atomic INSERT ... ON CONFLICT DO UPDATE
// on public.rate_limits, B-CRIT8 lock). Window is the floor of the current
// minute, so counters reset on a 60-second tick.
//
// Fail-open: if bump_rate_limit raises (DB hiccup, role mis-grant, table
// missing), the call is allowed through and the failure is logged. Rate
// limiting is a soft defence, not a security primitive — we never block a
// legitimate user because the limiter itself is broken.
//
// Consumed by every brand Edge Function per PRD 03 §5.1.{1-5} caps:
//   create  — 30 / min
//   rename  — 60 / min
//   archive — 30 / min
//   restore — 30 / min
//   delete  — 10 / min   (intentionally aggressive on the destructive path)

export interface RateLimitResult {
  allowed: boolean
  count: number
}

export async function enforceRateLimit(
  admin: SupabaseClient,
  userId: string,
  endpoint: string,
  maxPerMinute: number
): Promise<RateLimitResult> {
  const windowStart = new Date(Math.floor(Date.now() / 60_000) * 60_000).toISOString()
  const { data, error } = await admin.rpc('bump_rate_limit', {
    p_user_id: userId,
    p_endpoint: endpoint,
    p_window_start: windowStart,
  })
  if (error) {
    console.warn(
      `[rate-limit] bump_rate_limit failed (fail-open) for ${endpoint}: ${error.message}`
    )
    return { allowed: true, count: 0 }
  }
  const count = typeof data === 'number' ? data : 0
  return { allowed: count <= maxPerMinute, count }
}

export function rateLimitResponse(): Response {
  return new Response(
    JSON.stringify({
      error: 'rate_limited',
      retry_after_seconds: 60,
      request_id: crypto.randomUUID(),
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': '60',
      },
    }
  )
}
