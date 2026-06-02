import { afterAll, beforeAll, describe, expect, test } from 'bun:test'

/**
 * Cluster 10 Plan Task 2 — Integration test for
 * chat_conversations.product_references column + validation trigger.
 *
 * Runs only when:
 *   1) KOVA_RUN_INTEGRATION=1
 *   2) SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY set
 *   3) Local supabase is up (`supabase start`) with M5 chat persistence
 *      (20260401_m5_chat_persistence.sql) + this migration
 *      (20260620_10_chat_product_references.sql) applied
 *
 * Skip-guarded so the portable unit suite stays green without a stack.
 * Verifies: default [], accepts valid array, trigger rejects non-array,
 * trigger rejects > 20 entries.
 */

const SHOULD_RUN =
  process.env['KOVA_RUN_INTEGRATION'] === '1' &&
  !!process.env['SUPABASE_URL'] &&
  !!process.env['SUPABASE_SERVICE_ROLE_KEY']

const suite = SHOULD_RUN ? describe : describe.skip

interface ServiceClient {
  from: (table: string) => {
    insert: (row: Record<string, unknown>) => {
      select: (cols: string) => { single: () => Promise<{ data: { id: string } | null; error: unknown }> }
    }
    select: (cols: string) => {
      eq: (col: string, val: unknown) => {
        single: () => Promise<{ data: { product_references: unknown } | null; error: { message: string } | null }>
      }
    }
    update: (row: Record<string, unknown>) => {
      eq: (col: string, val: unknown) => Promise<{ error: { message: string } | null }>
    }
    delete: () => { eq: (col: string, val: unknown) => Promise<{ error: unknown }> }
  }
  auth: {
    admin: {
      createUser: (a: Record<string, unknown>) => Promise<{ data: { user: { id: string } | null }; error: unknown }>
      deleteUser: (id: string) => Promise<unknown>
    }
  }
}

const makeRef = (i: number) => ({
  product_id: `gid://shopify/Product/${i}`,
  title: `P${i}`,
  primary_image_url: null,
  price_low: '0.00',
  price_high: null,
  currency: 'USD',
  handle: `p${i}`,
  added_at: '2026-06-20T00:00:00Z',
})

suite('chat_conversations.product_references migration (integration)', () => {
  let supabase: ServiceClient
  let userId = ''
  let brandId = ''
  let canvasId = ''
  let convId = ''

  beforeAll(async () => {
    const { createClient } = await import('@supabase/supabase-js')
    supabase = createClient(
      process.env['SUPABASE_URL']!,
      process.env['SUPABASE_SERVICE_ROLE_KEY']!,
    ) as unknown as ServiceClient

    const { data: u, error: uErr } = await supabase.auth.admin.createUser({
      email: `c10-prodref-${Date.now()}@kova.test`,
      password: `pw-${Math.random().toString(36).slice(2)}`,
      email_confirm: true,
    })
    if (uErr || !u.user) throw new Error(`createUser failed: ${JSON.stringify(uErr)}`)
    userId = u.user.id

    const { data: b, error: bErr } = await supabase
      .from('brands')
      .insert({ user_id: userId, name: 'Test Brand' })
      .select('id')
      .single()
    if (bErr || !b) throw new Error(`brand insert failed: ${JSON.stringify(bErr)}`)
    brandId = b.id

    const { data: cv, error: cvErr } = await supabase
      .from('canvases')
      .insert({ brand_id: brandId, name: 'Test Canvas' })
      .select('id')
      .single()
    if (cvErr || !cv) throw new Error(`canvas insert failed: ${JSON.stringify(cvErr)}`)
    canvasId = cv.id

    const { data: c, error: cErr } = await supabase
      .from('chat_conversations')
      .insert({ user_id: userId, brand_id: brandId, canvas_id: canvasId })
      .select('id')
      .single()
    if (cErr || !c) throw new Error(`conversation insert failed: ${JSON.stringify(cErr)}`)
    convId = c.id
  })

  afterAll(async () => {
    if (convId) await supabase.from('chat_conversations').delete().eq('id', convId)
    if (canvasId) await supabase.from('canvases').delete().eq('id', canvasId)
    if (brandId) await supabase.from('brands').delete().eq('id', brandId)
    if (userId) await supabase.auth.admin.deleteUser(userId)
  })

  test('column exists with default []', async () => {
    const { data, error } = await supabase
      .from('chat_conversations')
      .select('product_references')
      .eq('id', convId)
      .single()
    expect(error).toBeNull()
    expect(data?.product_references).toEqual([])
  })

  test('accepts valid array of references', async () => {
    const { error } = await supabase
      .from('chat_conversations')
      .update({ product_references: [makeRef(1)] })
      .eq('id', convId)
    expect(error).toBeNull()
  })

  test('rejects non-array via trigger', async () => {
    const { error } = await supabase
      .from('chat_conversations')
      .update({ product_references: { not: 'array' } })
      .eq('id', convId)
    expect(error?.message ?? '').toContain('must be a JSONB array')
  })

  test('rejects more than 20 entries via trigger', async () => {
    const refs = Array.from({ length: 21 }, (_, i) => makeRef(i))
    const { error } = await supabase
      .from('chat_conversations')
      .update({ product_references: refs })
      .eq('id', convId)
    expect(error?.message ?? '').toContain('exceeds maximum of 20')
  })
})
