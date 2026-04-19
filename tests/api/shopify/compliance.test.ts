import { describe, it, expect, mock, beforeEach, beforeAll, afterAll } from 'bun:test'

const BRAND_ID = 'brand-uuid-compliance'
const SHOP = 'compliance-test.myshopify.com'
const WEBHOOK_ID = 'wh-compliance-1'

let hmacResult = true

const fromCalls: Array<{ table: string; op: string; data?: unknown }> = []
const tablesAccessed: string[] = []
let connResult: { data: { brand_id: string } | null } = { data: { brand_id: BRAND_ID } }

let handler: (req: Request) => Promise<Response>

describe('POST /api/shopify/compliance', () => {
  beforeAll(async () => {
    mock.module('../../../api/_shared/shopify-hmac', () => ({
      verifyShopifyHmac: async (): Promise<boolean> => hmacResult,
    }))

    mock.module('@supabase/supabase-js', () => ({
      createClient: () => ({
        from: (table: string) => {
          tablesAccessed.push(table)
          return {
            select: (_cols?: string) => ({
              eq: (_col: string, _val: unknown) => ({
                maybeSingle: async () => connResult,
              }),
            }),
            insert: (data: unknown) => {
              fromCalls.push({ table, op: 'insert', data })
              return { error: null }
            },
            delete: () => ({
              eq: (col: string, val: unknown) => {
                fromCalls.push({ table, op: 'delete', data: { [col]: val } })
                return { error: null }
              },
            }),
          }
        },
      }),
    }))

    const mod = await import('../../../api/shopify/compliance')
    handler = mod.default
  })

  afterAll(() => mock.restore())

  beforeEach(() => {
    process.env.SUPABASE_URL = 'http://localhost:54321'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
    process.env.SHOPIFY_WEBHOOK_SECRET = 'test-compliance-secret'
    hmacResult = true
    connResult = { data: { brand_id: BRAND_ID } }
    fromCalls.length = 0
    tablesAccessed.length = 0
  })

  // (a) HMAC rejection — all three compliance topics
  it('401 on bad HMAC for customers/data_request', async () => {
    hmacResult = false
    const res = await handler(makeReq('{}', 'customers/data_request'))
    expect(res.status).toBe(401)
    expect(fromCalls.length).toBe(0)
  })

  it('401 on bad HMAC for customers/redact', async () => {
    hmacResult = false
    const res = await handler(makeReq('{}', 'customers/redact'))
    expect(res.status).toBe(401)
    expect(fromCalls.length).toBe(0)
  })

  it('401 on bad HMAC for shop/redact', async () => {
    hmacResult = false
    const res = await handler(makeReq('{}', 'shop/redact'))
    expect(res.status).toBe(401)
    expect(fromCalls.length).toBe(0)
  })

  // (b) logs to shopify_compliance_log — all three topics
  it('customers/data_request: inserts into shopify_compliance_log with correct fields', async () => {
    const body = JSON.stringify({ shop_id: 1, shop_domain: SHOP, customer: { id: 42 } })
    const res = await handler(makeReq(body, 'customers/data_request'))
    expect(res.status).toBe(200)
    const log = fromCalls.find((c) => c.table === 'shopify_compliance_log' && c.op === 'insert')
    expect(log).toBeDefined()
    const data = log!.data as Record<string, unknown>
    expect(data.topic).toBe('customers/data_request')
    expect(data.brand_id).toBe(BRAND_ID)
    expect(data.shop_domain).toBe(SHOP)
    expect(data.customer_id).toBe('42')
  })

  it('customers/redact: inserts into shopify_compliance_log with correct fields', async () => {
    const body = JSON.stringify({ shop_id: 1, shop_domain: SHOP, customer: { id: 99 } })
    const res = await handler(makeReq(body, 'customers/redact'))
    expect(res.status).toBe(200)
    const log = fromCalls.find((c) => c.table === 'shopify_compliance_log' && c.op === 'insert')
    expect(log).toBeDefined()
    const data = log!.data as Record<string, unknown>
    expect(data.topic).toBe('customers/redact')
    expect(data.brand_id).toBe(BRAND_ID)
    expect(data.shop_domain).toBe(SHOP)
  })

  it('shop/redact: inserts into shopify_compliance_log with correct fields', async () => {
    const body = JSON.stringify({ shop_id: 1, shop_domain: SHOP })
    const res = await handler(makeReq(body, 'shop/redact'))
    expect(res.status).toBe(200)
    const log = fromCalls.find((c) => c.table === 'shopify_compliance_log' && c.op === 'insert')
    expect(log).toBeDefined()
    const data = log!.data as Record<string, unknown>
    expect(data.topic).toBe('shop/redact')
    expect(data.brand_id).toBe(BRAND_ID)
    expect(data.shop_domain).toBe(SHOP)
  })

  it('logs brand_id as null when no shopify_connection matches', async () => {
    connResult = { data: null }
    const body = JSON.stringify({ shop_id: 1, shop_domain: SHOP })
    const res = await handler(makeReq(body, 'customers/data_request'))
    expect(res.status).toBe(200)
    const log = fromCalls.find((c) => c.table === 'shopify_compliance_log' && c.op === 'insert')
    expect(log).toBeDefined()
    const data = log!.data as Record<string, unknown>
    expect(data.brand_id).toBeNull()
  })

  // (c) respond 200 within 30s — all three topics
  it('customers/data_request responds 200 in under 30s', async () => {
    const start = Date.now()
    const res = await handler(makeReq('{}', 'customers/data_request'))
    expect(res.status).toBe(200)
    expect(Date.now() - start).toBeLessThan(30_000)
  })

  it('customers/redact responds 200 in under 30s', async () => {
    const start = Date.now()
    const res = await handler(makeReq('{}', 'customers/redact'))
    expect(res.status).toBe(200)
    expect(Date.now() - start).toBeLessThan(30_000)
  })

  it('shop/redact responds 200 in under 30s', async () => {
    const start = Date.now()
    const res = await handler(makeReq('{}', 'shop/redact'))
    expect(res.status).toBe(200)
    expect(Date.now() - start).toBeLessThan(30_000)
  })

  // (d) shop/redact schedules deletion of shopify_* rows for brand_id
  it('shop/redact inserts into shopify_purge_queue with brand_id and scheduled_at', async () => {
    const body = JSON.stringify({ shop_id: 1, shop_domain: SHOP })
    await handler(makeReq(body, 'shop/redact'))
    const purge = fromCalls.find((c) => c.table === 'shopify_purge_queue' && c.op === 'insert')
    expect(purge).toBeDefined()
    const data = purge!.data as Record<string, unknown>
    expect(data.brand_id).toBe(BRAND_ID)
    expect(typeof data.scheduled_at).toBe('string')
  })

  it('customers/data_request does NOT insert into shopify_purge_queue', async () => {
    const body = JSON.stringify({ shop_id: 1, shop_domain: SHOP, customer: { id: 7 } })
    await handler(makeReq(body, 'customers/data_request'))
    expect(fromCalls.find((c) => c.table === 'shopify_purge_queue')).toBeUndefined()
  })

  it('customers/redact does NOT insert into shopify_purge_queue', async () => {
    const body = JSON.stringify({ shop_id: 1, shop_domain: SHOP, customer: { id: 8 } })
    await handler(makeReq(body, 'customers/redact'))
    expect(fromCalls.find((c) => c.table === 'shopify_purge_queue')).toBeUndefined()
  })

  it('shop/redact with null brand_id does NOT insert into shopify_purge_queue', async () => {
    connResult = { data: null }
    await handler(makeReq('{}', 'shop/redact'))
    expect(fromCalls.find((c) => c.table === 'shopify_purge_queue')).toBeUndefined()
  })

  // Explicit: NONE of the handlers read shopify_orders_agg (log-and-ack pattern)
  it('customers/data_request never accesses shopify_orders_agg', async () => {
    await handler(makeReq('{}', 'customers/data_request'))
    expect(tablesAccessed.includes('shopify_orders_agg')).toBe(false)
  })

  it('customers/redact never accesses shopify_orders_agg', async () => {
    await handler(makeReq('{}', 'customers/redact'))
    expect(tablesAccessed.includes('shopify_orders_agg')).toBe(false)
  })

  it('shop/redact never accesses shopify_orders_agg', async () => {
    await handler(makeReq('{}', 'shop/redact'))
    expect(tablesAccessed.includes('shopify_orders_agg')).toBe(false)
  })
})

function makeReq(body: string, topic: string): Request {
  return new Request('http://local/api/shopify/compliance', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-shopify-hmac-sha256': 'any-sig',
      'x-shopify-shop-domain': SHOP,
      'x-shopify-topic': topic,
      'x-shopify-webhook-id': WEBHOOK_ID,
    },
    body,
  })
}
