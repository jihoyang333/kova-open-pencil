import { describe, it, expect, mock, beforeAll, beforeEach, afterAll } from 'bun:test'

const BRAND_ID = 'brand-uuid-1'
const SIGNING_KEY = 'test-signing-key'
const BUDGET_MS = 260_000

let verifyResult = true
const publishCalls: unknown[] = []
const upsertCalls: Array<{ table: string; rows: unknown[] }> = []
let productIdMap: Map<string, string> = new Map()

let handler: (req: Request) => Promise<Response>
let resolveFks: (
  admin: unknown,
  brandId: string,
  table: string,
  rows: Array<Record<string, unknown>>,
) => Promise<Array<Record<string, unknown>>>

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
  beforeAll(async () => {
    mock.module('@upstash/qstash', () => ({
      Receiver: class {
        async verify(_opts: unknown): Promise<boolean> {
          return verifyResult
        }
      },
    }))
    mock.module('../../../api/_shared/qstash', () => ({
      publishToQStash: async (url: string, body: unknown): Promise<void> => {
        publishCalls.push({ url, body })
      },
    }))
    mock.module('@supabase/supabase-js', () => ({
      createClient: () => ({
        from: (table: string) => ({
          upsert: async (rows: unknown[]) => {
            upsertCalls.push({ table, rows: rows as Array<Record<string, unknown>> })
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
    const mod = await import('../../../api/shopify/sync/worker')
    handler = mod.default
    resolveFks = mod.resolveFks
  })

  afterAll(() => mock.restore())

  beforeEach(() => {
    process.env.SUPABASE_URL = 'http://localhost:54321'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
    process.env.QSTASH_CURRENT_SIGNING_KEY = SIGNING_KEY
    process.env.QSTASH_NEXT_SIGNING_KEY = SIGNING_KEY
    upsertCalls.length = 0
    publishCalls.length = 0
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

  it('502 when JSONL file fetch fails', async () => {
    globalThis.fetch = mock(async () => new Response('Not Found', { status: 404 })) as typeof fetch
    const res = await handler(makeWorkerReq({ brand_id: BRAND_ID, url: 'http://cdn/bulk.jsonl', cursor: 0, count_total: 1 }))
    expect(res.status).toBe(502)
  })

  it('re-enqueues continuation and returns chunked when budget is exceeded', async () => {
    const lines = [
      JSON.stringify({ id: 'gid://shopify/Product/1', handle: 'shirt', title: 'Shirt', status: 'ACTIVE' }),
    ]
    globalThis.fetch = mock(async () => new Response(lines.join('\n'), { status: 200 })) as typeof fetch

    let callIdx = 0
    const realNow = Date.now
    try {
      Date.now = (): number => callIdx++ === 0 ? realNow() : realNow() + BUDGET_MS + 1000
      const res = await handler(makeWorkerReq({ brand_id: BRAND_ID, url: 'http://cdn/bulk.jsonl', cursor: 0, count_total: 1 }))
      expect(res.status).toBe(200)
      expect(await res.text()).toBe('chunked')
      expect(publishCalls.length).toBe(1)
    } finally {
      Date.now = realNow
    }
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

  it('resolves _parent_id + _parent_type for metafield rows (variant parent)', async () => {
    const variantShopifyId = 'gid://shopify/ProductVariant/1'
    const variantUuid = 'variant-uuid-xyz'

    const rows = [{ namespace: 'custom', key: 'size_guide', value: 'XL', _parent_type: 'productvariant', _parent_id: variantShopifyId }]
    const result = await resolveFks(
      mock(() => ({
        from: (_t: string) => ({
          select: (_c: string) => ({
            eq: (_col: string, _v: unknown) => ({
              in: (_col2: string, _vals: string[]) =>
                Promise.resolve({
                  data: [{ id: variantUuid, shopify_variant_id: variantShopifyId }],
                  error: null,
                }),
            }),
          }),
        }),
      }))() as never,
      BRAND_ID,
      'shopify_metafields',
      rows,
    )

    expect(result[0].owner_id).toBe(variantUuid)
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
