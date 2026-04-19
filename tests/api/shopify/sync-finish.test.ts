import { describe, it, expect, mock, beforeEach } from 'bun:test'

const BRAND_ID = 'brand-uuid-1'
const SHOP = 'test.myshopify.com'
const JSONL_URL = 'https://storage.googleapis.com/bulk-op/output.jsonl'

// Control HMAC verification result
let hmacResult = true
mock.module('../../../api/_shared/shopify-hmac', () => ({
  verifyShopifyHmac: async (_body: string, _sig: string, _secret: string): Promise<boolean> =>
    hmacResult,
}))

// Capture QStash publish calls
const qstashCalls: Array<{ url: string; body: unknown }> = []
mock.module('../../../api/_shared/qstash', () => ({
  publishToQStash: async (url: string, body: unknown): Promise<void> => {
    qstashCalls.push({ url, body })
  },
}))

// Control Supabase responses and capture update calls
let connResult: { data: { brand_id: string } | null } = { data: { brand_id: BRAND_ID } }
const updateCalls: Array<{ sync_progress: unknown }> = []

mock.module('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (_table: string) => ({
      select: () => ({
        eq: () => ({
          single: async () => connResult,
        }),
      }),
      update: (data: { sync_progress: unknown }) => {
        updateCalls.push(data)
        return { eq: () => ({ error: null }) }
      },
    }),
  }),
}))

const { default: handler } = await import('../../../api/shopify/sync/bulk-finish')

function makeWebhookReq(payload: unknown, overrides: { sig?: string; shop?: string } = {}): Request {
  const body = JSON.stringify(payload)
  return new Request('http://local/api/shopify/sync/bulk-finish', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-shopify-hmac-sha256': overrides.sig ?? 'valid-sig',
      'x-shopify-shop-domain': overrides.shop ?? SHOP,
    },
    body,
  })
}

const completedPayload = {
  admin_graphql_api_id: 'gid://shopify/BulkOperation/1',
  status: 'completed',
  url: JSONL_URL,
  object_count: 42,
}

describe('POST /api/shopify/sync/bulk-finish', () => {
  beforeEach(() => {
    process.env.SUPABASE_URL = 'http://localhost:54321'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
    process.env.SHOPIFY_WEBHOOK_SECRET = 'test-webhook-secret'
    hmacResult = true
    connResult = { data: { brand_id: BRAND_ID } }
    qstashCalls.length = 0
    updateCalls.length = 0
  })

  it('401 when HMAC verification fails', async () => {
    hmacResult = false
    const res = await handler(makeWebhookReq(completedPayload))
    expect(res.status).toBe(401)
  })

  it('200 when bulk operation status is not completed', async () => {
    const res = await handler(makeWebhookReq({ ...completedPayload, status: 'running' }))
    expect(res.status).toBe(200)
    expect(qstashCalls.length).toBe(0)
    expect(updateCalls.length).toBe(0)
  })

  it('200 when bulk operation url is missing', async () => {
    const res = await handler(makeWebhookReq({ ...completedPayload, url: '' }))
    expect(res.status).toBe(200)
    expect(qstashCalls.length).toBe(0)
  })

  it('200 when no shopify connection found for shop domain', async () => {
    connResult = { data: null }
    const res = await handler(makeWebhookReq(completedPayload))
    expect(res.status).toBe(200)
    expect(qstashCalls.length).toBe(0)
  })

  it('200 on success and updates sync_progress to parsing phase', async () => {
    const res = await handler(makeWebhookReq(completedPayload))
    expect(res.status).toBe(200)
    expect(updateCalls.length).toBe(1)
    const progress = updateCalls[0].sync_progress as {
      phase: string
      count_done: number
      count_total: number
      url: string
    }
    expect(progress.phase).toBe('parsing')
    expect(progress.count_done).toBe(0)
    expect(progress.count_total).toBe(42)
    expect(progress.url).toBe(JSONL_URL)
  })

  it('enqueues QStash worker job with correct payload on success', async () => {
    await handler(makeWebhookReq(completedPayload))
    expect(qstashCalls.length).toBe(1)
    expect(qstashCalls[0].url).toContain('/api/shopify/sync/worker')
    const body = qstashCalls[0].body as {
      brand_id: string
      url: string
      cursor: number
      count_total: number
    }
    expect(body.brand_id).toBe(BRAND_ID)
    expect(body.url).toBe(JSONL_URL)
    expect(body.cursor).toBe(0)
    expect(body.count_total).toBe(42)
  })
})
