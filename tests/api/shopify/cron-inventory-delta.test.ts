import { describe, it, expect, mock, beforeEach, beforeAll, afterAll } from 'bun:test'

const BRAND_A = 'brand-inv-a'
const BRAND_B = 'brand-inv-b'
const SHOP_A = 'inv-a.myshopify.com'
const SHOP_B = 'inv-b.myshopify.com'
const LOCAL_VARIANT_1 = 'local-inv-variant-uuid-1'
const LOCAL_VARIANT_2 = 'local-inv-variant-uuid-2'
const SHOPIFY_NUM_1 = 11111111
const SHOPIFY_NUM_2 = 22222222
const ITEM_ID_1 = 99900001
const ITEM_ID_2 = 99900002

// Mutable state per test
let activeConnections: Array<{ brand_id: string; shop_domain: string }> = []
let tokenByBrand: Record<string, string | null> = {}
let variantsByBrand: Record<string, Array<{ id: string; shopify_variant_id: string }>> = {}
const updateCalls: Array<{ id: string; inventory_qty: number }> = []
const fetchUrls: string[] = []

// Shopify fetch responses keyed by URL substring
const shopifyResponses: Record<string, { status: number; body: unknown; link?: string }> = {}

let handler: (req: Request) => Promise<Response>

describe('GET /api/shopify/cron/inventory-delta', () => {
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
              update: (fields: Record<string, unknown>) => ({
                eq: (_col: string, id: unknown) => {
                  updateCalls.push({ id: id as string, inventory_qty: fields.inventory_qty as number })
                  return { error: null }
                },
              }),
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
      // Default empty responses
      if (urlStr.includes('inventory_levels')) {
        return new Response(JSON.stringify({ inventory_levels: [] }), { status: 200 })
      }
      if (urlStr.includes('inventory_items')) {
        return new Response(JSON.stringify({ inventory_items: [] }), { status: 200 })
      }
      return new Response('{}', { status: 200 })
    }

    const mod = await import('../../../api/shopify/cron/inventory-delta')
    handler = mod.default
  })

  afterAll(() => mock.restore())

  beforeEach(() => {
    process.env.SUPABASE_URL = 'http://localhost:54321'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role'
    delete process.env.CRON_SECRET

    updateCalls.length = 0
    fetchUrls.length = 0
    for (const key of Object.keys(shopifyResponses)) delete shopifyResponses[key]

    activeConnections = [{ brand_id: BRAND_A, shop_domain: SHOP_A }]
    tokenByBrand = { [BRAND_A]: 'token-a' }
    variantsByBrand = {
      [BRAND_A]: [
        { id: LOCAL_VARIANT_1, shopify_variant_id: `gid://shopify/ProductVariant/${SHOPIFY_NUM_1}` },
        { id: LOCAL_VARIANT_2, shopify_variant_id: `gid://shopify/ProductVariant/${SHOPIFY_NUM_2}` },
      ],
    }
  })

  // --- Auth ---

  it('allows requests when CRON_SECRET is not set', async () => {
    const res = await handler(new Request('http://local/api/shopify/cron/inventory-delta'))
    expect(res.status).toBe(200)
  })

  it('401 when CRON_SECRET is set and Authorization header is absent', async () => {
    process.env.CRON_SECRET = 'secret-inv'
    const res = await handler(new Request('http://local/api/shopify/cron/inventory-delta'))
    expect(res.status).toBe(401)
    expect(updateCalls.length).toBe(0)
  })

  it('401 when CRON_SECRET is set and Authorization header is wrong', async () => {
    process.env.CRON_SECRET = 'secret-inv'
    const res = await handler(
      new Request('http://local/api/shopify/cron/inventory-delta', {
        headers: { authorization: 'Bearer wrong' },
      }),
    )
    expect(res.status).toBe(401)
    expect(updateCalls.length).toBe(0)
  })

  it('200 when CRON_SECRET matches', async () => {
    process.env.CRON_SECRET = 'secret-inv'
    const res = await handler(
      new Request('http://local/api/shopify/cron/inventory-delta', {
        headers: { authorization: 'Bearer secret-inv' },
      }),
    )
    expect(res.status).toBe(200)
  })

  // --- No-op paths ---

  it('200 with no updates when no active connections', async () => {
    activeConnections = []
    const res = await handler(new Request('http://local/api/shopify/cron/inventory-delta'))
    expect(res.status).toBe(200)
    expect(updateCalls.length).toBe(0)
  })

  it('200 with no updates when token is null', async () => {
    tokenByBrand = { [BRAND_A]: null as unknown as string }
    const res = await handler(new Request('http://local/api/shopify/cron/inventory-delta'))
    expect(res.status).toBe(200)
    expect(updateCalls.length).toBe(0)
  })

  it('200 with no updates when inventory_levels response is empty', async () => {
    shopifyResponses['inventory_levels'] = { status: 200, body: { inventory_levels: [] } }
    const res = await handler(new Request('http://local/api/shopify/cron/inventory-delta'))
    expect(res.status).toBe(200)
    expect(updateCalls.length).toBe(0)
  })

  it('200 with no updates when all available values are null', async () => {
    shopifyResponses['inventory_levels'] = {
      status: 200,
      body: { inventory_levels: [{ inventory_item_id: ITEM_ID_1, available: null }] },
    }
    shopifyResponses['inventory_items'] = {
      status: 200,
      body: { inventory_items: [{ id: ITEM_ID_1, variant_id: SHOPIFY_NUM_1 }] },
    }
    const res = await handler(new Request('http://local/api/shopify/cron/inventory-delta'))
    expect(res.status).toBe(200)
    expect(updateCalls.length).toBe(0)
  })

  it('200 with no updates when inventory_item has no variant_id', async () => {
    shopifyResponses['inventory_levels'] = {
      status: 200,
      body: { inventory_levels: [{ inventory_item_id: ITEM_ID_1, available: 5 }] },
    }
    shopifyResponses['inventory_items'] = {
      status: 200,
      body: { inventory_items: [{ id: ITEM_ID_1, variant_id: null }] },
    }
    const res = await handler(new Request('http://local/api/shopify/cron/inventory-delta'))
    expect(res.status).toBe(200)
    expect(updateCalls.length).toBe(0)
  })

  it('200 with no updates when variant not found in shopify_variants', async () => {
    shopifyResponses['inventory_levels'] = {
      status: 200,
      body: { inventory_levels: [{ inventory_item_id: ITEM_ID_1, available: 5 }] },
    }
    shopifyResponses['inventory_items'] = {
      status: 200,
      body: { inventory_items: [{ id: ITEM_ID_1, variant_id: 99999999 }] },
    }
    const res = await handler(new Request('http://local/api/shopify/cron/inventory-delta'))
    expect(res.status).toBe(200)
    expect(updateCalls.length).toBe(0)
  })

  // --- Aggregation correctness ---

  it('sums available across multiple locations for the same inventory_item_id', async () => {
    shopifyResponses['inventory_levels'] = {
      status: 200,
      body: {
        inventory_levels: [
          { inventory_item_id: ITEM_ID_1, available: 10 },
          { inventory_item_id: ITEM_ID_1, available: 5 },
        ],
      },
    }
    shopifyResponses['inventory_items'] = {
      status: 200,
      body: { inventory_items: [{ id: ITEM_ID_1, variant_id: SHOPIFY_NUM_1 }] },
    }

    await handler(new Request('http://local/api/shopify/cron/inventory-delta'))

    expect(updateCalls.length).toBe(1)
    expect(updateCalls[0].id).toBe(LOCAL_VARIANT_1)
    expect(updateCalls[0].inventory_qty).toBe(15)
  })

  it('emits separate updates for distinct inventory_item_ids', async () => {
    shopifyResponses['inventory_levels'] = {
      status: 200,
      body: {
        inventory_levels: [
          { inventory_item_id: ITEM_ID_1, available: 3 },
          { inventory_item_id: ITEM_ID_2, available: 7 },
        ],
      },
    }
    shopifyResponses['inventory_items'] = {
      status: 200,
      body: {
        inventory_items: [
          { id: ITEM_ID_1, variant_id: SHOPIFY_NUM_1 },
          { id: ITEM_ID_2, variant_id: SHOPIFY_NUM_2 },
        ],
      },
    }

    await handler(new Request('http://local/api/shopify/cron/inventory-delta'))

    expect(updateCalls.length).toBe(2)
    const ids = updateCalls.map((u) => u.id).sort()
    expect(ids).toEqual([LOCAL_VARIANT_1, LOCAL_VARIANT_2].sort())
    const qtys = new Map(updateCalls.map((u) => [u.id, u.inventory_qty]))
    expect(qtys.get(LOCAL_VARIANT_1)).toBe(3)
    expect(qtys.get(LOCAL_VARIANT_2)).toBe(7)
  })

  it('handles zero available correctly (out of stock)', async () => {
    shopifyResponses['inventory_levels'] = {
      status: 200,
      body: { inventory_levels: [{ inventory_item_id: ITEM_ID_1, available: 0 }] },
    }
    shopifyResponses['inventory_items'] = {
      status: 200,
      body: { inventory_items: [{ id: ITEM_ID_1, variant_id: SHOPIFY_NUM_1 }] },
    }

    await handler(new Request('http://local/api/shopify/cron/inventory-delta'))

    expect(updateCalls.length).toBe(1)
    expect(updateCalls[0].inventory_qty).toBe(0)
  })

  // --- Pagination ---

  it('follows Link: next header to fetch all pages of inventory_levels', async () => {
    const page2Key = 'page_info=inv-page2'
    const page2Url = `https://${SHOP_A}/admin/api/2024-10/inventory_levels.json?${page2Key}`

    shopifyResponses['inventory_levels.json'] = {
      status: 200,
      body: { inventory_levels: [{ inventory_item_id: ITEM_ID_1, available: 4 }] },
      link: `<${page2Url}>; rel="next"`,
    }
    shopifyResponses[page2Key] = {
      status: 200,
      body: { inventory_levels: [{ inventory_item_id: ITEM_ID_1, available: 6 }] },
    }
    shopifyResponses['inventory_items'] = {
      status: 200,
      body: { inventory_items: [{ id: ITEM_ID_1, variant_id: SHOPIFY_NUM_1 }] },
    }

    await handler(new Request('http://local/api/shopify/cron/inventory-delta'))

    expect(updateCalls.length).toBe(1)
    expect(updateCalls[0].inventory_qty).toBe(10) // 4 + 6 from both pages
  })

  // --- Error handling ---

  it('207 when Shopify inventory_levels returns non-200 for one brand', async () => {
    activeConnections = [
      { brand_id: BRAND_A, shop_domain: SHOP_A },
      { brand_id: BRAND_B, shop_domain: SHOP_B },
    ]
    tokenByBrand = { [BRAND_A]: 'token-a', [BRAND_B]: 'token-b' }
    variantsByBrand[BRAND_B] = []

    shopifyResponses[SHOP_A] = { status: 200, body: { inventory_levels: [] } }
    shopifyResponses[SHOP_B] = { status: 500, body: {} }

    const res = await handler(new Request('http://local/api/shopify/cron/inventory-delta'))
    expect(res.status).toBe(207)
    const body = (await res.json()) as { ok: boolean; errors: string[] }
    expect(body.ok).toBe(false)
    expect(body.errors.some((e) => e.includes(BRAND_B))).toBe(true)
  })

  it('200 with ok:true when all brands succeed', async () => {
    const res = await handler(new Request('http://local/api/shopify/cron/inventory-delta'))
    expect(res.status).toBe(200)
    const body = (await res.json()) as { ok: boolean }
    expect(body.ok).toBe(true)
  })

  it('207 when Shopify inventory_items returns non-200', async () => {
    shopifyResponses['inventory_levels'] = {
      status: 200,
      body: { inventory_levels: [{ inventory_item_id: ITEM_ID_1, available: 5 }] },
    }
    shopifyResponses['inventory_items'] = { status: 503, body: {} }

    const res = await handler(new Request('http://local/api/shopify/cron/inventory-delta'))
    expect(res.status).toBe(207)
  })
})
