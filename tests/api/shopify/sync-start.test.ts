import { describe, it, expect, mock, beforeEach } from 'bun:test'

// Supabase mock state
const mockConn = { shop_domain: 'test.myshopify.com' }
const mockToken = 'shpat_test'

let connQueryResult: { data: typeof mockConn | null; error: null } = { data: mockConn, error: null }

mock.module('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          single: async () => connQueryResult,
          maybeSingle: async () => connQueryResult,
        }),
      }),
      update: () => ({
        eq: () => ({ error: null }),
      }),
    }),
    rpc: () => Promise.resolve({ data: mockToken, error: null }),
    auth: {
      getUser: async () => ({ data: { user: null }, error: { message: 'Not authenticated' } }),
    },
  }),
}))

// Import handler after mocks are set up
const { default: handler } = await import('../../../api/shopify/sync/bulk-start')

const INTERNAL_KEY = 'test-internal-key'

function req(body: unknown): Request {
  return new Request('http://local/api/shopify/sync/bulk-start', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Kova-Internal': INTERNAL_KEY,
    },
    body: JSON.stringify(body),
  })
}

describe('POST /api/shopify/sync/bulk-start', () => {
  beforeEach(() => {
    process.env.KOVA_INTERNAL_KEY = INTERNAL_KEY
    process.env.SUPABASE_URL = 'http://localhost:54321'
    process.env.VITE_SUPABASE_URL = 'http://localhost:54321'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
    connQueryResult = { data: mockConn, error: null }
  })

  it('401 when X-Kova-Internal header is missing and no JWT', async () => {
    const res = await handler(
      new Request('http://local/api/shopify/sync/bulk-start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand_id: 'b1' }),
      }),
    )
    expect(res.status).toBe(401)
  })

  it('401 when X-Kova-Internal header has wrong value and no JWT', async () => {
    const res = await handler(
      new Request('http://local/api/shopify/sync/bulk-start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Kova-Internal': 'wrong-key',
        },
        body: JSON.stringify({ brand_id: 'b1' }),
      }),
    )
    expect(res.status).toBe(401)
  })

  it('404 when brand has no shopify connection', async () => {
    connQueryResult = { data: null, error: null }
    const res = await handler(req({ brand_id: 'no-connection' }))
    expect(res.status).toBe(404)
  })

  it('200 with bulk_op_id on success', async () => {
    const bulkOpId = 'gid://shopify/BulkOperation/1'
    globalThis.fetch = mock(async () =>
      new Response(
        JSON.stringify({
          data: {
            bulkOperationRunQuery: {
              bulkOperation: { id: bulkOpId, status: 'CREATED' },
              userErrors: [],
            },
          },
        }),
        { status: 200 },
      ),
    ) as typeof fetch

    const res = await handler(req({ brand_id: 'b1' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.bulk_op_id).toBe(bulkOpId)
  })

  it('502 when Shopify returns userErrors', async () => {
    globalThis.fetch = mock(async () =>
      new Response(
        JSON.stringify({
          data: {
            bulkOperationRunQuery: {
              bulkOperation: null,
              userErrors: [{ message: 'Operation in progress' }],
            },
          },
        }),
        { status: 200 },
      ),
    ) as typeof fetch

    const res = await handler(req({ brand_id: 'b1' }))
    expect(res.status).toBe(502)
  })
})
