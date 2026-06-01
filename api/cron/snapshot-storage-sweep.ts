import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import { loadEnvOrSkip, requireEnv } from '../_shared/env'

// PRD 09 §8.3 — weekly Storage orphan sweep (Plan 09 Task 20b, W4 C-HIGH9).
//
// Sundays 05:00 UTC. Diffs the canvas-snapshots bucket against every DB-referenced
// path (canvas_snapshots.scene_blob_path + thumbnail_path AND
// canvases.initial_state_blob_path) and deletes objects with no matching row.
// Catches blobs leaked by transient Storage remove() failures in snapshot-prune.
//
// Stub-guard: if CRON_SECRET is missing returns 503 { stub: true }.

export const config = { runtime: 'edge' as const }

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const
const LIST_PAGE = 1000
const REMOVE_CHUNK = 100
const MAX_DEPTH = 6 // {user}/{brand}/{canvas}/{snap}.ext and {user}/thumbnails/{brand}/{canvas}/{snap}.png

interface SweepResponse {
  ok: boolean
  storage_objects?: number
  db_paths?: number
  orphans?: number
  removed?: number
  remove_failures?: number
  stub?: boolean
  error?: string
}

function jsonResponse(body: SweepResponse, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS })
}

// Recursively enumerate every object path in the bucket. Supabase storage.list
// returns immediate children; a row with a null id is a folder to recurse into.
async function listAllObjects(admin: SupabaseClient, bucket: string): Promise<Set<string>> {
  const out = new Set<string>()
  async function walk(prefix: string, depth: number): Promise<void> {
    if (depth > MAX_DEPTH) return
    let offset = 0
    for (;;) {
      const { data, error } = await admin.storage
        .from(bucket)
        .list(prefix, { limit: LIST_PAGE, offset, sortBy: { column: 'name', order: 'asc' } })
      if (error) throw new Error(error.message)
      const page = data ?? []
      for (const obj of page) {
        const full = prefix ? `${prefix}/${obj.name}` : obj.name
        // A folder placeholder has a null id; a real object has a non-null id.
        if ((obj as { id: string | null }).id === null) {
          await walk(full, depth + 1)
        } else {
          out.add(full)
        }
      }
      if (page.length < LIST_PAGE) break
      offset += LIST_PAGE
    }
  }
  await walk('', 0)
  return out
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

  let storagePaths: Set<string>
  try {
    storagePaths = await listAllObjects(admin, 'canvas-snapshots')
  } catch (e) {
    return jsonResponse({ ok: false, error: (e as Error).message }, 500)
  }

  const dbPaths = new Set<string>()
  const [snapRes, canvasRes] = await Promise.all([
    admin.from('canvas_snapshots').select('scene_blob_path, thumbnail_path'),
    admin.from('canvases').select('initial_state_blob_path'),
  ])
  if (snapRes.error || canvasRes.error) {
    return jsonResponse({ ok: false, error: snapRes.error?.message ?? canvasRes.error?.message }, 500)
  }
  for (const r of (snapRes.data ?? []) as Array<{ scene_blob_path: string; thumbnail_path: string | null }>) {
    dbPaths.add(r.scene_blob_path)
    if (r.thumbnail_path) dbPaths.add(r.thumbnail_path)
  }
  for (const r of (canvasRes.data ?? []) as Array<{ initial_state_blob_path: string | null }>) {
    if (r.initial_state_blob_path) dbPaths.add(r.initial_state_blob_path)
  }

  const orphans: string[] = []
  for (const p of storagePaths) if (!dbPaths.has(p)) orphans.push(p)

  let removed = 0
  let removeFailures = 0
  for (let i = 0; i < orphans.length; i += REMOVE_CHUNK) {
    const chunk = orphans.slice(i, i + REMOVE_CHUNK)
    const { error: rmErr } = await admin.storage.from('canvas-snapshots').remove(chunk)
    if (rmErr) removeFailures += chunk.length
    else removed += chunk.length
  }

  return jsonResponse(
    {
      ok: true,
      storage_objects: storagePaths.size,
      db_paths: dbPaths.size,
      orphans: orphans.length,
      removed,
      remove_failures: removeFailures,
    },
    200,
  )
}
