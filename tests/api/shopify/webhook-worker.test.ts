import { describe, it, expect, mock, beforeEach } from 'bun:test'

const BRAND_ID = 'brand-uuid-1'
const SHOP = 'test.myshopify.com'

// Control QStash signature verification
let qstashVerifyResult = true
mock.module('@upstash/qstash', () => ({
  Receiver: class {
    async verify(_opts: unknown): Promise<boolean> {
      return qstashVerifyResult
    }
  },
}))

// Capture Supabase calls
const fromCalls: Array<{ table: string; op: string; data?: unknown; filter?: unknown }> = []
let connResult: { data: { brand_id: string } | null } = { data: { brand_id: BRAND_ID } }

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

const { default: handler } = await import('../../../api/shopify/webhook-worker')

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

describe('POST /api/shopify/webhook-worker', () => {
  beforeEach(() => {
    process.env.SUPABASE_URL = 'http://localhost:54321'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
    process.env.QSTASH_CURRENT_SIGNING_KEY = 'test-current-key'
    process.env.QSTASH_NEXT_SIGNING_KEY = 'test-next-key'
    qstashVerifyResult = true
    connResult = { data: { brand_id: BRAND_ID } }
    fromCalls.length = 0
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
