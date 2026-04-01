import { describe, test, expect, beforeEach, mock } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'

// Canvas/Image mocks are provided by tests/setup-dom.ts preload.
// processImage() runs with those mocks — no mock.module needed here.

// --- Supabase mocks ---
const mockFrom = mock(() => ({}))
const mockStorageFrom = mock(() => ({
  upload: mock(() => Promise.resolve({ error: null })),
  remove: mock(() => Promise.resolve({ error: null })),
  getPublicUrl: mock(() => ({ data: { publicUrl: 'https://cdn.example.com/img.png' } })),
}))

mock.module('@/lib/supabase', () => ({
  supabase: {
    from: mockFrom,
    storage: { from: mockStorageFrom },
    auth: {
      getSession: mock(() =>
        Promise.resolve({ data: { session: { user: { id: 'user-1' } } }, error: null })
      ),
      onAuthStateChange: mock(() => ({ data: { subscription: { unsubscribe: () => {} } } })),
    },
  },
}))

// Must import AFTER mock.module
const { useMediaStore } = await import('@/stores/media')
const { useAuthStore } = await import('@/stores/auth')

describe('media store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockFrom.mockClear()
    mockStorageFrom.mockClear()
    const authStore = useAuthStore()
    authStore.user = { id: 'user-1', email: 'test@test.com' } as any
  })

  const sampleMedia = {
    id: 'm1',
    user_id: 'user-1',
    brand_id: 'b1',
    file_name: 'hero.png',
    file_type: 'image/png',
    file_size: 102400,
    width: 800,
    height: 600,
    storage_path: 'user-1/b1/1711100000000-hero.png',
    created_at: '2026-03-22T00:00:00Z',
  }

  test('fetchImages loads media for a brand', async () => {
    mockFrom.mockReturnValueOnce({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: [sampleMedia], error: null }),
        }),
      }),
    })

    const store = useMediaStore()
    await store.fetchImages('b1')
    expect(store.images).toContainEqual(sampleMedia)
  })

  test('fetchImages replaces existing images', async () => {
    mockFrom.mockReturnValueOnce({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: [sampleMedia], error: null }),
        }),
      }),
    })

    const store = useMediaStore()
    await store.fetchImages('b1')
    expect(store.images).toHaveLength(1)

    const second = { ...sampleMedia, id: 'm2', file_name: 'second.png' }
    mockFrom.mockReturnValueOnce({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: [second], error: null }),
        }),
      }),
    })
    await store.fetchImages('b1')
    expect(store.images).toHaveLength(1)
    expect(store.images[0].id).toBe('m2')
  })

  test('uploadImage validates file type', async () => {
    const store = useMediaStore()
    const badFile = new File(['x'], 'test.txt', { type: 'text/plain' })
    await expect(store.uploadImage('b1', badFile)).rejects.toThrow('File type not accepted')
  })

  test('uploadImage validates file size', async () => {
    const store = useMediaStore()
    const bigFile = new File([new Uint8Array(6 * 1024 * 1024)], 'big.png', { type: 'image/png' })
    await expect(store.uploadImage('b1', bigFile)).rejects.toThrow('File too large')
  })

  test('uploadImage uploads to storage and inserts record', async () => {
    mockStorageFrom.mockReturnValueOnce({
      upload: mock(() => Promise.resolve({ error: null })),
    })
    mockFrom.mockReturnValueOnce({
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: sampleMedia, error: null }),
        }),
      }),
    })

    const store = useMediaStore()
    const file = new File(['pixels'], 'hero.png', { type: 'image/png' })
    const result = await store.uploadImage('b1', file)
    expect(result).toEqual(sampleMedia)
    expect(store.images).toContainEqual(sampleMedia)
  })

  test('deleteImage removes from storage and DB', async () => {
    const store = useMediaStore()
    // Seed the store
    store.images = [sampleMedia]

    mockStorageFrom.mockReturnValueOnce({
      remove: mock(() => Promise.resolve({ error: null })),
    })
    mockFrom.mockReturnValueOnce({
      delete: () => ({
        eq: () => Promise.resolve({ error: null }),
      }),
    })

    await store.deleteImage(sampleMedia)
    expect(store.images).toHaveLength(0)
  })

  test('getPublicUrl returns public URL for storage path', () => {
    mockStorageFrom.mockReturnValueOnce({
      getPublicUrl: mock(() => ({
        data: { publicUrl: 'https://cdn.example.com/img.png' },
      })),
    })

    const store = useMediaStore()
    const url = store.getPublicUrl('user-1/b1/hero.png')
    expect(url).toBe('https://cdn.example.com/img.png')
  })

  test('uploadImageFromUrl rejects invalid URL protocol', async () => {
    const store = useMediaStore()
    await expect(store.uploadImageFromUrl('b1', 'javascript:alert(1)')).rejects.toThrow(
      'Invalid URL'
    )
    await expect(store.uploadImageFromUrl('b1', 'ftp://example.com/img.png')).rejects.toThrow(
      'Invalid URL'
    )
  })

  test('isLoading is true during fetchImages', async () => {
    let resolveQuery: (v: any) => void = () => {}
    const pending = new Promise((r) => { resolveQuery = r })

    mockFrom.mockReturnValueOnce({
      select: () => ({
        eq: () => ({
          order: () => pending,
        }),
      }),
    })

    const store = useMediaStore()
    const fetchPromise = store.fetchImages('b1')
    expect(store.isLoading).toBe(true)
    resolveQuery({ data: [], error: null })
    await fetchPromise
    expect(store.isLoading).toBe(false)
  })
})
