import { createClient } from '@supabase/supabase-js'

import { loadEnvOrSkip, requireEnv } from '../_shared/env'
import { SNAPSHOT_FREE_RETENTION_DAYS } from '../../src/config/feature-flags'

// PRD 09 §5.1.2 — snapshot-prune cron (Plan 09 Task 20).
//
// Daily 04:00 UTC. Deletes free-tier autosave snapshots older than
// SNAPSHOT_FREE_RETENTION_DAYS. Rows are claimed atomically via the
// claim_snapshots_for_prune RPC (FOR UPDATE SKIP LOCKED, W4 C-HIGH8) so two
// concurrent / retried invocations cannot race on Storage remove + DELETE.
// Storage remove failures do not block the DB DELETE — orphan blobs are
// reconciled by the weekly storage-sweep cron (Task 20b, W4 C-HIGH9).
//
// Stub-guard: if CRON_SECRET is missing the handler returns 503 { stub: true }
// and never touches the database. Real wiring happens pre-launch per scope-plan §11.

export const config = { runtime: 'edge' as const }

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const
const BATCH_SIZE = 1000
const STORAGE_REMOVE_CHUNK = 100

interface PruneResponse {
  ok: boolean
  scanned?: number
  pruned?: number
  storage_failures?: number
  stub?: boolean
  error?: string
}

interface ClaimedRow {
  id: string
  scene_blob_path: string
  thumbnail_path: string | null
}

function jsonResponse(body: PruneResponse, status: number): Response {
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

  const admin = createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'))

  const { data: rows, error: claimErr } = await admin.rpc('claim_snapshots_for_prune', {
    p_batch_size: BATCH_SIZE,
    p_retention_days: SNAPSHOT_FREE_RETENTION_DAYS,
  })
  if (claimErr) {
    return jsonResponse({ ok: false, error: claimErr.message }, 500)
  }
  const claimed = (rows ?? []) as ClaimedRow[]
  const scanned = claimed.length
  if (scanned === 0) {
    return jsonResponse({ ok: true, scanned: 0, pruned: 0, storage_failures: 0 }, 200)
  }

  // Remove Storage blobs (chunked). Failures are counted but never block the DB DELETE.
  const paths = claimed.flatMap((r) =>
    [r.scene_blob_path, r.thumbnail_path].filter((p): p is string => !!p),
  )
  let storageFailures = 0
  for (let i = 0; i < paths.length; i += STORAGE_REMOVE_CHUNK) {
    const chunk = paths.slice(i, i + STORAGE_REMOVE_CHUNK)
    const { error: rmErr } = await admin.storage.from('canvas-snapshots').remove(chunk)
    if (rmErr) storageFailures += chunk.length
  }

  const ids = claimed.map((r) => r.id)
  const { error: delErr } = await admin.from('canvas_snapshots').delete().in('id', ids)
  if (delErr) {
    return jsonResponse({ ok: false, error: delErr.message }, 500)
  }

  return jsonResponse({ ok: true, scanned, pruned: ids.length, storage_failures: storageFailures }, 200)
}
