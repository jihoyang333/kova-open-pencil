import { describe, test, expect, beforeEach, mock } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'

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

const BASE_BRAND = {
  id: 'b1',
  user_id: 'user-1',
  name: 'Test Brand',
  colors: { primary: '#000000', secondary: '#ffffff', accent: '#ff0000', background: '#eeeeee' },
  fonts: { heading: 'Georgia', body: 'Arial' },
  logo_url: null,
  voice: null,
  industry: null,
  url: null,
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
}

function mockUpdateBrand(updated: typeof BASE_BRAND) {
  mockFrom.mockReturnValueOnce({
    update: () => ({
      eq: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: updated, error: null }),
        }),
      }),
    }),
  })
}

function seedStore(store: ReturnType<typeof useBrandsStore>) {
  mockFrom.mockReturnValueOnce({
    select: () => Promise.resolve({ data: [BASE_BRAND], error: null }),
  })
  return store.fetchBrands()
}

describe('brands store - applyKitSelection', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockFrom.mockClear()
    const authStore = useAuthStore()
    authStore.user = { id: 'user-1', email: 'test@test.com' } as never
  })

  test('applies primaryColor to brand colors', async () => {
    const store = useBrandsStore()
    await seedStore(store)

    const expected = {
      ...BASE_BRAND,
      colors: { ...BASE_BRAND.colors, primary: '#FF0000' },
    }
    mockUpdateBrand(expected)

    await store.applyKitSelection('b1', { primaryColor: '#FF0000' })

    expect(store.brands[0].colors?.primary).toBe('#FF0000')
    expect(store.brands[0].colors?.secondary).toBe('#ffffff')
  })

  test('applies headingFont while preserving bodyFont', async () => {
    const store = useBrandsStore()
    await seedStore(store)

    const expected = {
      ...BASE_BRAND,
      fonts: { ...BASE_BRAND.fonts, heading: 'Inter' },
    }
    mockUpdateBrand(expected)

    await store.applyKitSelection('b1', { headingFont: 'Inter' })

    expect(store.brands[0].fonts?.heading).toBe('Inter')
    expect(store.brands[0].fonts?.body).toBe('Arial')
  })

  test('applies logoUrl', async () => {
    const store = useBrandsStore()
    await seedStore(store)

    const expected = { ...BASE_BRAND, logo_url: 'https://cdn.example.com/logo.png' }
    mockUpdateBrand(expected)

    await store.applyKitSelection('b1', { logoUrl: 'https://cdn.example.com/logo.png' })

    expect(store.brands[0].logo_url).toBe('https://cdn.example.com/logo.png')
  })

  test('clears proposedBrandKit after applying', async () => {
    const store = useBrandsStore()
    await seedStore(store)
    store.proposeFromShopify('b1', { primaryColor: '#FF0000' })
    expect(store.proposedBrandKit).not.toBeNull()

    mockUpdateBrand({ ...BASE_BRAND, colors: { ...BASE_BRAND.colors, primary: '#FF0000' } })
    await store.applyKitSelection('b1', { primaryColor: '#FF0000' })

    expect(store.proposedBrandKit).toBeNull()
  })

  test('does not call updateBrand when kit is empty', async () => {
    const store = useBrandsStore()
    await seedStore(store)

    await store.applyKitSelection('b1', {})

    expect(mockFrom).toHaveBeenCalledTimes(1)
  })

  test('merges secondaryColor while preserving other colors', async () => {
    const store = useBrandsStore()
    await seedStore(store)

    const expected = {
      ...BASE_BRAND,
      colors: { ...BASE_BRAND.colors, secondary: '#AAAAAA' },
    }
    mockUpdateBrand(expected)

    await store.applyKitSelection('b1', { secondaryColor: '#AAAAAA' })

    expect(store.brands[0].colors?.secondary).toBe('#AAAAAA')
    expect(store.brands[0].colors?.primary).toBe('#000000')
    expect(store.brands[0].colors?.accent).toBe('#ff0000')
  })
})
