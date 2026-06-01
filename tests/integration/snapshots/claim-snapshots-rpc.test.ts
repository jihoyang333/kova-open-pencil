import { describe, expect, it, beforeAll } from 'bun:test'
import { createClient } from '@supabase/supabase-js'
import { seedTestUser, seedBrand, seedCanvas } from '../helpers/seed'

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

d('claim_snapshots_for_prune RPC', () => {
  beforeAll(async () => {
    const userId = await seedTestUser({ plan: 'free' })
    const brandId = await seedBrand({ user_id: userId })
    const canvasId = await seedCanvas({ brand_id: brandId })
    const rows = Array.from({ length: 100 }, (_, i) => ({
      canvas_id: canvasId, brand_id: brandId, user_id: userId,
      kind: 'autosave', retention_class: 'free',
      scene_blob_path: `seed/${i}`, scene_size_bytes: 1024,
      taken_at: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString(),
    }))
    const { error } = await admin.from('canvas_snapshots').insert(rows)
    expect(error).toBeNull()
  })

  it('two concurrent calls never claim the same row, together drain all 100', async () => {
    const [a, b] = await Promise.all([
      admin.rpc('claim_snapshots_for_prune', { p_batch_size: 50 }),
      admin.rpc('claim_snapshots_for_prune', { p_batch_size: 50 }),
    ])
    const idsA = new Set((a.data as Array<{ id: string }>).map((r) => r.id))
    const idsB = new Set((b.data as Array<{ id: string }>).map((r) => r.id))
    const intersection = [...idsA].filter((id) => idsB.has(id))
    expect(intersection).toEqual([])
    expect(idsA.size + idsB.size).toBe(100)
  })

  it('a follow-up claim returns no rows (already claimed)', async () => {
    const { data } = await admin.rpc('claim_snapshots_for_prune', { p_batch_size: 1000 })
    expect((data as unknown[]).length).toBe(0)
  })
})
