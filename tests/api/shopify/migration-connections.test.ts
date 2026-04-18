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

describe('m9.connections migration', () => {
  if (!env) {
    it.skip(
      'skipped — set TEST_SUPABASE_URL / TEST_SUPABASE_SERVICE_ROLE_KEY / TEST_SUPABASE_ANON_KEY against a Supabase branch (see mcp__supabase__create_branch)',
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
    for (const brandId of createdBrandIds) {
      await admin.from('shopify_connections').delete().eq('brand_id', brandId)
      await admin.from('brands').delete().eq('id', brandId)
    }
    for (const userId of createdUserIds) {
      await admin.auth.admin.deleteUser(userId)
    }
  })

  async function provisionBrand(name: string): Promise<{ userId: string; brandId: string }> {
    const email = `m9-test-${crypto.randomUUID()}@example.test`
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

    return { userId, brandId }
  }

  function baseConnection(brandId: string, shopDomain: string, shopId: number) {
    return {
      brand_id: brandId,
      shop_domain: shopDomain,
      shop_id: shopId,
      access_token_secret_id: crypto.randomUUID(),
      scope: 'read_products',
      currency: 'USD',
      timezone: 'UTC',
      primary_locale: 'en',
    }
  }

  it('shopify_connections enforces UNIQUE(brand_id)', async () => {
    const { brandId } = await provisionBrand('UniqueTest')

    const first = await admin.from('shopify_connections').insert(baseConnection(brandId, 'a.myshopify.com', 1))
    expect(first.error).toBeNull()

    const dupe = await admin.from('shopify_connections').insert(baseConnection(brandId, 'b.myshopify.com', 2))
    expect(dupe.error).not.toBeNull()
    expect(dupe.error?.code).toBe('23505')
  })

  it('store_shopify_token + read_shopify_token round-trip via Vault', async () => {
    const { brandId } = await provisionBrand('VaultTest')

    const seed = await admin
      .from('shopify_connections')
      .insert(baseConnection(brandId, 'vault.myshopify.com', 42))
    expect(seed.error).toBeNull()

    const stored = await admin.rpc('store_shopify_token', {
      p_brand_id: brandId,
      p_token: 'shpat_example',
      p_name: `shopify_token_brand_${brandId}`,
    })
    expect(stored.error).toBeNull()

    const read = await admin.rpc('read_shopify_token', { p_brand_id: brandId })
    expect(read.error).toBeNull()
    expect(read.data).toBe('shpat_example')
  })

  it('anonymous role cannot read access_token_secret_id column', async () => {
    const anon = createClient(env.url, env.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { error } = await anon.from('shopify_connections').select('access_token_secret_id').limit(1)
    expect(error).not.toBeNull()
  })

  it('shopify_oauth_state rows expire within 10 minutes of creation', async () => {
    const { userId, brandId } = await provisionBrand('StateExpiryTest')
    const state = Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) =>
      b.toString(16).padStart(2, '0')
    ).join('')

    const inserted = await admin.from('shopify_oauth_state').insert({
      state,
      user_id: userId,
      brand_id: brandId,
      shop: 'expiry.myshopify.com',
    })
    expect(inserted.error).toBeNull()

    const row = await admin
      .from('shopify_oauth_state')
      .select('created_at, expires_at')
      .eq('state', state)
      .single()
    expect(row.error).toBeNull()

    const createdAt = new Date(row.data?.created_at ?? 0).getTime()
    const expiresAt = new Date(row.data?.expires_at ?? 0).getTime()
    const windowMs = expiresAt - createdAt
    expect(windowMs).toBeGreaterThanOrEqual(9 * 60 * 1000)
    expect(windowMs).toBeLessThanOrEqual(11 * 60 * 1000)

    await admin.from('shopify_oauth_state').delete().eq('state', state)
  })

  it('shopify_webhook_log deduplicates on webhook_id primary key', async () => {
    const webhookId = `wh-${crypto.randomUUID()}`
    const first = await admin.from('shopify_webhook_log').insert({
      webhook_id: webhookId,
      topic: 'products/update',
    })
    expect(first.error).toBeNull()

    const dupe = await admin.from('shopify_webhook_log').insert({
      webhook_id: webhookId,
      topic: 'products/update',
    })
    expect(dupe.error).not.toBeNull()
    expect(dupe.error?.code).toBe('23505')

    await admin.from('shopify_webhook_log').delete().eq('webhook_id', webhookId)
  })
})
