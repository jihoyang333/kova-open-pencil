import { describe, it, expect, mock, beforeAll, afterAll, beforeEach } from 'bun:test'

const BRAND_ID = 'integ-brand-purge'
const OTHER_BRAND = 'integ-brand-other'
const QUEUE_ROW_ID = 'integ-queue-row'
const VARIANT_1 = 'integ-var-1'
const VARIANT_2 = 'integ-var-2'
const COLLECTION_1 = 'integ-col-1'
const PAST_DATE = '2026-04-01T00:00:00.000Z'

type Row = Record<string, unknown>

function makeInMemoryClient(db: Record<string, Row[]>) {
  return {
    from: (table: string) => {
      const getRows = () => db[table] ?? []
      const setRows = (rows: Row[]) => {
        db[table] = rows
      }

      return {
        select: (_cols: string) => ({
          lt: (ltCol: string, ltVal: unknown) => ({
            is: (isCol: string, isVal: unknown) => {
              const filtered = getRows().filter(
                (r) =>
                  (r[ltCol] as string) < (ltVal as string) &&
                  (isVal === null ? r[isCol] == null : r[isCol] === isVal),
              )
              return { data: filtered, error: null }
            },
          }),
          eq: (col: string, val: unknown) => ({
            data: getRows().filter((r) => r[col] === val),
            error: null,
          }),
        }),
        delete: () => ({
          eq: (col: string, val: unknown) => {
            setRows(getRows().filter((r) => r[col] !== val))
            return { error: null }
          },
          in: (col: string, vals: unknown[]) => {
            setRows(getRows().filter((r) => !vals.includes(r[col])))
            return { error: null }
          },
        }),
        update: (fields: Record<string, unknown>) => ({
          eq: (col: string, val: unknown) => {
            for (const row of getRows()) {
              if (row[col] === val) Object.assign(row, fields)
            }
            return { error: null }
          },
        }),
      }
    },
  }
}

function seedDb(): Record<string, Row[]> {
  return {
    shopify_purge_queue: [
      { id: QUEUE_ROW_ID, brand_id: BRAND_ID, scheduled_at: PAST_DATE, completed_at: null },
    ],
    shopify_connections: [
      { id: 'conn-1', brand_id: BRAND_ID, shop_domain: 'integ.myshopify.com', status: 'active' },
      { id: 'conn-other', brand_id: OTHER_BRAND, shop_domain: 'other.myshopify.com', status: 'active' },
    ],
    shopify_products: [
      { id: 'prod-1', brand_id: BRAND_ID, title: 'Product 1' },
      { id: 'prod-2', brand_id: BRAND_ID, title: 'Product 2' },
      { id: 'prod-other', brand_id: OTHER_BRAND, title: 'Other Product' },
    ],
    shopify_variants: [
      { id: VARIANT_1, brand_id: BRAND_ID, shopify_variant_id: 'gid://shopify/ProductVariant/111' },
      { id: VARIANT_2, brand_id: BRAND_ID, shopify_variant_id: 'gid://shopify/ProductVariant/222' },
      { id: 'var-other', brand_id: OTHER_BRAND, shopify_variant_id: 'gid://shopify/ProductVariant/999' },
    ],
    shopify_variant_prices: [
      { id: 'vp-1', variant_id: VARIANT_1, price: '9.99' },
      { id: 'vp-2', variant_id: VARIANT_2, price: '19.99' },
      { id: 'vp-other', variant_id: 'var-other', price: '5.00' },
    ],
    shopify_collections: [
      { id: COLLECTION_1, brand_id: BRAND_ID, title: 'Featured' },
      { id: 'col-other', brand_id: OTHER_BRAND, title: 'Other Collection' },
    ],
    shopify_collection_products: [
      { id: 'cp-1', collection_id: COLLECTION_1, product_id: 'prod-1' },
      { id: 'cp-2', collection_id: COLLECTION_1, product_id: 'prod-2' },
      { id: 'cp-other', collection_id: 'col-other', product_id: 'prod-other' },
    ],
    shopify_media: [
      { id: 'media-1', brand_id: BRAND_ID },
      { id: 'media-other', brand_id: OTHER_BRAND },
    ],
    shopify_metafields: [
      { id: 'meta-1', brand_id: BRAND_ID },
      { id: 'meta-other', brand_id: OTHER_BRAND },
    ],
    shopify_discounts: [
      { id: 'disc-1', brand_id: BRAND_ID },
      { id: 'disc-other', brand_id: OTHER_BRAND },
    ],
    shopify_orders_agg: [
      { id: 'ord-1', brand_id: BRAND_ID, qty_sold: 5 },
      { id: 'ord-other', brand_id: OTHER_BRAND, qty_sold: 2 },
    ],
    shopify_compliance_log: [
      { id: 'comp-1', brand_id: BRAND_ID },
      { id: 'comp-other', brand_id: OTHER_BRAND },
    ],
  }
}

