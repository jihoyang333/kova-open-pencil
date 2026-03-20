import { describe, test, expect, beforeEach, mock } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'

const mockFrom = mock(() => ({}))
const mockStorageFrom = mock(() => ({
  upload: mock(() => Promise.resolve({ error: null })),
  getPublicUrl: mock(() => ({ data: { publicUrl: 'https://storage.test/logo.png' } })),
  remove: mock(() => Promise.resolve({ error: null })),
}))

mock.module('@/lib/supabase', () => ({
  supabase: {
    from: mockFrom,
    storage: { from: mockStorageFrom },
  },
}))

const mockAuthStore = { user: { id: 'user-1', email: 'test@test.com' } }
mock.module('@/stores/auth', () => ({
  useAuthStore: () => mockAuthStore,
}))

const { useBrandsStore } = await import('@/stores/brands')

describe('brands store - createBrandFull', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockFrom.mockClear()
    mockStorageFrom.mockClear()
  })

  test('creates brand with all fields', async () => {
    const newBrand = {
      id: 'b1',
      user_id: 'user-1',
      name: 'Test Brand',
      colors: { primary: '#000', secondary: '#fff', accent: '#f00', background: '#eee' },
      fonts: { heading: 'Inter', body: 'Georgia' },
      logo_url: null,
      voice: 'Professional and concise',
      industry: null,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    }

    mockFrom.mockReturnValueOnce({
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: newBrand, error: null }),
        }),
      }),
    })

    const store = useBrandsStore()
    const result = await store.createBrandFull({
      name: 'Test Brand',
      colors: { primary: '#000', secondary: '#fff', accent: '#f00', background: '#eee' },
      fonts: { heading: 'Inter', body: 'Georgia' },
      voice: 'Professional and concise',
    })

    expect(result).toEqual(newBrand)
    expect(store.brands).toContainEqual(newBrand)
  })

  test('creates brand with logo file upload', async () => {
    const newBrand = {
      id: 'b2',
      user_id: 'user-1',
      name: 'Logo Brand',
      colors: null,
      fonts: null,
      logo_url: 'https://storage.test/logo.png',
      voice: null,
      industry: null,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    }

    mockFrom.mockReturnValueOnce({
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: { ...newBrand, logo_url: null }, error: null }),
        }),
      }),
    })

    mockFrom.mockReturnValueOnce({
      update: () => ({
        eq: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: newBrand, error: null }),
          }),
        }),
      }),
    })

    const store = useBrandsStore()
    const fakeFile = new File(['logo'], 'logo.png', { type: 'image/png' })

    const result = await store.createBrandFull({
      name: 'Logo Brand',
      logoFile: fakeFile,
    })

    expect(mockStorageFrom).toHaveBeenCalledWith('brand-logos')
    expect(result.logo_url).toBe('https://storage.test/logo.png')
  })

  test('creates brand with logo URL (no upload)', async () => {
    const newBrand = {
      id: 'b3',
      user_id: 'user-1',
      name: 'URL Brand',
      colors: null,
      fonts: null,
      logo_url: 'https://example.com/logo.png',
      voice: null,
      industry: null,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    }

    mockFrom.mockReturnValueOnce({
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: newBrand, error: null }),
        }),
      }),
    })

    const store = useBrandsStore()
    const result = await store.createBrandFull({
      name: 'URL Brand',
      logoUrl: 'https://example.com/logo.png',
    })

    expect(result.logo_url).toBe('https://example.com/logo.png')
  })
})
