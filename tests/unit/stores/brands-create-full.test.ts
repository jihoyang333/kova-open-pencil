import { describe, test, expect, beforeEach, mock } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'

// W9b Cluster 03 — rewrite: createBrandFull now layers `updateBrand` over
// the canonical /api/brands/create Edge Function (no more raw supabase.insert).

const mockFrom = mock(() => ({}))
const mockStorageFrom = mock(() => ({
  upload: mock(() => Promise.resolve({ error: null })),
  getPublicUrl: mock(() => ({ data: { publicUrl: 'https://storage.test/logo.png' } })),
  remove: mock(() => Promise.resolve({ error: null })),
}))

let getSessionMock: ReturnType<typeof mock>
mock.module('@/lib/supabase', () => ({
  supabase: {
    from: mockFrom,
    storage: { from: mockStorageFrom },
    auth: {
      get getSession() { return getSessionMock },
      onAuthStateChange: mock(() => ({ data: { subscription: { unsubscribe: () => {} } } })),
    },
  },
}))

const { useBrandsStore } = await import('@/stores/brands')
const { useAuthStore } = await import('@/stores/auth')

function jsonResponse(body: object, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function brandFixture(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    id: 'b1',
    user_id: 'user-1',
    name: 'Test Brand',
    colors: null,
    fonts: null,
    logo_url: null,
    voice: null,
    industry: null,
    url: null,
    archived_at: null,
    color: 'coral',
    color_assigned_at: '2026-01-01',
    slug: 'test-brand',
    description: null,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    ...overrides,
  }
}

describe('brands store - createBrandFull', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockFrom.mockClear()
    mockStorageFrom.mockClear()
    const authStore = useAuthStore()
    authStore.user = { id: 'user-1', email: 'test@test.com' } as never
    getSessionMock = mock(() =>
      Promise.resolve({ data: { session: { access_token: 'jwt-test' } }, error: null })
    )
  })

  test('creates brand with all fields (Edge Function create + supabase update for kit)', async () => {
    const created = brandFixture({ name: 'Test Brand' })
    const final = brandFixture({
      ...created,
      colors: { primary: '#000', secondary: '#fff', accent: '#f00', background: '#eee' },
      fonts: { heading: 'Inter', body: 'Georgia' },
      voice: 'Professional and concise',
    })

    globalThis.fetch = mock(() => Promise.resolve(jsonResponse({ brand: created }))) as unknown as typeof fetch

    // updateBrand path uses supabase.from('brands').update
    mockFrom.mockReturnValueOnce({
      update: () => ({
        eq: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: final, error: null }),
          }),
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

    expect(result).toEqual(final)
    expect(store.brands).toContainEqual(final)
  })

  test('creates brand with logo file upload', async () => {
    const created = brandFixture({ id: 'b2', name: 'Logo Brand' })
    const final = brandFixture({ ...created, logo_url: 'https://storage.test/logo.png' })

    globalThis.fetch = mock(() => Promise.resolve(jsonResponse({ brand: created }))) as unknown as typeof fetch

    mockFrom.mockReturnValueOnce({
      update: () => ({
        eq: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: final, error: null }),
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

  test('creates brand with logo URL (no upload — passthrough on initial create)', async () => {
    const created = brandFixture({ id: 'b3', name: 'URL Brand' })
    const final = brandFixture({ ...created, logo_url: 'https://example.com/logo.png' })

    globalThis.fetch = mock(() => Promise.resolve(jsonResponse({ brand: created }))) as unknown as typeof fetch

    mockFrom.mockReturnValueOnce({
      update: () => ({
        eq: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: final, error: null }),
          }),
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
