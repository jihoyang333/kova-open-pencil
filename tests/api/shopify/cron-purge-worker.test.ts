import { describe, it, expect, mock, beforeEach, beforeAll, afterAll } from 'bun:test'

const BRAND_A = 'brand-purge-a'
const BRAND_B = 'brand-purge-b'
const QUEUE_ROW_1 = 'queue-row-uuid-1'
const QUEUE_ROW_2 = 'queue-row-uuid-2'
const PAST_DATE = '2026-04-01T00:00:00.000Z'

let pendingRows: Array<{ id: string; brand_id: string; scheduled_at: string }> = []
const deleteCalls: Array<{ table: string; brandId?: string; ids?: string[] }> = []
const queueCompletions: Array<{ id: string }> = []
let variantIdsByBrand: Record<string, string[]> = {}
let collectionIdsByBrand: Record<string, string[]> = {}
let failBrandsOnDelete: Set<string> = new Set()
let queueQueryError: { message: string } | null = null

let handler: (req: Request) => Promise<Response>

describe('GET /api/shopify/cron/purge-worker', () => {
  beforeAll(async () => {
    mock.module('@supabase/supabase-js', () => ({
      createClient: () => ({
        from: (table: string) => {
          if (table === 'shopify_purge_queue') {
            return {
              select: (_cols: string) => ({
                lt: (_col: string, _val: unknown) => ({
                  is: (_col2: string, _val2: unknown) => ({
                    data: queueQueryError ? null : pendingRows,
                    error: queueQueryError,
                  }),
                }),
              }),
              update: (fields: Record<string, unknown>) => ({
                eq: (_col: string, id: unknown) => {
                  if (fields.completed_at) {
                    queueCompletions.push({ id: id as string })
                  }
                  return { error: null }
                },
              }),
            }
          }

          if (table === 'shopify_variants') {
            return {
              select: (_cols: string) => ({
                eq: (_col: string, brandId: unknown) => ({
                  data: (variantIdsByBrand[brandId as string] ?? []).map((id) => ({ id })),
                  error: null,
                }),
              }),
              delete: () => ({
                eq: (_col: string, brandId: unknown) => {
                  if (failBrandsOnDelete.has(brandId as string)) {
                    return { error: { message: `delete failed for ${brandId}` } }
                  }
                  deleteCalls.push({ table, brandId: brandId as string })
                  return { error: null }
                },
              }),
            }
          }

          if (table === 'shopify_collections') {
            return {
              select: (_cols: string) => ({
                eq: (_col: string, brandId: unknown) => ({
                  data: (collectionIdsByBrand[brandId as string] ?? []).map((id) => ({ id })),
                  error: null,
                }),
              }),
              delete: () => ({
                eq: (_col: string, brandId: unknown) => {
                  if (failBrandsOnDelete.has(brandId as string)) {
                    return { error: { message: `delete failed for ${brandId}` } }
                  }
                  deleteCalls.push({ table, brandId: brandId as string })
                  return { error: null }
                },
              }),
            }
          }

          if (table === 'shopify_variant_prices') {
            return {
              delete: () => ({
                in: (_col: string, ids: unknown[]) => {
                  deleteCalls.push({ table, ids: ids as string[] })
                  return { error: null }
                },
              }),
            }
          }

          if (table === 'shopify_collection_products') {
            return {
              delete: () => ({
                in: (_col: string, ids: unknown[]) => {
                  deleteCalls.push({ table, ids: ids as string[] })
                  return { error: null }
                },
              }),
            }
          }

          // All other tables: brand_id-scoped delete
          return {
            delete: () => ({
              eq: (_col: string, brandId: unknown) => {
                if (failBrandsOnDelete.has(brandId as string)) {
                  return { error: { message: `delete failed for ${brandId}` } }
                }
                deleteCalls.push({ table, brandId: brandId as string })
                return { error: null }
              },
            }),
          }
        },
      }),
    }))

    const mod = await import('../../../api/shopify/cron/purge-worker')
    handler = mod.default
  })

  afterAll(() => mock.restore())

  beforeEach(() => {
    process.env.SUPABASE_URL = 'http://localhost:54321'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role'
    delete process.env.CRON_SECRET

    deleteCalls.length = 0
    queueCompletions.length = 0
    pendingRows = []
    variantIdsByBrand = {}
    collectionIdsByBrand = {}
    failBrandsOnDelete = new Set()
    queueQueryError = null
  })

  // --- Auth ---

  it('allows requests when CRON_SECRET is not set', async () => {
    const res = await handler(new Request('http://local/api/shopify/cron/purge-worker'))
    expect(res.status).toBe(200)
  })

  it('401 when CRON_SECRET is set and Authorization header is absent', async () => {
    process.env.CRON_SECRET = 'secret-purge'
    const res = await handler(new Request('http://local/api/shopify/cron/purge-worker'))
    expect(res.status).toBe(401)
    expect(deleteCalls.length).toBe(0)
  })

  it('401 when CRON_SECRET is set and Authorization header is wrong', async () => {
    process.env.CRON_SECRET = 'secret-purge'
    const res = await handler(
      new Request('http://local/api/shopify/cron/purge-worker', {
        headers: { authorization: 'Bearer wrong' },
      }),
    )
    expect(res.status).toBe(401)
    expect(deleteCalls.length).toBe(0)
  })

  it('200 when CRON_SECRET matches', async () => {
    process.env.CRON_SECRET = 'secret-purge'
    const res = await handler(
      new Request('http://local/api/shopify/cron/purge-worker', {
        headers: { authorization: 'Bearer secret-purge' },
      }),
    )
    expect(res.status).toBe(200)
  })

  // --- Env config ---

  it('500 when SUPABASE_URL is missing', async () => {
    delete process.env.SUPABASE_URL
    const res = await handler(new Request('http://local/api/shopify/cron/purge-worker'))
    expect(res.status).toBe(500)
  })

  it('500 when SUPABASE_SERVICE_ROLE_KEY is missing', async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    const res = await handler(new Request('http://local/api/shopify/cron/purge-worker'))
    expect(res.status).toBe(500)
  })

  // --- No-op paths ---

  it('200 with no deletions when queue is empty', async () => {
    pendingRows = []
    const res = await handler(new Request('http://local/api/shopify/cron/purge-worker'))
    expect(res.status).toBe(200)
    expect(deleteCalls.length).toBe(0)
    expect(queueCompletions.length).toBe(0)
  })

  it('500 when queue query fails', async () => {
    queueQueryError = { message: 'connection refused' }
    const res = await handler(new Request('http://local/api/shopify/cron/purge-worker'))
    expect(res.status).toBe(500)
  })

  // --- Main deletion logic ---

  it('deletes all shopify_* tables for brand_id when a pending row is due', async () => {
    pendingRows = [{ id: QUEUE_ROW_1, brand_id: BRAND_A, scheduled_at: PAST_DATE }]
    variantIdsByBrand[BRAND_A] = ['var-1']
    collectionIdsByBrand[BRAND_A] = ['col-1']

    await handler(new Request('http://local/api/shopify/cron/purge-worker'))

    const tablesDeleted = deleteCalls.map((c) => c.table)
    expect(tablesDeleted).toContain('shopify_products')
    expect(tablesDeleted).toContain('shopify_variants')
    expect(tablesDeleted).toContain('shopify_variant_prices')
    expect(tablesDeleted).toContain('shopify_media')
    expect(tablesDeleted).toContain('shopify_metafields')
    expect(tablesDeleted).toContain('shopify_collections')
    expect(tablesDeleted).toContain('shopify_collection_products')
    expect(tablesDeleted).toContain('shopify_discounts')
    expect(tablesDeleted).toContain('shopify_orders_agg')
    expect(tablesDeleted).toContain('shopify_compliance_log')
    expect(tablesDeleted).toContain('shopify_connections')
  })

  it('scopes all deletions to the target brand_id', async () => {
    pendingRows = [{ id: QUEUE_ROW_1, brand_id: BRAND_A, scheduled_at: PAST_DATE }]

    await handler(new Request('http://local/api/shopify/cron/purge-worker'))

    const brandDeletes = deleteCalls.filter((c) => c.brandId !== undefined)
    for (const d of brandDeletes) {
      expect(d.brandId).toBe(BRAND_A)
    }
  })

  it('marks completed_at on the queue row after successful purge', async () => {
    pendingRows = [{ id: QUEUE_ROW_1, brand_id: BRAND_A, scheduled_at: PAST_DATE }]

    await handler(new Request('http://local/api/shopify/cron/purge-worker'))

    expect(queueCompletions.length).toBe(1)
    expect(queueCompletions[0].id).toBe(QUEUE_ROW_1)
  })

  it('processes multiple pending rows and marks all complete', async () => {
    pendingRows = [
      { id: QUEUE_ROW_1, brand_id: BRAND_A, scheduled_at: PAST_DATE },
      { id: QUEUE_ROW_2, brand_id: BRAND_B, scheduled_at: PAST_DATE },
    ]

    await handler(new Request('http://local/api/shopify/cron/purge-worker'))

    expect(queueCompletions.map((c) => c.id).sort()).toEqual([QUEUE_ROW_1, QUEUE_ROW_2].sort())
  })

  it('passes variant IDs to shopify_variant_prices delete', async () => {
    pendingRows = [{ id: QUEUE_ROW_1, brand_id: BRAND_A, scheduled_at: PAST_DATE }]
    variantIdsByBrand[BRAND_A] = ['var-uuid-1', 'var-uuid-2']

    await handler(new Request('http://local/api/shopify/cron/purge-worker'))

    const priceDelete = deleteCalls.find((c) => c.table === 'shopify_variant_prices')
    expect(priceDelete).toBeDefined()
    expect(priceDelete!.ids?.sort()).toEqual(['var-uuid-1', 'var-uuid-2'].sort())
  })

  it('passes collection IDs to shopify_collection_products delete', async () => {
    pendingRows = [{ id: QUEUE_ROW_1, brand_id: BRAND_A, scheduled_at: PAST_DATE }]
    collectionIdsByBrand[BRAND_A] = ['col-uuid-1', 'col-uuid-2']

    await handler(new Request('http://local/api/shopify/cron/purge-worker'))

    const cpDelete = deleteCalls.find((c) => c.table === 'shopify_collection_products')
    expect(cpDelete).toBeDefined()
    expect(cpDelete!.ids?.sort()).toEqual(['col-uuid-1', 'col-uuid-2'].sort())
  })

  it('skips shopify_variant_prices delete when brand has no variants', async () => {
    pendingRows = [{ id: QUEUE_ROW_1, brand_id: BRAND_A, scheduled_at: PAST_DATE }]
    variantIdsByBrand[BRAND_A] = []

    await handler(new Request('http://local/api/shopify/cron/purge-worker'))

    const priceDelete = deleteCalls.find((c) => c.table === 'shopify_variant_prices')
    expect(priceDelete).toBeUndefined()
  })

  it('skips shopify_collection_products delete when brand has no collections', async () => {
    pendingRows = [{ id: QUEUE_ROW_1, brand_id: BRAND_A, scheduled_at: PAST_DATE }]
    collectionIdsByBrand[BRAND_A] = []

    await handler(new Request('http://local/api/shopify/cron/purge-worker'))

    const cpDelete = deleteCalls.find((c) => c.table === 'shopify_collection_products')
    expect(cpDelete).toBeUndefined()
  })

  // --- Error handling ---

  it('200 ok:true when all brands purged successfully', async () => {
    pendingRows = [{ id: QUEUE_ROW_1, brand_id: BRAND_A, scheduled_at: PAST_DATE }]

    const res = await handler(new Request('http://local/api/shopify/cron/purge-worker'))
    const body = (await res.json()) as { ok: boolean }
    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
  })

  it('207 when deletion fails for one brand', async () => {
    pendingRows = [
      { id: QUEUE_ROW_1, brand_id: BRAND_A, scheduled_at: PAST_DATE },
      { id: QUEUE_ROW_2, brand_id: BRAND_B, scheduled_at: PAST_DATE },
    ]
    failBrandsOnDelete.add(BRAND_A)

    const res = await handler(new Request('http://local/api/shopify/cron/purge-worker'))
    expect(res.status).toBe(207)
    const body = (await res.json()) as { ok: boolean; errors: string[] }
    expect(body.ok).toBe(false)
    expect(body.errors.some((e) => e.includes(BRAND_A))).toBe(true)
  })

  it('continues processing remaining brands after one fails', async () => {
    pendingRows = [
      { id: QUEUE_ROW_1, brand_id: BRAND_A, scheduled_at: PAST_DATE },
      { id: QUEUE_ROW_2, brand_id: BRAND_B, scheduled_at: PAST_DATE },
    ]
    failBrandsOnDelete.add(BRAND_A)

    await handler(new Request('http://local/api/shopify/cron/purge-worker'))

    expect(queueCompletions.some((c) => c.id === QUEUE_ROW_2)).toBe(true)
  })

  it('does not mark completed_at when brand deletion fails', async () => {
    pendingRows = [{ id: QUEUE_ROW_1, brand_id: BRAND_A, scheduled_at: PAST_DATE }]
    failBrandsOnDelete.add(BRAND_A)

    await handler(new Request('http://local/api/shopify/cron/purge-worker'))

    expect(queueCompletions.some((c) => c.id === QUEUE_ROW_1)).toBe(false)
  })

  // --- Response body shape ---

  it('success response body has exactly { ok: true }', async () => {
    pendingRows = [{ id: QUEUE_ROW_1, brand_id: BRAND_A, scheduled_at: PAST_DATE }]
    const res = await handler(new Request('http://local/api/shopify/cron/purge-worker'))
    const body = (await res.json()) as Record<string, unknown>
    expect(Object.keys(body).sort()).toEqual(['ok'])
    expect(body.ok).toBe(true)
  })

  it('partial failure response body has exactly { ok, errors } with errors as string[]', async () => {
    pendingRows = [
      { id: QUEUE_ROW_1, brand_id: BRAND_A, scheduled_at: PAST_DATE },
      { id: QUEUE_ROW_2, brand_id: BRAND_B, scheduled_at: PAST_DATE },
    ]
    failBrandsOnDelete.add(BRAND_A)
    const res = await handler(new Request('http://local/api/shopify/cron/purge-worker'))
    const body = (await res.json()) as Record<string, unknown>
    expect(Object.keys(body).sort()).toEqual(['errors', 'ok'])
    expect(body.ok).toBe(false)
    expect(Array.isArray(body.errors)).toBe(true)
    expect((body.errors as unknown[]).every((e) => typeof e === 'string')).toBe(true)
  })

  it('queue error response body has exactly { error: string }', async () => {
    queueQueryError = { message: 'db unavailable' }
    const res = await handler(new Request('http://local/api/shopify/cron/purge-worker'))
    const body = (await res.json()) as Record<string, unknown>
    expect(Object.keys(body).sort()).toEqual(['error'])
    expect(typeof body.error).toBe('string')
  })
})
