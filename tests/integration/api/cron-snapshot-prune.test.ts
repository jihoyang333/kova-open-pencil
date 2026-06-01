import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { createClient } from '@supabase/supabase-js'
import { seedTestUser, seedBrand, seedCanvas } from '../helpers/seed'
import handler from '../../../api/cron/snapshot-prune'

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

d('snapshot-prune cron (integration)', () => {
  let canvasId: string

  beforeAll(async () => {
    process.env['CRON_SECRET'] = SECRET
    const userId = await seedTestUser({ plan: 'free' })
    const brandId = await seedBrand({ user_id: userId })
    canvasId = await seedCanvas({ brand_id: brandId })
    const old = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString()
    const recent = new Date().toISOString()
    await admin.from('canvas_snapshots').insert([
      ...[0, 1, 2].map((i) => ({
        canvas_id: canvasId, brand_id: brandId, user_id: userId, kind: 'autosave',
        retention_class: 'free', scene_blob_path: `prune/old-${i}`, scene_size_bytes: 1, taken_at: old,
      })),
      ...[0, 1].map((i) => ({
        canvas_id: canvasId, brand_id: brandId, user_id: userId, kind: 'autosave',
        retention_class: 'free', scene_blob_path: `prune/new-${i}`, scene_size_bytes: 1, taken_at: recent,
      })),
      {
        canvas_id: canvasId, brand_id: brandId, user_id: userId, kind: 'manual',
        retention_class: 'permanent', scene_blob_path: 'prune/manual-old', scene_size_bytes: 1, taken_at: old,
      },
    ])
  })

  afterAll(() => {
    if (ORIG === undefined) delete process.env['CRON_SECRET']
    else process.env['CRON_SECRET'] = ORIG
  })

  it('prunes only old free-tier autosaves; keeps recent autosaves + manual', async () => {
    const res = await handler(
      new Request('http://x', { method: 'POST', headers: { authorization: `Bearer ${SECRET}` }, body: '{}' }),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)

    const { data: remaining } = await admin
      .from('canvas_snapshots')
      .select('scene_blob_path')
      .eq('canvas_id', canvasId)
    const paths = (remaining ?? []).map((r) => r.scene_blob_path).sort()
    expect(paths).toEqual(['prune/manual-old', 'prune/new-0', 'prune/new-1'])
  })
})
