// Daily cron: prune idempotency_keys older than 24h (Cluster 11 Plan Task 1.8).
//
// STUB-mode behavior (founder lock #19 / 00-PRD_SCOPE_PLAN §11): returns
// 503 { stub: true } when CRON_SECRET is unset so dev / preview deployments
// don't 401-fail the cron endpoint. The vercel.json schedule still fires but
// the handler short-circuits with a stub response. Pre-launch §11 sets the
// secret and the handler switches into the real prune branch.
//
// Auth model: callers must send `Authorization: Bearer <CRON_SECRET>`. The
// Vercel scheduler injects this header automatically when the cron config has
// CRON_SECRET; manual probes from terminals fail with 401 unless the header
// is supplied.

import { supabaseAdmin } from '../_shared/supabase'

export const maxDuration = 60

const RETENTION_MS = 24 * 60 * 60 * 1000

export default async function handler(req: Request): Promise<Response> {
  const secret = process.env['CRON_SECRET']
  if (!secret) {
    console.warn(
      '[cron] CRON_SECRET missing — idempotency-cleanup disabled (stub mode)',
    )
    return Response.json(
      { stub: true, message: 'CRON_SECRET not configured' },
      { status: 503 },
    )
  }

  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${secret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const cutoff = new Date(Date.now() - RETENTION_MS).toISOString()
  const { error, count } = await supabaseAdmin
    .from('idempotency_keys')
    .delete({ count: 'exact' })
    .lt('created_at', cutoff)

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
  return Response.json({ deleted: count ?? 0 }, { status: 200 })
}