let db: Record<string, Row[]>
let handler: (req: Request) => Promise<Response>

describe('purge-worker integration — seeded in-memory store', () => {
  beforeAll(async () => {
    mock.module('@supabase/supabase-js', () => ({
      createClient: () => makeInMemoryClient(db),
    }))
    const mod = await import('../../../api/shopify/cron/purge-worker')
    handler = mod.default
  })

  afterAll(() => mock.restore())

  beforeEach(() => {
    process.env.SUPABASE_URL = 'http://localhost:54321'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role'
    delete process.env.CRON_SECRET
    db = seedDb()
  })

  it('removes all shopify_* rows for the target brand after purge', async () => {
    const res = await handler(new Request('http://local/api/shopify/cron/purge-worker'))
    expect(res.status).toBe(200)

    const directTables = [
      'shopify_connections',
      'shopify_products',
      'shopify_variants',
      'shopify_collections',
      'shopify_media',
      'shopify_metafields',
      'shopify_discounts',
      'shopify_orders_agg',
      'shopify_compliance_log',
    ]
    for (const table of directTables) {
      const remaining = (db[table] ?? []).filter((r) => r.brand_id === BRAND_ID)
      expect(remaining.length).toBe(0)
    }

    expect(db.shopify_variant_prices.filter((r) => r.variant_id === VARIANT_1 || r.variant_id === VARIANT_2).length).toBe(0)
    expect(db.shopify_collection_products.filter((r) => r.collection_id === COLLECTION_1).length).toBe(0)
  })

  it('marks completed_at on the queue row with a valid ISO timestamp', async () => {
    await handler(new Request('http://local/api/shopify/cron/purge-worker'))
    const queueRow = db.shopify_purge_queue.find((r) => r.id === QUEUE_ROW_ID)
    expect(queueRow).toBeDefined()
    expect(typeof queueRow!.completed_at).toBe('string')
    expect(isNaN(new Date(queueRow!.completed_at as string).getTime())).toBe(false)
  })

  it('does not remove rows belonging to other brands', async () => {
    await handler(new Request('http://local/api/shopify/cron/purge-worker'))

    const directTables = [
      'shopify_connections',
      'shopify_products',
      'shopify_variants',
      'shopify_collections',
      'shopify_media',
      'shopify_metafields',
      'shopify_discounts',
      'shopify_orders_agg',
      'shopify_compliance_log',
    ]
    for (const table of directTables) {
      const remaining = (db[table] ?? []).filter((r) => r.brand_id === OTHER_BRAND)
      expect(remaining.length).toBeGreaterThan(0)
    }

    expect(db.shopify_variant_prices.some((r) => r.variant_id === 'var-other')).toBe(true)
    expect(db.shopify_collection_products.some((r) => r.collection_id === 'col-other')).toBe(true)
  })

  it('returns ok:true after a successful full purge', async () => {
    const res = await handler(new Request('http://local/api/shopify/cron/purge-worker'))
    const body = (await res.json()) as { ok: boolean }
    expect(body.ok).toBe(true)
  })
})
