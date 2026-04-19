import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

interface TestEnv {
  url: string
  serviceKey: string
  anonKey: string
}

function loadTestEnv(): TestEnv | null {
  const url = process.env.TEST_SUPABASE_URL
  const serviceKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.TEST_SUPABASE_ANON_KEY
  if (!url || !serviceKey || !anonKey) return null
  return { url, serviceKey, anonKey }
}

const env = loadTestEnv()

// Tables to verify cross-tenant RLS on. Each entry owns a factory that inserts
// a row scoped to the given brand_id (service role bypasses RLS), and a
// matching query the anon/user-scoped client must run to prove it gets zero
// rows back. For child tables (variant_prices, collection_products) we scope
// via the parent relation since they do not carry brand_id directly.
interface TableCase {
  table: string
  seed: (admin: SupabaseClient, ctx: SeedContext) => Promise<void>
  readQuery: (client: SupabaseClient, ctx: SeedContext) => Promise<unknown[]>
}

interface SeedContext {
  brandId: string
  productId: string
  variantId: string
  collectionId: string
}

describe('m9.catalog migration', () => {
  if (!env) {
    it.skip(
      'skipped — set TEST_SUPABASE_URL / TEST_SUPABASE_SERVICE_ROLE_KEY / TEST_SUPABASE_ANON_KEY against a Supabase branch',
      () => {
        expect(true).toBe(true)
      }
    )
    return
  }

  let admin: SupabaseClient
  const createdUserIds: string[] = []
  const createdBrandIds: string[] = []

  beforeAll(() => {
    admin = createClient(env.url, env.serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  })

  afterAll(async () => {
    await Promise.all(createdBrandIds.map((brandId) => admin.from('brands').delete().eq('id', brandId)))
    await Promise.all(createdUserIds.map((userId) => admin.auth.admin.deleteUser(userId)))
  }, 30_000)

  async function provisionBrand(name: string): Promise<{
    userId: string
    brandId: string
    email: string
    password: string
  }> {
    const email = `m9-catalog-${crypto.randomUUID()}@example.test`
    const password = crypto.randomUUID()
    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (created.error || !created.data.user) {
      throw created.error ?? new Error('auth.admin.createUser returned no user')
    }
    const userId = created.data.user.id
    createdUserIds.push(userId)

    const brandId = crypto.randomUUID()
    const inserted = await admin.from('brands').insert({ id: brandId, user_id: userId, name })
    if (inserted.error) throw inserted.error
    createdBrandIds.push(brandId)

    return { userId, brandId, email, password }
  }

  async function seedCatalog(brandId: string): Promise<SeedContext> {
    const productId = crypto.randomUUID()
    const productInsert = await admin.from('shopify_products').insert({
      id: productId,
      brand_id: brandId,
      shopify_product_id: `gid://shopify/Product/${crypto.randomUUID()}`,
      handle: 'tshirt',
      title: 'Tshirt',
    })
    if (productInsert.error) throw productInsert.error

    const variantId = crypto.randomUUID()
    const variantInsert = await admin.from('shopify_variants').insert({
      id: variantId,
      brand_id: brandId,
      product_id: productId,
      shopify_variant_id: `gid://shopify/ProductVariant/${crypto.randomUUID()}`,
      title: 'Medium',
      price: '19.99',
      currency: 'USD',
    })
    if (variantInsert.error) throw variantInsert.error

    const collectionId = crypto.randomUUID()
    const collectionInsert = await admin.from('shopify_collections').insert({
      id: collectionId,
      brand_id: brandId,
      shopify_collection_id: `gid://shopify/Collection/${crypto.randomUUID()}`,
      handle: 'summer',
      title: 'Summer',
      collection_type: 'manual',
    })
    if (collectionInsert.error) throw collectionInsert.error

    return { brandId, productId, variantId, collectionId }
  }

  const cases: TableCase[] = [
    {
      table: 'shopify_products',
      seed: async () => {
        // Seeded by seedCatalog().
      },
      readQuery: async (client, ctx) =>
        (await client.from('shopify_products').select('id').eq('brand_id', ctx.brandId)).data ?? [],
    },
    {
      table: 'shopify_variants',
      seed: async () => {
        // Seeded by seedCatalog().
      },
      readQuery: async (client, ctx) =>
        (await client.from('shopify_variants').select('id').eq('brand_id', ctx.brandId)).data ?? [],
    },
    {
      table: 'shopify_variant_prices',
      seed: async (adminClient, ctx) => {
        const inserted = await adminClient.from('shopify_variant_prices').insert({
          variant_id: ctx.variantId,
          currency: 'EUR',
          price: '17.50',
        })
        if (inserted.error) throw inserted.error
      },
      readQuery: async (client, ctx) =>
        (await client.from('shopify_variant_prices').select('variant_id').eq('variant_id', ctx.variantId)).data ?? [],
    },
    {
      table: 'shopify_media',
      seed: async (adminClient, ctx) => {
        const inserted = await adminClient.from('shopify_media').insert({
          brand_id: ctx.brandId,
          product_id: ctx.productId,
          shopify_media_id: `gid://shopify/MediaImage/${crypto.randomUUID()}`,
          url: 'https://cdn.example.com/img.jpg',
        })
        if (inserted.error) throw inserted.error
      },
      readQuery: async (client, ctx) =>
        (await client.from('shopify_media').select('id').eq('brand_id', ctx.brandId)).data ?? [],
    },
    {
      table: 'shopify_metafields',
      seed: async (adminClient, ctx) => {
        const inserted = await adminClient.from('shopify_metafields').insert({
          brand_id: ctx.brandId,
          owner_type: 'product',
          owner_id: ctx.productId,
          namespace: 'custom',
          key: 'care',
          value: { v: 'Wash cold' },
          type: 'single_line_text_field',
        })
        if (inserted.error) throw inserted.error
      },
      readQuery: async (client, ctx) =>
        (await client.from('shopify_metafields').select('id').eq('brand_id', ctx.brandId)).data ?? [],
    },
    {
      table: 'shopify_collections',
      seed: async () => {
        // Seeded by seedCatalog().
      },
      readQuery: async (client, ctx) =>
        (await client.from('shopify_collections').select('id').eq('brand_id', ctx.brandId)).data ?? [],
    },
    {
      table: 'shopify_collection_products',
      seed: async (adminClient, ctx) => {
        const inserted = await adminClient.from('shopify_collection_products').insert({
          collection_id: ctx.collectionId,
          product_id: ctx.productId,
          position: 0,
        })
        if (inserted.error) throw inserted.error
      },
      readQuery: async (client, ctx) =>
        (
          await client
            .from('shopify_collection_products')
            .select('collection_id')
            .eq('collection_id', ctx.collectionId)
        ).data ?? [],
    },
    {
      table: 'shopify_discounts',
      seed: async (adminClient, ctx) => {
        const inserted = await adminClient.from('shopify_discounts').insert({
          brand_id: ctx.brandId,
          shopify_discount_id: `gid://shopify/Discount/${crypto.randomUUID()}`,
          title: 'Summer sale',
          status: 'active',
          value_type: 'percentage',
          value: '10.00',
        })
        if (inserted.error) throw inserted.error
      },
      readQuery: async (client, ctx) =>
        (await client.from('shopify_discounts').select('id').eq('brand_id', ctx.brandId)).data ?? [],
    },
    {
      table: 'shopify_orders_agg',
      seed: async (adminClient, ctx) => {
        const inserted = await adminClient.from('shopify_orders_agg').insert({
          brand_id: ctx.brandId,
          variant_id: ctx.variantId,
          date: '2026-04-17',
          qty_sold: 3,
          revenue: '59.97',
        })
        if (inserted.error) throw inserted.error
      },
      readQuery: async (client, ctx) =>
        (await client.from('shopify_orders_agg').select('variant_id').eq('brand_id', ctx.brandId)).data ?? [],
    },
    {
      table: 'shopify_compliance_log',
      seed: async (adminClient, ctx) => {
        const inserted = await adminClient.from('shopify_compliance_log').insert({
          topic: 'customers/data_request',
          brand_id: ctx.brandId,
          shop_domain: 'audit.myshopify.com',
          customer_id: 'gid://shopify/Customer/1',
        })
        if (inserted.error) throw inserted.error
      },
      readQuery: async (client, ctx) =>
        (await client.from('shopify_compliance_log').select('id').eq('brand_id', ctx.brandId)).data ?? [],
    },
  ]

  it('shopify_variant_prices supports multi-currency keyed on (variant_id, currency)', async () => {
    const { brandId } = await provisionBrand('MultiCurrency')
    const ctx = await seedCatalog(brandId)

    const usd = await admin
      .from('shopify_variant_prices')
      .insert({ variant_id: ctx.variantId, currency: 'USD', price: '19.99' })
    expect(usd.error).toBeNull()

    const eur = await admin
      .from('shopify_variant_prices')
      .insert({ variant_id: ctx.variantId, currency: 'EUR', price: '17.50' })
    expect(eur.error).toBeNull()

    const dupe = await admin
      .from('shopify_variant_prices')
      .insert({ variant_id: ctx.variantId, currency: 'USD', price: '20.00' })
    expect(dupe.error).not.toBeNull()
    expect(dupe.error?.code).toBe('23505')
  })

  it('shopify_connections gained a sync_progress column with idle default', async () => {
    const { brandId } = await provisionBrand('SyncProgress')
    const seed = await admin.from('shopify_connections').insert({
      brand_id: brandId,
      shop_domain: 'sp.myshopify.com',
      shop_id: 99,
      access_token_secret_id: crypto.randomUUID(),
      scope: 'read_products',
      currency: 'USD',
      timezone: 'UTC',
      primary_locale: 'en',
    })
    expect(seed.error).toBeNull()

    const row = await admin
      .from('shopify_connections')
      .select('sync_progress')
      .eq('brand_id', brandId)
      .single()
    expect(row.error).toBeNull()
    expect(row.data?.sync_progress).toEqual({ phase: 'idle', count_done: 0, count_total: 0 })
  })

  for (const tc of cases) {
    it(`RLS: user B cannot read rows from ${tc.table} owned by user A's brand`, async () => {
      const ownerA = await provisionBrand(`owner-a-${tc.table}`)
      const ownerB = await provisionBrand(`owner-b-${tc.table}`)
      const ctx = await seedCatalog(ownerA.brandId)
      await tc.seed(admin, ctx)

      // Sanity: service-role bypasses RLS and sees the row.
      const adminRows = await tc.readQuery(admin, ctx)
      expect(adminRows.length).toBeGreaterThanOrEqual(1)

      // User B signs in and attempts to read owner A's rows — expect 0.
      const userB = createClient(env.url, env.anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
      const signIn = await userB.auth.signInWithPassword({
        email: ownerB.email,
        password: ownerB.password,
      })
      expect(signIn.error).toBeNull()

      const rows = await tc.readQuery(userB, ctx)
      expect(rows.length).toBe(0)
    })
  }
})
