import { beforeAll, describe, expect, it } from 'bun:test'
import { createClient } from '@supabase/supabase-js'
import { seedTestUser, seedBrand, seedCanvas, signInAs } from '../helpers/seed'
import handler from '../../../api/snapshots/duplicate-to-canvas'

const SHOULD_RUN =
  process.env['KOVA_RUN_INTEGRATION'] === '1' &&
  !!process.env['SUPABASE_URL'] &&
  !!process.env['SUPABASE_SERVICE_ROLE_KEY']
const d = SHOULD_RUN ? describe : describe.skip

const admin = SHOULD_RUN
  ? createClient(process.env['SUPABASE_URL']!, process.env['SUPABASE_SERVICE_ROLE_KEY']!, {
      auth: { persistSession: false },
    })
  : (null as never)

function post(token: string, idemKey: string, snapshotId: string): Request {
  return new Request('http://x/api/snapshots/duplicate-to-canvas', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'X-Idempotency-Key': idemKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ snapshot_id: snapshotId }),
  })
}

d('duplicate-to-canvas (integration)', () => {
  let token: string, snapshotId: string, userId: string, brandId: string

  beforeAll(async () => {
    userId = await seedTestUser({ plan: 'solo' })
    brandId = await seedBrand({ user_id: userId })
    const canvasId = await seedCanvas({ brand_id: brandId })
    const client = await signInAs(userId)
    token = (await client.auth.getSession()).data.session!.access_token

    const blobPath = `${userId}/${brandId}/${canvasId}/${crypto.randomUUID()}.kiwi.zst`
    await admin.storage.from('canvas-snapshots').upload(blobPath, new Uint8Array([5, 6, 7, 8]), {
      contentType: 'application/octet-stream',
    })
    const { data: id } = await client.rpc('create_snapshot', {
      p_canvas_id: canvasId, p_kind: 'manual', p_label: 'Source v1', p_description: null,
      p_scene_blob_path: blobPath, p_scene_size_bytes: 4, p_thumbnail_path: null, p_parent_snapshot_id: null,
    })
    snapshotId = id as string
  })

  it('creates a seeded copy canvas + "Duplicated from" snapshot, stamps initial_state_blob_path', async () => {
    const key = `dup${crypto.randomUUID().replace(/-/g, '')}`.slice(0, 40)
    const res = await handler(post(token, key, snapshotId))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.canvas_id).toMatch(/^[0-9a-f-]{36}$/)
    expect(body.redirect_to).toBe(`/canvas/${body.canvas_id}`)

    const { data: canvas } = await admin
      .from('canvases')
      .select('initial_state_blob_path, brand_id')
      .eq('id', body.canvas_id)
      .single()
    expect(canvas?.brand_id).toBe(brandId)
    expect(canvas?.initial_state_blob_path).toMatch(new RegExp(`^${userId}/${brandId}/${body.canvas_id}/`))

    const { data: snap } = await admin
      .from('canvas_snapshots')
      .select('label, parent_snapshot_id, scene_blob_path')
      .eq('canvas_id', body.canvas_id)
      .single()
    expect(snap?.label).toBe('Duplicated from Source v1')
    expect(snap?.parent_snapshot_id).toBe(snapshotId)
    expect(canvas?.initial_state_blob_path).toBe(snap?.scene_blob_path)
  })

  it('idempotent replay with the same key returns the same canvas_id', async () => {
    const key = `idem${crypto.randomUUID().replace(/-/g, '')}`.slice(0, 40)
    const first = await (await handler(post(token, key, snapshotId))).json()
    const second = await (await handler(post(token, key, snapshotId))).json()
    expect(second.canvas_id).toBe(first.canvas_id)
  })
})
