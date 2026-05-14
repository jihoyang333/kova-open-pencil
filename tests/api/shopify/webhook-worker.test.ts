import { describe, it, expect, mock, beforeEach, beforeAll, afterAll } from 'bun:test'

const BRAND_ID = 'brand-uuid-1'
const SHOP = 'test.myshopify.com'

// Control QStash signature verification
let qstashVerifyResult = true

// Capture publishToQStash calls (used by processBulkFinish)
const qstashPublishCalls: Array<{ url: string; body: unknown }> = []

// Capture Supabase calls
const fromCalls: Array<{ table: string; op: string; data?: unknown; filter?: unknown }> = []
let connResult: { data: { brand_id: string } | null } = { data: { brand_id: BRAND_ID } }

let handler: (req: Request) => Promise<Response>

describe('POST /api/shopify/webhook-worker', () => {
  beforeAll(async () => {
    mock.module('@upstash/qstash', () => ({
      Receiver: class {
        async verify(_opts: unknown): Promise<boolean> {
          return qstashVerifyResult
        }
      },
    }))

    mock.module('../../../api/_shared/qstash', () => ({
      publishToQStash: async (url: string, body: unknown): Promise<void> => {
        qstashPublishCalls.push({ url, body })
      },
    }))

    mock.module('@supabase/supabase-js', () => ({
      createClient: () => ({
        from: (table: string) => ({
          update: (data: unknown) => ({
            eq: (col: string, val: unknown) => {
              fromCalls.push({ table, op: 'update', data, filter: { [col]: val } })
              return { error: null }
            },
          }),
          delete: () => ({
            eq: (col: string, val: unknown) => ({
              eq: (col2: string, val2: unknown) => {
                fromCalls.push({ table, op: 'delete', filter: { [col]: val, [col2]: val2 } })
                return { error: null }
              },
            }),
          }),
          insert: (data: unknown) => {
            fromCalls.push({ table, op: 'insert', data })
            return { error: null }
          },
          select: () => ({
            eq: () => ({
              maybeSingle: async () => connResult,
            }),
          }),
          upsert: (data: unknown) => {
            fromCalls.push({ table, op: 'upsert', data })
            return { error: null }
          },
        }),
        rpc: (fn: string, args: unknown) => {
          fromCalls.push({ table: 'rpc', op: fn, data: args })
          return { error: null }
        },
      }),
    }))

    const mod = await import('../../../api/shopify/webhook-worker')
    handler = mod.default
  })

  afterAll(() => mock.restore())

  beforeEach(() => {
    process.env.SUPABASE_URL = 'http://localhost:54321'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
    process.env.QSTASH_CURRENT_SIGNING_KEY = 'test-current-key'
    process.env.QSTASH_NEXT_SIGNING_KEY = 'test-next-key'
    qstashVerifyResult = true
    connResult = { data: { brand_id: BRAND_ID } }
    fromCalls.length = 0
    qstashPublishCalls.length = 0
  })

  it('401 when QStash signature verification fails', async () => {
    qstashVerifyResult = false
    const res = await handler(
      makeWorkerReq({
        webhook_id: 'wh-1',
        topic: 'products/update',
        shop: SHOP,
        brand_id: BRAND_ID,
        payload: {},
      }),
    )
    expect(res.status).toBe(401)
    expect(fromCalls.length).toBe(0)
  })

  it('200 no-op when brand_id is null', async () => {
    const res = await handler(
      makeWorkerReq({
        webhook_id: 'wh-1',
        topic: 'products/update',
        shop: SHOP,
        brand_id: null,
        payload: {},
      }),
    )
    expect(res.status).toBe(200)
    const upserts = fromCalls.filter((c) => c.op === 'upsert' || c.op === 'update')
    expect(upserts.length).toBe(0)
  })

  it('upserts product on products/create', async () => {
    const res = await handler(
      makeWorkerReq({
        webhook_id: 'wh-2',
        topic: 'products/create',
        shop: SHOP,
        brand_id: BRAND_ID,
        payload: { id: 123, title: 'New Product', handle: 'new-product', status: 'active' },
      }),
    )
    expect(res.status).toBe(200)
    const productOp = fromCalls.find((c) => c.table === 'shopify_products')
    expect(productOp).toBeDefined()
    expect(productOp?.op === 'upsert' || productOp?.op === 'update').toBe(true)
    const data = productOp?.data as Record<string, unknown>
    expect(data?.shopify_product_id).toBe('123')
  })

  it('upserts product on products/update', async () => {
    const res = await handler(
      makeWorkerReq({
        webhook_id: 'wh-3',
        topic: 'products/update',
        shop: SHOP,
        brand_id: BRAND_ID,
        payload: { id: 456, title: 'Updated Product', handle: 'updated-product', status: 'active' },
      }),
    )
    expect(res.status).toBe(200)
    const productOp = fromCalls.find((c) => c.table === 'shopify_products')
    expect(productOp).toBeDefined()
  })

  it('deletes product on products/delete', async () => {
    const res = await handler(
      makeWorkerReq({
        webhook_id: 'wh-4',
        topic: 'products/delete',
        shop: SHOP,
        brand_id: BRAND_ID,
        payload: { id: 789 },
      }),
    )
    expect(res.status).toBe(200)
    const deleteOp = fromCalls.find((c) => c.table === 'shopify_products' && c.op === 'delete')
    expect(deleteOp).toBeDefined()
  })

  it('upserts collection on collections/create', async () => {
    const res = await handler(
      makeWorkerReq({
        webhook_id: 'wh-c1',
        topic: 'collections/create',
        shop: SHOP,
        brand_id: BRAND_ID,
        payload: {
          id: 111,
          handle: 'summer-sale',
          title: 'Summer Sale',
          body_html: '<p>desc</p>',
          products_count: 5,
        },
      }),
    )
    expect(res.status).toBe(200)
    const op = fromCalls.find((c) => c.table === 'shopify_collections' && c.op === 'upsert')
    expect(op).toBeDefined()
    const data = op?.data as Record<string, unknown>
    expect(data?.shopify_collection_id).toBe('111')
    expect(data?.handle).toBe('summer-sale')
    expect(data?.collection_type).toBe('manual')
  })

  it('marks smart collection when rules present on collections/update', async () => {
    const res = await handler(
      makeWorkerReq({
        webhook_id: 'wh-c2',
        topic: 'collections/update',
        shop: SHOP,
        brand_id: BRAND_ID,
        payload: {
          id: 222,
          handle: 'smart-col',
          title: 'Smart Collection',
          rules: [{ column: 'tag', relation: 'equals', condition: 'summer' }],
          products_count: 3,
        },
      }),
    )
    expect(res.status).toBe(200)
    const op = fromCalls.find((c) => c.table === 'shopify_collections' && c.op === 'upsert')
    expect(op).toBeDefined()
    const data = op?.data as Record<string, unknown>
    expect(data?.collection_type).toBe('smart')
  })

  it('deletes collection on collections/delete', async () => {
    const res = await handler(
      makeWorkerReq({
        webhook_id: 'wh-c3',
        topic: 'collections/delete',
        shop: SHOP,
        brand_id: BRAND_ID,
        payload: { id: 333 },
      }),
    )
    expect(res.status).toBe(200)
    const op = fromCalls.find((c) => c.table === 'shopify_collections' && c.op === 'delete')
    expect(op).toBeDefined()
    const filter = op?.filter as Record<string, unknown>
    expect(filter?.shopify_collection_id).toBe('333')
  })

  it('upserts discount on discounts/create', async () => {
    const res = await handler(
      makeWorkerReq({
        webhook_id: 'wh-d1',
        topic: 'discounts/create',
        shop: SHOP,
        brand_id: BRAND_ID,
        payload: {
          id: 444,
          title: 'SUMMER20',
          code: 'SUMMER20',
          status: 'enabled',
          starts_at: '2026-06-01T00:00:00Z',
          value_type: 'percentage',
          value: '20.0',
        },
      }),
    )
    expect(res.status).toBe(200)
    const op = fromCalls.find((c) => c.table === 'shopify_discounts' && c.op === 'upsert')
    expect(op).toBeDefined()
    const data = op?.data as Record<string, unknown>
    expect(data?.shopify_discount_id).toBe('444')
    expect(data?.status).toBe('active')
    expect(data?.code).toBe('SUMMER20')
  })

  it('upserts discount on discounts/update', async () => {
    const res = await handler(
      makeWorkerReq({
        webhook_id: 'wh-d2',
        topic: 'discounts/update',
        shop: SHOP,
        brand_id: BRAND_ID,
        payload: { id: 555, title: 'FALL10', status: 'active', value_type: 'fixed_amount', value: '10' },
      }),
    )
    expect(res.status).toBe(200)
    const op = fromCalls.find((c) => c.table === 'shopify_discounts' && c.op === 'upsert')
    expect(op).toBeDefined()
  })

  it('deletes discount on discounts/delete', async () => {
    const res = await handler(
      makeWorkerReq({
        webhook_id: 'wh-d3',
        topic: 'discounts/delete',
        shop: SHOP,
        brand_id: BRAND_ID,
        payload: { id: 666 },
      }),
    )
    expect(res.status).toBe(200)
    const op = fromCalls.find((c) => c.table === 'shopify_discounts' && c.op === 'delete')
    expect(op).toBeDefined()
    const filter = op?.filter as Record<string, unknown>
    expect(filter?.shopify_discount_id).toBe('666')
  })

  it('updates inventory_qty on inventory_levels/update', async () => {
    const res = await handler(
      makeWorkerReq({
        webhook_id: 'wh-5',
        topic: 'inventory_levels/update',
        shop: SHOP,
        brand_id: BRAND_ID,
        payload: { inventory_item_id: 999, available: 42 },
      }),
    )
    expect(res.status).toBe(200)
    const updateOp = fromCalls.find((c) => c.table === 'shopify_variants' && c.op === 'update')
    expect(updateOp).toBeDefined()
    const data = updateOp?.data as { inventory_qty: number }
    expect(data?.inventory_qty).toBe(42)
  })

  it('updates shop fields on shop/update', async () => {
    const res = await handler(
      makeWorkerReq({
        webhook_id: 'wh-s1',
        topic: 'shop/update',
        shop: SHOP,
        brand_id: BRAND_ID,
        payload: { currency: 'EUR', iana_timezone: 'Europe/Paris', primary_locale: 'fr' },
      }),
    )
    expect(res.status).toBe(200)
    const op = fromCalls.find((c) => c.table === 'shopify_connections' && c.op === 'update')
    expect(op).toBeDefined()
    const data = op?.data as Record<string, unknown>
    expect(data?.currency).toBe('EUR')
    expect(data?.timezone).toBe('Europe/Paris')
    expect(data?.primary_locale).toBe('fr')
  })

  it('delegates bulk_operations/finish to processBulkFinish (inline parse, no QStash)', async () => {
    const res = await handler(
      makeWorkerReq({
        webhook_id: 'wh-b1',
        topic: 'bulk_operations/finish',
        shop: SHOP,
        brand_id: BRAND_ID,
        payload: {
          admin_graphql_api_id: 'gid://shopify/BulkOperation/1',
          status: 'completed',
          url: 'https://storage.example.com/bulk.jsonl',
          object_count: 100,
        },
      }),
    )
    expect(res.status).toBe(200)
    const progressOp = fromCalls.find(
      (c) => c.table === 'shopify_connections' && c.op === 'update',
    )
    expect(progressOp).toBeDefined()
    const data = progressOp?.data as Record<string, unknown>
    const progress = data?.sync_progress as Record<string, unknown>
    expect(progress?.phase).toBe('parsing')
    expect(progress?.count_total).toBe(100)
    // QStash is no longer used — bulk-finish processes JSONL inline.
    expect(qstashPublishCalls.length).toBe(0)
  })

  it('no-op bulk_operations/finish when status is not completed', async () => {
    await handler(
      makeWorkerReq({
        webhook_id: 'wh-b2',
        topic: 'bulk_operations/finish',
        shop: SHOP,
        brand_id: BRAND_ID,
        payload: { status: 'running', url: '', object_count: 0 },
      }),
    )
    const progressOp = fromCalls.find(
      (c) => c.table === 'shopify_connections' && c.op === 'update',
    )
    expect(progressOp).toBeUndefined()
    expect(qstashPublishCalls.length).toBe(0)
  })

  it('disconnects + schedules purge on app/uninstalled', async () => {
    const res = await handler(
      makeWorkerReq({
        webhook_id: 'wh-6',
        topic: 'app/uninstalled',
        shop: SHOP,
        brand_id: BRAND_ID,
        payload: {},
      }),
    )
    expect(res.status).toBe(200)
    const deleteToken = fromCalls.find((c) => c.op === 'delete_shopify_token')
    expect(deleteToken).toBeDefined()
    const disconnect = fromCalls.find(
      (c) => c.table === 'shopify_connections' && c.op === 'update',
    )
    expect(disconnect).toBeDefined()
    const purge = fromCalls.find((c) => c.table === 'shopify_purge_queue' && c.op === 'insert')
    expect(purge).toBeDefined()
  })

  it('marks webhook_log as processed after handling', async () => {
    await handler(
      makeWorkerReq({
        webhook_id: 'wh-7',
        topic: 'products/update',
        shop: SHOP,
        brand_id: BRAND_ID,
        payload: { id: 100, title: 'T', handle: 'h', status: 'active' },
      }),
    )
    const logUpdate = fromCalls.find(
      (c) => c.table === 'shopify_webhook_log' && c.op === 'update',
    )
    expect(logUpdate).toBeDefined()
    const data = logUpdate?.data as { status: string }
    expect(data?.status).toBe('processed')
  })
})

function makeWorkerReq(payload: unknown): Request {
  const body = JSON.stringify(payload)
  return new Request('http://local/api/shopify/webhook-worker', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'upstash-signature': 'valid-sig',
    },
    body,
  })
}
