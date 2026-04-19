import { describe, it, expect, mock, beforeEach, beforeAll, afterAll } from 'bun:test'
import { createHmac } from 'node:crypto'

const BRAND_ID = 'brand-uuid-1'
const SHOP = 'test.myshopify.com'
const WEBHOOK_ID = 'wh-uuid-1'
const TOPIC = 'products/update'
const WEBHOOK_SECRET = 'test-webhook-secret'

function computeHmac(body: string): string {
  return createHmac('sha256', WEBHOOK_SECRET).update(body).digest('base64')
}

// Capture QStash publish calls
const qstashCalls: Array<{ url: string; body: unknown }> = []

// Control Supabase responses and capture calls
let connResult: { data: { brand_id: string } | null } = { data: { brand_id: BRAND_ID } }
let insertError: { code?: string } | null = null
const insertCalls: Array<{ table: string; data: unknown }> = []
const eqCalls: Array<{ column: string; value: unknown }> = []

let handler: (req: Request) => Promise<Response>

describe('POST /api/shopify/webhooks', () => {
  beforeAll(async () => {
    mock.module('../../../api/_shared/qstash', () => ({
      publishToQStash: async (url: string, body: unknown): Promise<void> => {
        qstashCalls.push({ url, body })
      },
    }))

    mock.module('@supabase/supabase-js', () => ({
      createClient: () => ({
        from: (table: string) => ({
          select: () => ({
            eq: (column: string, value: unknown) => {
              eqCalls.push({ column, value })
              return { maybeSingle: async () => connResult }
            },
          }),
          insert: (data: unknown) => {
            insertCalls.push({ table, data })
            return { error: insertError }
          },
        }),
      }),
    }))

    const mod = await import('../../../api/shopify/webhooks')
    handler = mod.default
  })

  afterAll(() => mock.restore())

  beforeEach(() => {
    process.env.SUPABASE_URL = 'http://localhost:54321'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
    process.env.SHOPIFY_WEBHOOK_SECRET = WEBHOOK_SECRET
    connResult = { data: { brand_id: BRAND_ID } }
    insertError = null
    qstashCalls.length = 0
    insertCalls.length = 0
    eqCalls.length = 0
  })

  it('401 when HMAC verification fails', async () => {
    const res = await handler(makeWebhookReq(samplePayload, { sig: 'invalid-sig' }))
    expect(res.status).toBe(401)
    expect(qstashCalls.length).toBe(0)
  })

  it('400 when x-shopify-webhook-id header is missing', async () => {
    const body = samplePayload
    const res = await handler(
      new Request('http://local/api/shopify/webhooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-shopify-hmac-sha256': computeHmac(body),
          'x-shopify-shop-domain': SHOP,
          'x-shopify-topic': TOPIC,
          // webhook-id intentionally omitted
        },
        body,
      }),
    )
    expect(res.status).toBe(400)
  })

  it('400 when x-shopify-topic header is missing', async () => {
    const body = samplePayload
    const res = await handler(
      new Request('http://local/api/shopify/webhooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-shopify-hmac-sha256': computeHmac(body),
          'x-shopify-shop-domain': SHOP,
          'x-shopify-webhook-id': WEBHOOK_ID,
          // topic intentionally omitted
        },
        body,
      }),
    )
    expect(res.status).toBe(400)
  })

  it('200 on duplicate webhook (23505 unique violation) without enqueueing', async () => {
    insertError = { code: '23505' }
    const res = await handler(makeWebhookReq(samplePayload))
    expect(res.status).toBe(200)
    expect(qstashCalls.length).toBe(0)
  })

  it('200 on success and enqueues to QStash worker', async () => {
    const res = await handler(makeWebhookReq(samplePayload))
    expect(res.status).toBe(200)
    expect(qstashCalls.length).toBe(1)
    expect(qstashCalls[0].url).toContain('/api/shopify/webhook-worker')
  })

  it('worker URL is derived from request origin', async () => {
    await handler(makeWebhookReq(samplePayload))
    expect(qstashCalls[0].url).toBe('http://local/api/shopify/webhook-worker')
  })

  it('looks up connection by shop_domain column', async () => {
    await handler(makeWebhookReq(samplePayload))
    expect(eqCalls[0].column).toBe('shop_domain')
    expect(eqCalls[0].value).toBe(SHOP)
  })

  it('webhook_log insert does not include shop field', async () => {
    await handler(makeWebhookReq(samplePayload))
    const logInsert = insertCalls.find((c) => c.table === 'shopify_webhook_log')
    expect(logInsert).toBeDefined()
    expect((logInsert!.data as Record<string, unknown>).shop).toBeUndefined()
  })

  it('webhook_log insert includes webhook_id, topic, and brand_id', async () => {
    await handler(makeWebhookReq(samplePayload))
    const logInsert = insertCalls.find((c) => c.table === 'shopify_webhook_log')
    const data = logInsert!.data as Record<string, unknown>
    expect(data.webhook_id).toBe(WEBHOOK_ID)
    expect(data.topic).toBe(TOPIC)
    expect(data.brand_id).toBe(BRAND_ID)
  })

  it('enqueues correct payload with topic, shop, brand_id, and parsed payload', async () => {
    await handler(makeWebhookReq(samplePayload))
    const enqueued = qstashCalls[0].body as {
      webhook_id: string
      topic: string
      shop: string
      brand_id: string
      payload: { id: number; title: string }
    }
    expect(enqueued.webhook_id).toBe(WEBHOOK_ID)
    expect(enqueued.topic).toBe(TOPIC)
    expect(enqueued.shop).toBe(SHOP)
    expect(enqueued.brand_id).toBe(BRAND_ID)
    expect(enqueued.payload.id).toBe(123)
  })

  it('200 and still enqueues when no connection found (brand_id null)', async () => {
    connResult = { data: null }
    const res = await handler(makeWebhookReq(samplePayload))
    expect(res.status).toBe(200)
    expect(qstashCalls.length).toBe(1)
    const enqueued = qstashCalls[0].body as { brand_id: string | null }
    expect(enqueued.brand_id).toBeNull()
  })
})

function makeWebhookReq(
  body: string,
  overrides: {
    sig?: string
    shop?: string
    topic?: string
    webhookId?: string
  } = {},
): Request {
  return new Request('http://local/api/shopify/webhooks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-shopify-hmac-sha256': overrides.sig ?? computeHmac(body),
      'x-shopify-shop-domain': overrides.shop ?? SHOP,
      'x-shopify-topic': overrides.topic ?? TOPIC,
      'x-shopify-webhook-id': overrides.webhookId ?? WEBHOOK_ID,
    },
    body,
  })
}

const samplePayload = JSON.stringify({ id: 123, title: 'Test Product' })
