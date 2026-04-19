import { describe, it, expect, mock, beforeEach } from 'bun:test'
import { createHmac } from 'node:crypto'

const BRAND_ID = 'brand-uuid-1'
const SIGNING_KEY = 'test-signing-key'

// QStash Receiver mock — validates by checking a known HMAC
let verifyResult = true
mock.module('@upstash/qstash', () => ({
  Receiver: class {
    async verify(_opts: unknown): Promise<boolean> {
      return verifyResult
    }
  },
  Client: class {
    async publishJSON(_opts: unknown): Promise<void> {}
  },
}))

// Track supabase upsert calls
const upsertCalls: Array<{ table: string; rows: unknown[] }> = []
let productIdMap: Map<string, string> = new Map()

mock.module('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (table: string) => ({
      upsert: async (rows: unknown[]) => {
        upsertCalls.push({ table, rows })
        return { error: null }
      },
      update: () => ({ eq: () => ({ error: null }) }),
      select: (_cols: string) => ({
        eq: (_col: string, _val: unknown) => ({
          in: (_col2: string, vals: string[]) =>
            Promise.resolve({
              data: vals.map((v) => ({ id: productIdMap.get(v) ?? `uuid-for-${v}`, shopify_product_id: v })),
              error: null,
            }),
        }),
      }),
    }),
  }),
}))

const { default: handler, resolveFks } = await import('../../../api/shopify/sync/worker')

function makeWorkerReq(body: unknown, sig = 'valid-sig'): Request {
  const bodyStr = JSON.stringify(body)
  return new Request('http://local/api/shopify/sync/worker', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'upstash-signature': sig,
    },
    body: bodyStr,
  })
}

describe('POST /api/shopify/sync/worker', () => {
  beforeEach(() => {
    process.env.SUPABASE_URL = 'http://localhost:54321'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
    process.env.QSTASH_CURRENT_SIGNING_KEY = SIGNING_KEY
    process.env.QSTASH_NEXT_SIGNING_KEY = SIGNING_KEY
    upsertCalls.length = 0
    verifyResult = true
    productIdMap = new Map()
  })

  it('401 on invalid QStash signature', async () => {
    verifyResult = false
    const res = await handler(makeWorkerReq({ brand_id: BRAND_ID, url: 'http://x', cursor: 0, count_total: 0 }))
    expect(res.status).toBe(401)
  })

  it('processes JSONL and upserts product rows', async () => {
    const lines = [
      JSON.stringify({ id: 'gid://shopify/Product/1', handle: 'shirt', title: 'Shirt', status: 'ACTIVE' }),
    ]
    globalThis.fetch = mock(async () =>
      new Response(lines.join('\n'), { status: 200 }),
    ) as typeof fetch

    const res = await handler(makeWorkerReq({ brand_id: BRAND_ID, url: 'http://cdn/bulk.jsonl', cursor: 0, count_total: 1 }))
    expect(res.status).toBe(200)
    const productUpserts = upsertCalls.filter((c) => c.table === 'shopify_products')
    expect(productUpserts.length).toBeGreaterThan(0)
  })
})

describe('resolveFks', () => {
  beforeEach(() => {
    upsertCalls.length = 0
    productIdMap = new Map()
  })

  it('passes shopify_products rows through unchanged', async () => {
    const rows = [{ shopify_product_id: 'gid://shopify/Product/1', handle: 'shirt' }]
    const result = await resolveFks(null as never, BRAND_ID, 'shopify_products', rows)
    expect(result).toEqual(rows)
  })

  it('resolves _parent_shopify_product_id to product_id for variants', async () => {
    const productShopifyId = 'gid://shopify/Product/1'
    const productUuid = 'product-uuid-abc'

    const rows = [{ sku: 'V1', _parent_shopify_product_id: productShopifyId }]
    const result = await resolveFks(
      mock(() => ({
        from: (_t: string) => ({
          select: (_c: string) => ({
            eq: (_col: string, _v: unknown) => ({
              in: (_col2: string, _vals: string[]) =>
                Promise.resolve({
                  data: [{ id: productUuid, shopify_product_id: productShopifyId }],
                  error: null,
                }),
            }),
          }),
        }),
      }))() as never,
      BRAND_ID,
      'shopify_variants',
      rows,
    )

    expect(result[0].product_id).toBe(productUuid)
    expect(result[0]._parent_shopify_product_id).toBeUndefined()
  })

  it('resolves _parent_id + _parent_type for media rows (products)', async () => {
    const productShopifyId = 'gid://shopify/Product/1'
    const productUuid = 'product-uuid-xyz'

    // Parser emits _parent_id (the GID) and _parent_type ('product')
    const rows = [{ url: 'https://cdn/img.jpg', _parent_type: 'product', _parent_id: productShopifyId }]
    const result = await resolveFks(
      mock(() => ({
        from: (_t: string) => ({
          select: (_c: string) => ({
            eq: (_col: string, _v: unknown) => ({
              in: (_col2: string, _vals: string[]) =>
                Promise.resolve({
                  data: [{ id: productUuid, shopify_product_id: productShopifyId }],
                  error: null,
                }),
            }),
          }),
        }),
      }))() as never,
      BRAND_ID,
      'shopify_media',
      rows,
    )

    expect(result[0].owner_id).toBe(productUuid)
    expect(result[0]._parent_type).toBeUndefined()
    expect(result[0]._parent_id).toBeUndefined()
  })

  it('resolves both ends for collection_products rows', async () => {
    const collectionShopifyId = 'gid://shopify/Collection/2'
    const productShopifyId = 'gid://shopify/Product/1'
    const collectionUuid = 'collection-uuid-1'
    const productUuid = 'product-uuid-1'

    const rows = [{ _parent_collection_shopify_id: collectionShopifyId, _product_shopify_id: productShopifyId }]
    const result = await resolveFks(
      mock(() => ({
        from: (t: string) => ({
          select: (_c: string) => ({
            eq: (_col: string, _v: unknown) => ({
              in: (_col2: string, vals: string[]) => {
                if (t === 'shopify_collections') {
                  return Promise.resolve({
                    data: vals.map((v) => ({ id: collectionUuid, shopify_collection_id: v })),
                    error: null,
                  })
                }
                return Promise.resolve({
                  data: vals.map((v) => ({ id: productUuid, shopify_product_id: v })),
                  error: null,
                })
              },
            }),
          }),
        }),
      }))() as never,
      BRAND_ID,
      'shopify_collection_products',
      rows,
    )

    expect(result[0].collection_id).toBe(collectionUuid)
    expect(result[0].product_id).toBe(productUuid)
    expect(result[0]._parent_collection_shopify_id).toBeUndefined()
    expect(result[0]._product_shopify_id).toBeUndefined()
  })
})
