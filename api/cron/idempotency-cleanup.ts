import { createClient } from '@supabase/supabase-js'

import { loadEnvOrSkip, requireEnv } from '../_shared/env'

// W6 Cluster 11 Phase 5c — idempotency-keys cleanup cron (Plan 11 Task 1.8).
//
// Daily 04:00 UTC. Deletes idempotency_keys rows older than 24 h.
// Wired in vercel.json crons array.
//
// Stub-guard: if CRON_SECRET is missing the handler returns 503
// { stub: true } and never touches the database. Real wiring happens
// pre-launch per scope-plan §11.

export const config = { runtime: 'edge' as const }

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000
const JSON_HEADERS = { 'Content-Type': 'application/json' } as const

interface CleanupResponse {
  ok: boolean
  deleted?: number
  stub?: boolean
  error?: string
}

function jsonResponse(body: CleanupResponse, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS })
}

export default async function handler(req: Request): Promise<Response> {
  const cronSecret = loadEnvOrSkip('CRON_SECRET')
  if (cronSecret === null) {
    return jsonResponse({ ok: false, stub: true, error: 'CRON_SECRET not configured' }, 503)
  }

  if (req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return jsonResponse({ ok: false, error: 'Unauthorized' }, 401)
  }

  const supabaseUrl = requireEnv('SUPABASE_URL')
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
  const admin = createClient(supabaseUrl, serviceRoleKey)

  const cutoff = new Date(Date.now() - TWENTY_FOUR_HOURS_MS).toISOString()

  const { error, count } = await admin
    .from('idempotency_keys')
    .delete({ count: 'exact' })
    .lt('created_at', cutoff)

  if (error) {
    return jsonResponse({ ok: false, error: error.message }, 500)
  }

  return jsonResponse({ ok: true, deleted: count ?? 0 }, 200)
}
