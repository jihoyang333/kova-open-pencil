import { createClient } from '@supabase/supabase-js'

import { requireEnv } from '../_shared/env'
import { verifyAuthFull, UnauthenticatedError } from '../_shared/verify-auth-full'
import { verifyIdempotency, IdempotencyHttpError } from '../_shared/idempotency'

// PRD 09 §5.1.1 — duplicate-to-canvas (Plan 09 Task 19).
//
// Reads a snapshot the caller owns, creates a new canvas seeded from that
// snapshot's blob, stamps canvases.initial_state_blob_path (W4 C-HIGH7) so the
// new canvas hydrates from the blob on first open, and inserts a "Duplicated
// from ..." snapshot row whose id matches the Storage path (W4 C-MED23).
// Idempotent via X-Idempotency-Key (W4 C-MED22).

export const config = { runtime: 'edge' as const }

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const
const ENDPOINT = 'POST /api/snapshots/duplicate-to-canvas'

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS })
}

export default async function handler(req: Request): Promise<Response> {
  let userId: string
  try {
    ;({ userId } = await verifyAuthFull(req))
  } catch (e) {
    if (e instanceof UnauthenticatedError) return json({ error: 'unauthenticated' }, 401)
    throw e
  }

  let body: { snapshot_id?: string; target_brand_id?: string }
  try {
    body = (await req.clone().json()) as typeof body
  } catch {
    return json({ error: 'bad_request' }, 400)
  }
  if (!body.snapshot_id) return json({ error: 'bad_request' }, 400)
  const { snapshot_id, target_brand_id } = body

  const url = requireEnv('SUPABASE_URL')
  const admin = createClient(url, requireEnv('SUPABASE_SERVICE_ROLE_KEY'))
  const authHeader = req.headers.get('Authorization') ?? req.headers.get('authorization')!
  const userClient = createClient(url, requireEnv('VITE_SUPABASE_ANON_KEY'), {
    auth: { persistSession: false },
    global: { headers: { Authorization: authHeader } },
  })

  // Idempotency replay → return cached response without creating a second canvas.
  let idem: Awaited<ReturnType<typeof verifyIdempotency>>
  try {
    idem = await verifyIdempotency(admin, req, userId, ENDPOINT)
  } catch (e) {
    if (e instanceof IdempotencyHttpError) return json(e.body, e.status)
    throw e
  }
  if (idem.cached) return json(idem.body, idem.status)

  // 1. Read the source snapshot (RLS-gated to the caller's brands).
  const { data: snap, error: snapErr } = await userClient
    .from('canvas_snapshots')
    .select('canvas_id, brand_id, scene_blob_path, label, taken_at')
    .eq('id', snapshot_id)
    .single()
  if (snapErr || !snap) return json({ error: 'snapshot_not_found' }, 404)

  // 2. Resolve + verify target brand ownership.
  const targetBrand = target_brand_id ?? (snap.brand_id as string)
  const { data: ownedBrand } = await userClient.from('brands').select('id').eq('id', targetBrand).maybeSingle()
  if (!ownedBrand) return json({ error: 'brand_not_found' }, 404)

  // 3. Download the source blob.
  const { data: blobData, error: dlErr } = await admin.storage.from('canvas-snapshots').download(snap.scene_blob_path)
  if (dlErr || !blobData) return json({ error: 'internal_error' }, 500)
  const blobBytes = new Uint8Array(await blobData.arrayBuffer())

  // 4. Create the new canvas (RLS insert under the target brand).
  const sourceLabel = (snap.label as string | null) || new Date(snap.taken_at as string).toLocaleString()
  const { data: newCanvas, error: cErr } = await userClient
    .from('canvases')
    .insert({ brand_id: targetBrand, name: `${sourceLabel} (copy)` })
    .select('id')
    .single()
  if (cErr || !newCanvas) return json({ error: 'internal_error' }, 500)
  const newCanvasId = newCanvas.id as string

  // 5. Pre-generate the snapshot id so the Storage path embeds it (§4.3 invariant).
  const newSnapshotId = crypto.randomUUID()
  const newBlobPath = `${userId}/${targetBrand}/${newCanvasId}/${newSnapshotId}.kiwi.zst`

  // 6. Upload the blob to the new canvas's path.
  const { error: upErr } = await admin.storage
    .from('canvas-snapshots')
    .upload(newBlobPath, blobBytes, { contentType: 'application/octet-stream' })
  if (upErr) return json({ error: 'internal_error' }, 500)

  // 7. Stamp the hydration path + insert the snapshot row (independent → parallel).
  const [stampRes, snapInsertRes] = await Promise.all([
    admin.from('canvases').update({ initial_state_blob_path: newBlobPath }).eq('id', newCanvasId),
    userClient.rpc('create_snapshot', {
      p_canvas_id: newCanvasId,
      p_kind: 'manual',
      p_label: `Duplicated from ${sourceLabel}`,
      p_description: null,
      p_scene_blob_path: newBlobPath,
      p_scene_size_bytes: blobBytes.byteLength,
      p_thumbnail_path: null,
      p_parent_snapshot_id: snapshot_id,
      p_id: newSnapshotId,
    }),
  ])
  if (stampRes.error || snapInsertRes.error) return json({ error: 'internal_error' }, 500)

  const responseBody = { canvas_id: newCanvasId, redirect_to: `/canvas/${newCanvasId}` }
  await idem.persist?.(200, responseBody)
  return json(responseBody, 200)
}
