import { describe, it, expect, mock, beforeEach, beforeAll, afterAll } from 'bun:test'

const BRAND_A = 'brand-orders-a'
const BRAND_B = 'brand-orders-b'
const SHOP_A = 'orders-a.myshopify.com'
const SHOP_B = 'orders-b.myshopify.com'
const LOCAL_VARIANT_1 = 'local-variant-uuid-1'
const LOCAL_VARIANT_2 = 'local-variant-uuid-2'
const SHOPIFY_NUM_1 = 11111111
const SHOPIFY_NUM_2 = 22222222

// Mutable state controlled per test
let activeConnections: Array<{ brand_id: string; shop_domain: string }> = []
let tokenByBrand: Record<string, string | null> = {}
let variantsByBrand: Record<string, Array<{ id: string; shopify_variant_id: string }>> = {}
const upsertCalls: Array<{ table: string; rows: unknown[]; opts: unknown }> = []
const fetchUrls: string[] = []

// Shopify fetch responses keyed by shop_domain substring
const shopifyResponses: Record<
  string,
  { status: number; body: unknown; link?: string }
> = {}

let handler: (req: Request) => Promise<Response>

describe('GET /api/shopify/cron/orders-agg', () => {
  beforeAll(async () => {
    mock.module('@supabase/supabase-js', () => ({
      createClient: () => ({
        from: (table: string) => {
          if (table === 'shopify_connections') {
            return {
              select: (_cols: string) => ({
                eq: (_col: string, _val: unknown) => ({
                  data: activeConnections,
                  error: null,
                }),
              }),
            }
          }
          if (table === 'shopify_variants') {
            return {
              select: (_cols: string) => ({
                eq: (_col: string, val: unknown) => ({
                  in: (_col2: string, _vals: unknown[]) => ({
                    data: variantsByBrand[val as string] ?? [],
                    error: null,
                  }),
                }),
              }),
            }
          }
          if (table === 'shopify_orders_agg') {
            return {
              upsert: (rows: unknown[], opts: unknown) => {
                upsertCalls.push({ table, rows: rows as unknown[], opts })
                return { error: null }
              },
            }
          }
          return {}
        },
        rpc: (_fn: string, args: { p_brand_id?: string }) => ({
          data: args.p_brand_id ? (tokenByBrand[args.p_brand_id] ?? null) : null,
          error: null,
        }),
      }),
    }))

    globalThis.fetch = async (url: unknown) => {
      const urlStr = typeof url === 'string' ? url : String(url)
      fetchUrls.push(urlStr)

      for (const [domain, resp] of Object.entries(shopifyResponses)) {
        if (urlStr.includes(domain)) {
          const headers: Record<string, string> = {}
          if (resp.link) headers['link'] = resp.link
          return new Response(JSON.stringify(resp.body), {
            status: resp.status,
            headers,
          })
        }
      }
      return new Response(JSON.stringify({ orders: [] }), { status: 200 })
    }

    const mod = await import('../../../api/shopify/cron/orders-agg')
    handler = mod.default
  })

  afterAll(() => mock.restore())

  beforeEach(() => {
    process.env.SUPABASE_URL = 'http://localhost:54321'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role'
    delete process.env.CRON_SECRET

    upsertCalls.length = 0
    fetchUrls.length = 0

    activeConnections = [{ brand_id: BRAND_A, shop_domain: SHOP_A }]
    tokenByBrand = { [BRAND_A]: 'token-a' }
    variantsByBrand = {
      [BRAND_A]: [
        { id: LOCAL_VARIANT_1, shopify_variant_id: `gid://shopify/ProductVariant/${SHOPIFY_NUM_1}` },
        { id: LOCAL_VARIANT_2, shopify_variant_id: `gid://shopify/ProductVariant/${SHOPIFY_NUM_2}` },
      ],
    }
    shopifyResponses[SHOP_A] = { status: 200, body: { orders: [] } }
    delete shopifyResponses[SHOP_B]
  })

  // --- Auth ---

  it('allows requests when CRON_SECRET is not set', async () => {
    const res = await handler(new Request('http://local/api/shopify/cron/orders-agg'))
    expect(res.status).toBe(200)
  })

  it('401 when CRON_SECRET is set and Authorization header is absent', async () => {
    process.env.CRON_SECRET = 'secret-xyz'
    const res = await handler(new Request('http://local/api/shopify/cron/orders-agg'))
    expect(res.status).toBe(401)
    expect(upsertCalls.length).toBe(0)
  })

  it('401 when CRON_SECRET is set and Authorization header is wrong', async () => {
    process.env.CRON_SECRET = 'secret-xyz'
    const res = await handler(
      new Request('http://local/api/shopify/cron/orders-agg', {
        headers: { authorization: 'Bearer wrong' },
      }),
    )
    expect(res.status).toBe(401)
    expect(upsertCalls.length).toBe(0)
  })

  it('200 when CRON_SECRET matches', async () => {
    process.env.CRON_SECRET = 'secret-xyz'
    const res = await handler(
      new Request('http://local/api/shopify/cron/orders-agg', {
        headers: { authorization: 'Bearer secret-xyz' },
      }),
    )
    expect(res.status).toBe(200)
  })

  // --- No-op paths ---

  it('200 with no upserts when no active connections', async () => {
    activeConnections = []
    const res = await handler(new Request('http://local/api/shopify/cron/orders-agg'))
    expect(res.status).toBe(200)
    expect(upsertCalls.length).toBe(0)
  })

  it('200 with no upserts when token is null for brand', async () => {
    tokenByBrand = { [BRAND_A]: null as unknown as string }
    const res = await handler(new Request('http://local/api/shopify/cron/orders-agg'))
    expect(res.status).toBe(200)
    expect(upsertCalls.length).toBe(0)
  })

  it('200 with no upserts when orders response is empty', async () => {
    shopifyResponses[SHOP_A] = { status: 200, body: { orders: [] } }
    const res = await handler(new Request('http://local/api/shopify/cron/orders-agg'))
    expect(res.status).toBe(200)
    expect(upsertCalls.length).toBe(0)
  })

  it('200 with no upserts when all line items have null variant_id', async () => {
    shopifyResponses[SHOP_A] = {
      status: 200,
      body: {
        orders: [
          {
            created_at: '2026-04-18T10:00:00Z',
            line_items: [{ variant_id: null, quantity: 3, price: '5.00' }],
          },
        ],
      },
    }
    const res = await handler(new Request('http://local/api/shopify/cron/orders-agg'))
    expect(res.status).toBe(200)
    expect(upsertCalls.length).toBe(0)
  })

  it('200 with no upserts when variant not found in shopify_variants', async () => {
    shopifyResponses[SHOP_A] = {
      status: 200,
      body: {
        orders: [
          {
            created_at: '2026-04-18T10:00:00Z',
            line_items: [{ variant_id: 99999999, quantity: 2, price: '10.00' }],
          },
        ],
      },
    }
    const res = await handler(new Request('http://local/api/shopify/cron/orders-agg'))
    expect(res.status).toBe(200)
    expect(upsertCalls.length).toBe(0)
  })

  // --- Aggregation correctness ---

  it('aggregates qty and revenue for same variant+date across multiple orders', async () => {
    shopifyResponses[SHOP_A] = {
      status: 200,
      body: {
        orders: [
          {
            created_at: '2026-04-18T10:00:00Z',
            line_items: [{ variant_id: SHOPIFY_NUM_1, quantity: 2, price: '15.00' }],
          },
          {
            created_at: '2026-04-18T20:00:00Z',
            line_items: [{ variant_id: SHOPIFY_NUM_1, quantity: 1, price: '15.00' }],
          },
        ],
      },
    }
    await handler(new Request('http://local/api/shopify/cron/orders-agg'))
    expect(upsertCalls.length).toBe(1)
    const rows = upsertCalls[0].rows as Array<Record<string, unknown>>
    expect(rows.length).toBe(1)
    const row = rows[0]
    expect(row.brand_id).toBe(BRAND_A)
    expect(row.variant_id).toBe(LOCAL_VARIANT_1)
    expect(row.date).toBe('2026-04-18')
    expect(row.qty_sold).toBe(3)
    expect(row.revenue).toBe(45)
  })

  it('produces separate rows for different dates', async () => {
    shopifyResponses[SHOP_A] = {
      status: 200,
      body: {
        orders: [
          {
            created_at: '2026-04-17T08:00:00Z',
            line_items: [{ variant_id: SHOPIFY_NUM_1, quantity: 1, price: '10.00' }],
          },
          {
            created_at: '2026-04-18T08:00:00Z',
            line_items: [{ variant_id: SHOPIFY_NUM_1, quantity: 2, price: '10.00' }],
          },
        ],
      },
    }
    await handler(new Request('http://local/api/shopify/cron/orders-agg'))
    const rows = (upsertCalls[0]?.rows ?? []) as Array<Record<string, unknown>>
    const dates = rows.map((r) => r.date as string).sort()
    expect(dates).toEqual(['2026-04-17', '2026-04-18'])
  })

  it('produces separate rows for different variants on the same date', async () => {
    shopifyResponses[SHOP_A] = {
      status: 200,
      body: {
        orders: [
          {
            created_at: '2026-04-18T10:00:00Z',
            line_items: [
              { variant_id: SHOPIFY_NUM_1, quantity: 1, price: '10.00' },
              { variant_id: SHOPIFY_NUM_2, quantity: 3, price: '20.00' },
            ],
          },
        ],
      },
    }
    await handler(new Request('http://local/api/shopify/cron/orders-agg'))
    const rows = (upsertCalls[0]?.rows ?? []) as Array<Record<string, unknown>>
    expect(rows.length).toBe(2)
    const variantIds = rows.map((r) => r.variant_id as string).sort()
    expect(variantIds).toEqual([LOCAL_VARIANT_1, LOCAL_VARIANT_2].sort())
  })

  it('upserts with correct onConflict option', async () => {
    shopifyResponses[SHOP_A] = {
      status: 200,
      body: {
        orders: [
          { created_at: '2026-04-18T10:00:00Z', line_items: [{ variant_id: SHOPIFY_NUM_1, quantity: 1, price: '5.00' }] },
        ],
      },
    }
    await handler(new Request('http://local/api/shopify/cron/orders-agg'))
    expect(upsertCalls.length).toBe(1)
    const opts = upsertCalls[0].opts as Record<string, unknown>
    expect(opts.onConflict).toBe('brand_id,variant_id,date')
  })

  // --- Pagination ---

  it('follows Link: next header to fetch all pages', async () => {
    const page2Url = `https://${SHOP_A}/admin/api/2024-10/orders.json?page_info=page2`
    shopifyResponses[SHOP_A] = {
      status: 200,
      body: { orders: [{ created_at: '2026-04-18T10:00:00Z', line_items: [{ variant_id: SHOPIFY_NUM_1, quantity: 1, price: '5.00' }] }] },
      link: `<${page2Url}>; rel="next"`,
    }
    // Override with a more specific matcher for page2
    shopifyResponses['page_info=page2'] = {
      status: 200,
      body: { orders: [{ created_at: '2026-04-18T12:00:00Z', line_items: [{ variant_id: SHOPIFY_NUM_1, quantity: 2, price: '5.00' }] }] },
    }

    await handler(new Request('http://local/api/shopify/cron/orders-agg'))

    const rows = (upsertCalls[0]?.rows ?? []) as Array<Record<string, unknown>>
    const row = rows.find((r) => r.date === '2026-04-18')
    expect(row?.qty_sold).toBe(3) // 1 + 2 from both pages
  })

  // --- Zero PII invariant ---

  it('upserted rows contain no customer PII fields', async () => {
    shopifyResponses[SHOP_A] = {
      status: 200,
      body: {
        orders: [
          { created_at: '2026-04-18T10:00:00Z', line_items: [{ variant_id: SHOPIFY_NUM_1, quantity: 1, price: '9.99' }] },
        ],
      },
    }
    await handler(new Request('http://local/api/shopify/cron/orders-agg'))
    const row = ((upsertCalls[0]?.rows ?? []) as Array<Record<string, unknown>>)[0]
    expect(row).toBeDefined()
    const banned = ['customer_id', 'customer_email', 'email', 'phone', 'name', 'address', 'customer']
    for (const field of banned) {
      expect(Object.keys(row)).not.toContain(field)
    }
    // Only these fields are allowed
    expect(Object.keys(row).sort()).toEqual(['brand_id', 'date', 'qty_sold', 'revenue', 'variant_id'].sort())
  })

  // --- Error handling ---

  it('207 when Shopify API returns non-200 for one brand', async () => {
    activeConnections = [
      { brand_id: BRAND_A, shop_domain: SHOP_A },
      { brand_id: BRAND_B, shop_domain: SHOP_B },
    ]
    tokenByBrand = { [BRAND_A]: 'token-a', [BRAND_B]: 'token-b' }
    variantsByBrand[BRAND_B] = []
    shopifyResponses[SHOP_A] = { status: 200, body: { orders: [] } }
    shopifyResponses[SHOP_B] = { status: 500, body: {} }

    const res = await handler(new Request('http://local/api/shopify/cron/orders-agg'))
    expect(res.status).toBe(207)
    const body = (await res.json()) as { ok: boolean; errors: string[] }
    expect(body.ok).toBe(false)
    expect(body.errors.some((e) => e.includes(BRAND_B))).toBe(true)
  })

  it('200 with no errors when all brands succeed', async () => {
    shopifyResponses[SHOP_A] = { status: 200, body: { orders: [] } }
    const res = await handler(new Request('http://local/api/shopify/cron/orders-agg'))
    expect(res.status).toBe(200)
    const body = (await res.json()) as { ok: boolean }
    expect(body.ok).toBe(true)
  })

  // --- Response body shape ---

  it('success response body has exactly { ok: true }', async () => {
    shopifyResponses[SHOP_A] = { status: 200, body: { orders: [] } }
    const res = await handler(new Request('http://local/api/shopify/cron/orders-agg'))
    const body = (await res.json()) as Record<string, unknown>
    expect(Object.keys(body).sort()).toEqual(['ok'])
    expect(body.ok).toBe(true)
  })

  it('error response body has exactly { ok, errors } with errors as string[]', async () => {
    activeConnections = [
      { brand_id: BRAND_A, shop_domain: SHOP_A },
      { brand_id: BRAND_B, shop_domain: SHOP_B },
    ]
    tokenByBrand = { [BRAND_A]: 'token-a', [BRAND_B]: 'token-b' }
    variantsByBrand[BRAND_B] = []
    shopifyResponses[SHOP_A] = { status: 200, body: { orders: [] } }
    shopifyResponses[SHOP_B] = { status: 500, body: {} }
    const res = await handler(new Request('http://local/api/shopify/cron/orders-agg'))
    const body = (await res.json()) as Record<string, unknown>
    expect(Object.keys(body).sort()).toEqual(['errors', 'ok'])
    expect(body.ok).toBe(false)
    expect(Array.isArray(body.errors)).toBe(true)
    expect((body.errors as unknown[]).every((e) => typeof e === 'string')).toBe(true)
  })
})
