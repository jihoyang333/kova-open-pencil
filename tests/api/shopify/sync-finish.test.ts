import { describe, it, expect, mock, beforeAll, beforeEach, afterAll } from 'bun:test'
import { createHmac } from 'node:crypto'

const BRAND_ID = 'brand-uuid-1'
const SHOP = 'test.myshopify.com'
const JSONL_URL = 'https://storage.googleapis.com/bulk-op/output.jsonl'
const WEBHOOK_SECRET = 'test-webhook-secret'

function computeHmac(body: string): string {
  return createHmac('sha256', WEBHOOK_SECRET).update(body).digest('base64')
}

const processBulkJsonlCalls: Array<{ brandId: string; url: string; countTotal: number }> = []
let processBulkJsonlShouldThrow = false
let connResult: { data: { brand_id: string } | null } = { data: { brand_id: BRAND_ID } }
const updateCalls: Array<{ sync_progress: unknown }> = []

let handler: (req: Request) => Promise<Response>

const completedPayload = {
  admin_graphql_api_id: 'gid://shopify/BulkOperation/1',
  status: 'completed',
  url: JSONL_URL,
  object_count: 42,
}

function makeWebhookReq(payload: unknown, overrides: { sig?: string; shop?: string } = {}): Request {
  const body = JSON.stringify(payload)
  return new Request('http://local/api/shopify/sync/bulk-finish', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-shopify-hmac-sha256': overrides.sig ?? computeHmac(body),
      'x-shopify-shop-domain': overrides.shop ?? SHOP,
    },
    body,
  })
}

describe('POST /api/shopify/sync/bulk-finish', () => {
  beforeAll(async () => {
    mock.module('../../../api/_shared/shopify-bulk-processor', () => ({
      processBulkJsonl: async (
        _admin: unknown,
        brandId: string,
        url: string,
        countTotal: number,
      ): Promise<{ count_done: number }> => {
        processBulkJsonlCalls.push({ brandId, url, countTotal })
        if (processBulkJsonlShouldThrow) throw new Error('JSONL fetch failed')
        return { count_done: countTotal }
      },
    }))
    mock.module('@supabase/supabase-js', () => ({
      createClient: () => ({
        from: (_table: string) => ({
          select: () => ({ eq: () => ({ single: async () => connResult }) }),
          update: (data: { sync_progress: unknown }) => {
            updateCalls.push(data)
            return { eq: () => ({ error: null }) }
          },
        }),
      }),
    }))
    const mod = await import('../../../api/shopify/sync/bulk-finish')
    handler = mod.default
  })

  afterAll(() => mock.restore())

  beforeEach(() => {
    process.env.SUPABASE_URL = 'http://localhost:54321'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
    process.env.SHOPIFY_WEBHOOK_SECRET = WEBHOOK_SECRET
    connResult = { data: { brand_id: BRAND_ID } }
    processBulkJsonlShouldThrow = false
    processBulkJsonlCalls.length = 0
    updateCalls.length = 0
  })

  it('401 when HMAC verification fails', async () => {
    const res = await handler(makeWebhookReq(completedPayload, { sig: 'invalid-sig' }))
    expect(res.status).toBe(401)
  })

  it('200 when bulk operation status is not completed', async () => {
    const res = await handler(makeWebhookReq({ ...completedPayload, status: 'running' }))
    expect(res.status).toBe(200)
    expect(processBulkJsonlCalls.length).toBe(0)
    expect(updateCalls.length).toBe(0)
  })

  it('200 on failed status: updates sync_progress to error phase', async () => {
    const res = await handler(makeWebhookReq({ ...completedPayload, status: 'failed' }))
    expect(res.status).toBe(200)
    expect(processBulkJsonlCalls.length).toBe(0)
    expect(updateCalls.length).toBe(1)
    const progress = updateCalls[0].sync_progress as { phase: string; error: string }
    expect(progress.phase).toBe('error')
    expect(progress.error).toContain('failed')
  })

  it('200 on cancelled status: updates sync_progress to error phase', async () => {
    const res = await handler(makeWebhookReq({ ...completedPayload, status: 'cancelled' }))
    expect(res.status).toBe(200)
    expect(processBulkJsonlCalls.length).toBe(0)
    expect(updateCalls.length).toBe(1)
    const progress = updateCalls[0].sync_progress as { phase: string; error: string }
    expect(progress.phase).toBe('error')
    expect(progress.error).toContain('cancelled')
  })

  it('200 when bulk operation url is missing', async () => {
    const res = await handler(makeWebhookReq({ ...completedPayload, url: '' }))
    expect(res.status).toBe(200)
    expect(processBulkJsonlCalls.length).toBe(0)
  })

  it('200 when no shopify connection found for shop domain', async () => {
    connResult = { data: null }
    const res = await handler(makeWebhookReq(completedPayload))
    expect(res.status).toBe(200)
    expect(processBulkJsonlCalls.length).toBe(0)
  })

  it('200 on success: writes parsing phase then invokes processBulkJsonl', async () => {
    const res = await handler(makeWebhookReq(completedPayload))
    expect(res.status).toBe(200)
    // Two updates: phase=parsing pre-flight, then phase=done inside processBulkJsonl mock chain
    // (the mock flips the connection row but we only count the explicit pre-flight here).
    expect(updateCalls.length).toBeGreaterThanOrEqual(1)
    const parsing = updateCalls[0].sync_progress as {
      phase: string
      count_done: number
      count_total: number
      url: string
    }
    expect(parsing.phase).toBe('parsing')
    expect(parsing.count_done).toBe(0)
    expect(parsing.count_total).toBe(42)
    expect(parsing.url).toBe(JSONL_URL)
  })

  it('invokes processBulkJsonl with brand and JSONL url on success', async () => {
    await handler(makeWebhookReq(completedPayload))
    expect(processBulkJsonlCalls.length).toBe(1)
    expect(processBulkJsonlCalls[0].brandId).toBe(BRAND_ID)
    expect(processBulkJsonlCalls[0].url).toBe(JSONL_URL)
    expect(processBulkJsonlCalls[0].countTotal).toBe(42)
  })

  it('writes phase=error when processBulkJsonl throws', async () => {
    processBulkJsonlShouldThrow = true
    const res = await handler(makeWebhookReq(completedPayload))
    expect(res.status).toBe(200)
    expect(processBulkJsonlCalls.length).toBe(1)
    const errorUpdate = updateCalls.at(-1)?.sync_progress as { phase: string; error: string }
    expect(errorUpdate.phase).toBe('error')
    expect(errorUpdate.error).toContain('JSONL fetch failed')
  })
})
