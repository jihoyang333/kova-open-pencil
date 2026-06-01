import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { createClient } from '@supabase/supabase-js'
import { seedTestUser, seedBrand, seedCanvas } from '../helpers/seed'
import handler from '../../../api/cron/snapshot-storage-sweep'

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

const SECRET = 'test-cron-secret'
const ORIG = process.env['CRON_SECRET']
const bytes = new Uint8Array([1, 2, 3])
const opts = { contentType: 'application/octet-stream' }

d('snapshot-storage-sweep cron (integration)', () => {
  let userId: string, brandId: string, canvasId: string
  let referenced: string, orphan: string, seedHydrate: string

  beforeAll(async () => {
    process.env['CRON_SECRET'] = SECRET
    userId = await seedTestUser({ plan: 'free' })
    brandId = await seedBrand({ user_id: userId })
    canvasId = await seedCanvas({ brand_id: brandId })
    referenced = `${userId}/${brandId}/${canvasId}/referenced.kiwi.zst`
    orphan = `${userId}/${brandId}/${canvasId}/orphan.kiwi.zst`
    seedHydrate = `${userId}/${brandId}/${canvasId}/seed-hydrate.kiwi.zst`

    await admin.storage.from('canvas-snapshots').upload(referenced, bytes, opts)
    await admin.storage.from('canvas-snapshots').upload(orphan, bytes, opts)
    await admin.storage.from('canvas-snapshots').upload(seedHydrate, bytes, opts)

    // referenced -> has a snapshot row; seedHydrate -> referenced only via canvases.initial_state_blob_path
    await admin.from('canvas_snapshots').insert({
      canvas_id: canvasId, brand_id: brandId, user_id: userId, kind: 'manual',
      retention_class: 'permanent', scene_blob_path: referenced, scene_size_bytes: 3,
    })
    await admin.from('canvases').update({ initial_state_blob_path: seedHydrate }).eq('id', canvasId)
  })

  afterAll(async () => {
    if (ORIG === undefined) delete process.env['CRON_SECRET']
    else process.env['CRON_SECRET'] = ORIG
    await admin.storage.from('canvas-snapshots').remove([referenced, seedHydrate])
  })

  it('removes orphan blobs but preserves snapshot- and initial_state-referenced blobs', async () => {
    const res = await handler(
      new Request('http://x', { method: 'POST', headers: { authorization: `Bearer ${SECRET}` }, body: '{}' }),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)

    const exists = async (path: string): Promise<boolean> => {
      const { data } = await admin.storage.from('canvas-snapshots').createSignedUrl(path, 60)
      return !!data?.signedUrl
    }
    expect(await exists(referenced)).toBe(true)
    expect(await exists(seedHydrate)).toBe(true)
    expect(await exists(orphan)).toBe(false)
  })
})
