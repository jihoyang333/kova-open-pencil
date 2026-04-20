import { describe, it, expect, mock, beforeEach, beforeAll, afterAll } from 'bun:test'

const BRAND_A = 'brand-prod-a'
const BRAND_B = 'brand-prod-b'
const SHOP_A = 'prod-a.myshopify.com'
const SHOP_B = 'prod-b.myshopify.com'

// Mutable state per test
let activeConnections: Array<{ brand_id: string; shop_domain: string }> = []
let tokenByBrand: Record<string, string | null> = {}
const upsertCalls: Array<{ table: string; rows: unknown[]; opts: unknown }> = []
const fetchUrls: string[] = []

// Shopify fetch responses keyed by URL substring
const shopifyResponses: Record<string, { status: number; body: unknown; link?: string }> = {}

let handler: (req: Request) => Promise<Response>
let buildUpsertRows: (brandId: string, products: unknown[]) => unknown[]
let last6hIso: () => string

describe('GET /api/shopify/cron/product-delta', () => {
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
          if (table === 'shopify_products') {
            return {
              upsert: (rows: unknown[], opts: unknown) => {
                upsertCalls.push({ table, rows, opts })
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

      for (const [key, resp] of Object.entries(shopifyResponses)) {
        if (urlStr.includes(key)) {
          const headers: Record<string, string> = {}
          if (resp.link) headers['link'] = resp.link
          return new Response(JSON.stringify(resp.body), { status: resp.status, headers })
        }
      }
      return new Response(JSON.stringify({ products: [] }), { status: 200 })
    }

    const mod = await import('../../../api/shopify/cron/product-delta')
    handler = mod.default
    buildUpsertRows = mod.buildUpsertRows as (brandId: string, products: unknown[]) => unknown[]
    last6hIso = mod.last6hIso
  })

  afterAll(() => mock.restore())

  beforeEach(() => {
    process.env.SUPABASE_URL = 'http://localhost:54321'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role'
    delete process.env.CRON_SECRET

    upsertCalls.length = 0
    fetchUrls.length = 0
    for (const key of Object.keys(shopifyResponses)) delete shopifyResponses[key]

    activeConnections = [{ brand_id: BRAND_A, shop_domain: SHOP_A }]
    tokenByBrand = { [BRAND_A]: 'token-a' }
  })

  // --- Auth ---

  it('allows requests when CRON_SECRET is not set', async () => {
    const res = await handler(new Request('http://local/api/shopify/cron/product-delta'))
    expect(res.status).toBe(200)
  })

  it('401 when CRON_SECRET is set and Authorization header is absent', async () => {
    process.env.CRON_SECRET = 'secret-prod'
    const res = await handler(new Request('http://local/api/shopify/cron/product-delta'))
    expect(res.status).toBe(401)
    expect(upsertCalls.length).toBe(0)
  })

  it('401 when CRON_SECRET is set and Authorization header is wrong', async () => {
    process.env.CRON_SECRET = 'secret-prod'
    const res = await handler(
      new Request('http://local/api/shopify/cron/product-delta', {
        headers: { authorization: 'Bearer wrong' },
      }),
    )
    expect(res.status).toBe(401)
    expect(upsertCalls.length).toBe(0)
  })

  it('200 when CRON_SECRET matches', async () => {
    process.env.CRON_SECRET = 'secret-prod'
    const res = await handler(
      new Request('http://local/api/shopify/cron/product-delta', {
        headers: { authorization: 'Bearer secret-prod' },
      }),
    )
    expect(res.status).toBe(200)
  })

  // --- No-op paths ---

  it('200 with no upserts when no active connections', async () => {
    activeConnections = []
    const res = await handler(new Request('http://local/api/shopify/cron/product-delta'))
    expect(res.status).toBe(200)
    expect(upsertCalls.length).toBe(0)
  })

  it('200 with no upserts when token is null for brand', async () => {
    tokenByBrand = { [BRAND_A]: null as unknown as string }
    const res = await handler(new Request('http://local/api/shopify/cron/product-delta'))
    expect(res.status).toBe(200)
    expect(upsertCalls.length).toBe(0)
  })

  it('200 with no upserts when products response is empty', async () => {
    shopifyResponses[SHOP_A] = { status: 200, body: { products: [] } }
    const res = await handler(new Request('http://local/api/shopify/cron/product-delta'))
    expect(res.status).toBe(200)
    expect(upsertCalls.length).toBe(0)
  })

  // --- Upsert correctness ---

  it('upserts products with correct field mapping', async () => {
    shopifyResponses[SHOP_A] = {
      status: 200,
      body: {
        products: [
          {
            id: 11111111,
            handle: 'test-shirt',
            title: 'Test Shirt',
            body_html: '<p>Great shirt</p>',
            product_type: 'Apparel',
            vendor: 'Acme',
            tags: 'shirt, sale, new',
            status: 'active',
            published_at: '2026-04-01T10:00:00Z',
          },
        ],
      },
    }

    await handler(new Request('http://local/api/shopify/cron/product-delta'))

    expect(upsertCalls.length).toBe(1)
    const rows = upsertCalls[0].rows as Array<Record<string, unknown>>
    expect(rows.length).toBe(1)
    const row = rows[0]
    expect(row.brand_id).toBe(BRAND_A)
    expect(row.shopify_product_id).toBe('gid://shopify/Product/11111111')
    expect(row.handle).toBe('test-shirt')
    expect(row.title).toBe('Test Shirt')
    expect(row.description_html).toBe('<p>Great shirt</p>')
    expect(row.product_type).toBe('Apparel')
    expect(row.vendor).toBe('Acme')
    expect(row.tags).toEqual(['shirt', 'sale', 'new'])
    expect(row.status).toBe('active')
    expect(row.published_at).toBe('2026-04-01T10:00:00Z')
  })

  it('upserts with correct onConflict option', async () => {
    shopifyResponses[SHOP_A] = {
      status: 200,
      body: {
        products: [
          { id: 11111111, handle: 'h', title: 'T', body_html: null, product_type: null, vendor: null, tags: '', status: 'active', published_at: null },
        ],
      },
    }
    await handler(new Request('http://local/api/shopify/cron/product-delta'))
    expect(upsertCalls.length).toBe(1)
    const opts = upsertCalls[0].opts as Record<string, unknown>
    expect(opts.onConflict).toBe('brand_id,shopify_product_id')
  })

  it('handles null optional fields correctly', async () => {
    shopifyResponses[SHOP_A] = {
      status: 200,
      body: {
        products: [
          { id: 22222222, handle: 'h', title: 'T', body_html: null, product_type: null, vendor: null, tags: '', status: 'draft', published_at: null },
        ],
      },
    }
    await handler(new Request('http://local/api/shopify/cron/product-delta'))
    const row = (upsertCalls[0].rows as Array<Record<string, unknown>>)[0]
    expect(row.description_html).toBeNull()
    expect(row.product_type).toBeNull()
    expect(row.vendor).toBeNull()
    expect(row.tags).toEqual([])
    expect(row.published_at).toBeNull()
  })

  it('upserts multiple products per brand', async () => {
    shopifyResponses[SHOP_A] = {
      status: 200,
      body: {
        products: [
          { id: 11111111, handle: 'h1', title: 'T1', body_html: null, product_type: null, vendor: null, tags: '', status: 'active', published_at: null },
          { id: 22222222, handle: 'h2', title: 'T2', body_html: null, product_type: null, vendor: null, tags: '', status: 'draft', published_at: null },
        ],
      },
    }
    await handler(new Request('http://local/api/shopify/cron/product-delta'))
    const rows = upsertCalls[0].rows as Array<Record<string, unknown>>
    expect(rows.length).toBe(2)
    const ids = rows.map((r) => r.shopify_product_id).sort()
    expect(ids).toEqual(['gid://shopify/Product/11111111', 'gid://shopify/Product/22222222'].sort())
  })

  // --- Pagination ---

  it('follows Link: next header to fetch all pages', async () => {
    const page2Key = 'page_info=prod-page2'
    const page2Url = `https://${SHOP_A}/admin/api/2024-10/products.json?${page2Key}`

    shopifyResponses['products.json?updated_at_min'] = {
      status: 200,
      body: {
        products: [{ id: 11111111, handle: 'h1', title: 'T1', body_html: null, product_type: null, vendor: null, tags: '', status: 'active', published_at: null }],
      },
      link: `<${page2Url}>; rel="next"`,
    }
    shopifyResponses[page2Key] = {
      status: 200,
      body: {
        products: [{ id: 22222222, handle: 'h2', title: 'T2', body_html: null, product_type: null, vendor: null, tags: '', status: 'active', published_at: null }],
      },
    }

    await handler(new Request('http://local/api/shopify/cron/product-delta'))

    // Both pages are fetched and included in a single upsert
    expect(upsertCalls.length).toBe(1)
    const rows = upsertCalls[0].rows as Array<Record<string, unknown>>
    expect(rows.length).toBe(2)
  })

  // --- Error handling ---

  it('207 when Shopify API returns non-200 for one brand', async () => {
    activeConnections = [
      { brand_id: BRAND_A, shop_domain: SHOP_A },
      { brand_id: BRAND_B, shop_domain: SHOP_B },
    ]
    tokenByBrand = { [BRAND_A]: 'token-a', [BRAND_B]: 'token-b' }

    shopifyResponses[SHOP_A] = { status: 200, body: { products: [] } }
    shopifyResponses[SHOP_B] = { status: 500, body: {} }

    const res = await handler(new Request('http://local/api/shopify/cron/product-delta'))
    expect(res.status).toBe(207)
    const body = (await res.json()) as { ok: boolean; errors: string[] }
    expect(body.ok).toBe(false)
    expect(body.errors.some((e) => e.includes(BRAND_B))).toBe(true)
  })

  it('200 with ok:true when all brands succeed', async () => {
    shopifyResponses[SHOP_A] = { status: 200, body: { products: [] } }
    const res = await handler(new Request('http://local/api/shopify/cron/product-delta'))
    expect(res.status).toBe(200)
    const body = (await res.json()) as { ok: boolean }
    expect(body.ok).toBe(true)
  })

  it('processes multiple brands independently', async () => {
    activeConnections = [
      { brand_id: BRAND_A, shop_domain: SHOP_A },
      { brand_id: BRAND_B, shop_domain: SHOP_B },
    ]
    tokenByBrand = { [BRAND_A]: 'token-a', [BRAND_B]: 'token-b' }

    shopifyResponses[SHOP_A] = {
      status: 200,
      body: { products: [{ id: 11111111, handle: 'h1', title: 'T1', body_html: null, product_type: null, vendor: null, tags: '', status: 'active', published_at: null }] },
    }
    shopifyResponses[SHOP_B] = {
      status: 200,
      body: { products: [{ id: 33333333, handle: 'h3', title: 'T3', body_html: null, product_type: null, vendor: null, tags: '', status: 'active', published_at: null }] },
    }

    await handler(new Request('http://local/api/shopify/cron/product-delta'))
    expect(upsertCalls.length).toBe(2)
    const brands = upsertCalls.map((c) => (c.rows as Array<Record<string, unknown>>)[0].brand_id).sort()
    expect(brands).toEqual([BRAND_A, BRAND_B].sort())
  })

  // --- URL construction ---

  it('includes updated_at_min query parameter in Shopify request', async () => {
    await handler(new Request('http://local/api/shopify/cron/product-delta'))
    const productsFetch = fetchUrls.find((u) => u.includes('products.json'))
    expect(productsFetch).toBeDefined()
    expect(productsFetch).toContain('updated_at_min=')
  })

  // --- buildUpsertRows unit tests ---

  it('buildUpsertRows converts comma-separated tags to array', () => {
    const rows = buildUpsertRows(BRAND_A, [
      { id: 1, handle: 'h', title: 'T', body_html: null, product_type: null, vendor: null, tags: 'a, b, c', status: 'active', published_at: null },
    ]) as Array<Record<string, unknown>>
    expect(rows[0].tags).toEqual(['a', 'b', 'c'])
  })

  it('buildUpsertRows handles empty tags string as empty array', () => {
    const rows = buildUpsertRows(BRAND_A, [
      { id: 1, handle: 'h', title: 'T', body_html: null, product_type: null, vendor: null, tags: '', status: 'active', published_at: null },
    ]) as Array<Record<string, unknown>>
    expect(rows[0].tags).toEqual([])
  })

  it('buildUpsertRows formats shopify_product_id as GID', () => {
    const rows = buildUpsertRows(BRAND_A, [
      { id: 987654321, handle: 'h', title: 'T', body_html: null, product_type: null, vendor: null, tags: '', status: 'active', published_at: null },
    ]) as Array<Record<string, unknown>>
    expect(rows[0].shopify_product_id).toBe('gid://shopify/Product/987654321')
  })

  // --- last6hIso ---

  it('last6hIso returns an ISO string between 6h and 7h in the past', () => {
    const now = Date.now()
    const result = last6hIso()
    const ts = new Date(result).getTime()
    const diffMs = now - ts
    // Function floors to the start of the 6h-ago hour, so diff is in [6h, 7h)
    expect(diffMs).toBeGreaterThanOrEqual(6 * 60 * 60 * 1000)
    expect(diffMs).toBeLessThan(7 * 60 * 60 * 1000)
  })
})
