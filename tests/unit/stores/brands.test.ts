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

  test('createBrand adds brand to store', async () => {
    const newBrand = { id: 'b3', user_id: 'user-1', name: 'New Brand', colors: null, fonts: null, logo_url: null, voice: null, industry: null, created_at: '2026-01-01', updated_at: '2026-01-01' }

    mockFrom.mockReturnValueOnce({
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: newBrand, error: null }),
        }),
      }),
    })

    const store = useBrandsStore()
    const result = await store.createBrand('New Brand')

    expect(result).toEqual(newBrand)
    expect(store.brands).toContainEqual(newBrand)
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

  test('deleteBrand removes brand and cleans up thumbnails', async () => {
    const brand = { id: 'b1', user_id: 'user-1', name: 'Brand', colors: null, fonts: null, logo_url: null, voice: null, industry: null, created_at: '2026-01-01', updated_at: '2026-01-01' }

    // Seed store
    mockFrom.mockReturnValueOnce({
      select: () => Promise.resolve({ data: [brand], error: null }),
    })

    const store = useBrandsStore()
    await store.fetchBrands()

    // Mock canvas lookup for thumbnail cleanup
    mockFrom.mockReturnValueOnce({
      select: () => ({
        eq: () => Promise.resolve({ data: [{ id: 'c1' }, { id: 'c2' }], error: null }),
      }),
    })

    // Mock brand delete
    mockFrom.mockReturnValueOnce({
      delete: () => ({
        eq: () => Promise.resolve({ error: null }),
      }),
    })

    await store.deleteBrand('b1')

    expect(store.brands).toEqual([])
    expect(mockStorageFrom).toHaveBeenCalledWith('thumbnails')
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

  test('createBrand throws when not authenticated', async () => {
    const authStore = useAuthStore()
    authStore.user = null

    const store = useBrandsStore()
    await expect(store.createBrand('Test')).rejects.toThrow('Not authenticated')
  })
})
