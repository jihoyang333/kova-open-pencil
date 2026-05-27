import { describe, test, expect, beforeEach, mock } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'

// Mock supabase (including auth methods needed by real auth store)
const mockFrom = mock(() => ({}))
const mockStorageFrom = mock(() => ({
  remove: mock(() => Promise.resolve({ error: null })),
}))

mock.module('@/lib/supabase', () => ({
  supabase: {
    from: mockFrom,
    storage: { from: mockStorageFrom },
    auth: {
      getSession: mock(() => Promise.resolve({ data: { session: null }, error: null })),
      onAuthStateChange: mock(() => ({ data: { subscription: { unsubscribe: () => {} } } })),
    },
  },
}))

const { useBrandsStore } = await import('@/stores/brands')
const { useAuthStore } = await import('@/stores/auth')

describe('brands store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockFrom.mockClear()
    mockStorageFrom.mockClear()
    const authStore = useAuthStore()
    authStore.user = { id: 'user-1', email: 'test@test.com' } as any
  })

  test('starts with empty brands and isLoading false', () => {
    const store = useBrandsStore()
    expect(store.brands).toEqual([])
    expect(store.isLoading).toBe(false)
  })

  test('fetchBrands loads all brands', async () => {
    const testBrands = [
      { id: 'b1', user_id: 'user-1', name: 'Zeta', colors: null, fonts: null, logo_url: null, voice: null, industry: null, created_at: '2026-01-01', updated_at: '2026-01-01' },
      { id: 'b2', user_id: 'user-1', name: 'Alpha', colors: null, fonts: null, logo_url: null, voice: null, industry: null, created_at: '2026-01-01', updated_at: '2026-01-01' },
    ]

    mockFrom.mockReturnValueOnce({
      select: () => Promise.resolve({ data: testBrands, error: null }),
    })

    const store = useBrandsStore()
    await store.fetchBrands()

    expect(store.brands).toEqual(testBrands)
    expect(mockFrom).toHaveBeenCalledWith('brands')
  })

  test('sortedBrands returns brands alphabetically', async () => {
    const testBrands = [
      { id: 'b1', user_id: 'user-1', name: 'Zeta', colors: null, fonts: null, logo_url: null, voice: null, industry: null, created_at: '2026-01-01', updated_at: '2026-01-01' },
      { id: 'b2', user_id: 'user-1', name: 'Alpha', colors: null, fonts: null, logo_url: null, voice: null, industry: null, created_at: '2026-01-01', updated_at: '2026-01-01' },
    ]

    mockFrom.mockReturnValueOnce({
      select: () => Promise.resolve({ data: testBrands, error: null }),
    })

    const store = useBrandsStore()
    await store.fetchBrands()

    expect(store.sortedBrands[0].name).toBe('Alpha')
    expect(store.sortedBrands[1].name).toBe('Zeta')
  })

  test('createBrand adds brand to store (via /api/brands/create)', async () => {
    // W9b Cluster 03 — refactored createBrand calls Edge Function via fetch.
    const newBrand = {
      id: 'b3', user_id: 'user-1', name: 'New Brand', colors: null, fonts: null,
      logo_url: null, voice: null, industry: null, url: null, archived_at: null,
      color: 'coral', color_assigned_at: '2026-01-01', slug: 'new-brand',
      description: null, created_at: '2026-01-01', updated_at: '2026-01-01',
    }
    const fetchMock = mock(() => Promise.resolve(new Response(JSON.stringify({ brand: newBrand }), { status: 200 })))
    globalThis.fetch = fetchMock as unknown as typeof fetch
    // Mock session getter to return a token for the bearer header.
    const { supabase: sb } = await import('@/lib/supabase')
    ;(sb.auth as unknown as { getSession: () => Promise<{ data: { session: { access_token: string } | null } }> }).getSession =
      mock(() => Promise.resolve({ data: { session: { access_token: 'jwt-test' } } }))

    const store = useBrandsStore()
    const result = await store.createBrand('New Brand')

    expect(result).toEqual(newBrand)
    expect(store.brands).toContainEqual(newBrand)
    expect(fetchMock).toHaveBeenCalled()
  })

  test('updateBrand updates brand in store', async () => {
    const original = { id: 'b1', user_id: 'user-1', name: 'Old Name', colors: null, fonts: null, logo_url: null, voice: null, industry: null, created_at: '2026-01-01', updated_at: '2026-01-01' }
    const updated = { ...original, name: 'New Name', updated_at: '2026-01-02' }

    // Seed store
    mockFrom.mockReturnValueOnce({
      select: () => Promise.resolve({ data: [original], error: null }),
    })

    const store = useBrandsStore()
    await store.fetchBrands()

    // Update
    mockFrom.mockReturnValueOnce({
      update: () => ({
        eq: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: updated, error: null }),
          }),
        }),
      }),
    })

    await store.updateBrand('b1', { name: 'New Name' })
    expect(store.brands[0].name).toBe('New Name')
  })

  test('deleteBrand removes brand via /api/brands/delete (server handles cascade + storage sweep)', async () => {
    // W9b Cluster 03 — refactored deleteBrand routes through Edge Function.
    // Storage sweep is now server-side (api/_shared/storage-sweep.ts) — client
    // does not call supabase.storage.remove anymore.
    const brand = {
      id: 'b1', user_id: 'user-1', name: 'Brand', colors: null, fonts: null,
      logo_url: null, voice: null, industry: null, url: null, archived_at: null,
      color: 'coral', color_assigned_at: '2026-01-01', slug: 'brand',
      description: null, created_at: '2026-01-01', updated_at: '2026-01-01',
    }
    mockFrom.mockReturnValueOnce({
      select: () => Promise.resolve({ data: [brand], error: null }),
    })

    const store = useBrandsStore()
    await store.fetchBrands()

    const fetchMock = mock(() =>
      Promise.resolve(new Response(JSON.stringify({ success: true, deleted_brand_name: 'Brand' }), { status: 200 }))
    )
    globalThis.fetch = fetchMock as unknown as typeof fetch
    const { supabase: sb } = await import('@/lib/supabase')
    ;(sb.auth as unknown as { getSession: () => Promise<{ data: { session: { access_token: string } | null } }> }).getSession =
      mock(() => Promise.resolve({ data: { session: { access_token: 'jwt-test' } } }))

    await store.deleteBrand('b1', 'Brand')

    expect(store.brands).toEqual([])
    expect(fetchMock).toHaveBeenCalled()
  })

  test('selectBrand sets selectedBrandId', () => {
    const store = useBrandsStore()
    store.selectBrand('b1')
    expect(store.selectedBrandId).toBe('b1')
  })

  test('selectedBrand returns brand matching selectedBrandId', async () => {
    const testBrands = [
      { id: 'b1', user_id: 'user-1', name: 'Alpha', colors: null, fonts: null, logo_url: null, voice: null, industry: null, created_at: '2026-01-01', updated_at: '2026-01-01' },
    ]

    mockFrom.mockReturnValueOnce({
      select: () => Promise.resolve({ data: testBrands, error: null }),
    })

    const store = useBrandsStore()
    await store.fetchBrands()
    store.selectBrand('b1')

    expect(store.selectedBrand?.name).toBe('Alpha')
  })

  test('fetchBrands sets isLoading false on error', async () => {
    mockFrom.mockReturnValueOnce({
      select: () => Promise.resolve({ data: null, error: { message: 'Network error' } }),
    })

    const store = useBrandsStore()
    await expect(store.fetchBrands()).rejects.toThrow()
    expect(store.isLoading).toBe(false)
  })

  test('createBrand throws when no session', async () => {
    // W9b Cluster 03 — refactored createBrand requires a valid session token
    // to call /api/brands/create. With no session, the helper throws early.
    const { supabase: sb } = await import('@/lib/supabase')
    ;(sb.auth as unknown as { getSession: () => Promise<{ data: { session: null } }> }).getSession =
      mock(() => Promise.resolve({ data: { session: null } }))

    const store = useBrandsStore()
    await expect(store.createBrand('Test')).rejects.toThrow('Not authenticated')
  })

  test('proposedBrandKit starts null', () => {
    const store = useBrandsStore()
    expect(store.proposedBrandKit).toBeNull()
  })

  test('proposeFromShopify stores kit against brand id', () => {
    const store = useBrandsStore()
    const kit = {
      primaryColor: '#FF0000',
      secondaryColor: '#00FF00',
      headingFont: 'Inter',
      bodyFont: 'Inter',
      logoUrl: 'https://cdn.shopify.com/logo.png',
    }

    store.proposeFromShopify('brand-42', kit)

    expect(store.proposedBrandKit).toEqual({ brandId: 'brand-42', kit })
  })

  test('proposeFromShopify does not mutate the input kit', () => {
    const store = useBrandsStore()
    const kit = { primaryColor: '#111111' }
    const snapshot = { ...kit }

    store.proposeFromShopify('brand-1', kit)
    store.proposedBrandKit!.kit.primaryColor = '#999999'

    expect(kit).toEqual(snapshot)
  })

  test('proposeFromShopify replaces any prior proposal', () => {
    const store = useBrandsStore()
    store.proposeFromShopify('brand-a', { primaryColor: '#000000' })
    store.proposeFromShopify('brand-b', { primaryColor: '#FFFFFF' })

    expect(store.proposedBrandKit).toEqual({
      brandId: 'brand-b',
      kit: { primaryColor: '#FFFFFF' },
    })
  })
})
