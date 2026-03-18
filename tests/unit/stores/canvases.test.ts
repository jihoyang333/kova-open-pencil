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
  },
}))

const mockAuthStore = { user: { id: 'user-1' } }
mock.module('@/stores/auth', () => ({
  useAuthStore: () => mockAuthStore,
}))

const { useCanvasesStore } = await import('@/stores/canvases')

const makeCanvas = (overrides: Record<string, unknown> = {}) => ({
  id: 'c1',
  brand_id: 'b1',
  name: 'Untitled',
  thumbnail_url: null,
  trashed_at: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
})

describe('canvases store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockFrom.mockClear()
    mockStorageFrom.mockClear()
  })

  test('starts with empty canvases', () => {
    const store = useCanvasesStore()
    expect(store.canvases).toEqual([])
    expect(store.trashedCanvases).toEqual([])
    expect(store.isLoading).toBe(false)
  })

  test('fetchCanvases loads active canvases for brand', async () => {
    const canvases = [makeCanvas({ id: 'c1' }), makeCanvas({ id: 'c2' })]

    mockFrom.mockReturnValueOnce({
      select: () => ({
        eq: () => ({
          is: () => Promise.resolve({ data: canvases, error: null }),
        }),
      }),
    })

    const store = useCanvasesStore()
    await store.fetchCanvases('b1')

    expect(store.canvases).toEqual(canvases)
  })

  test('createCanvas creates with defaults and adds to store', async () => {
    const newCanvas = makeCanvas({ id: 'c-new', name: 'Untitled' })

    mockFrom.mockReturnValueOnce({
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: newCanvas, error: null }),
        }),
      }),
    })

    const store = useCanvasesStore()
    const result = await store.createCanvas('b1')

    expect(result).toEqual(newCanvas)
    expect(store.canvases).toContainEqual(newCanvas)
  })

  test('createCanvas uses provided name', async () => {
    const newCanvas = makeCanvas({ id: 'c-new', name: 'My Email' })

    mockFrom.mockReturnValueOnce({
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: newCanvas, error: null }),
        }),
      }),
    })

    const store = useCanvasesStore()
    await store.createCanvas('b1', 'My Email')

    expect(mockFrom).toHaveBeenCalledWith('canvases')
  })

  test('renameCanvas updates name in store', async () => {
    // Seed
    mockFrom.mockReturnValueOnce({
      select: () => ({
        eq: () => ({
          is: () => Promise.resolve({ data: [makeCanvas()], error: null }),
        }),
      }),
    })

    const store = useCanvasesStore()
    await store.fetchCanvases('b1')

    mockFrom.mockReturnValueOnce({
      update: () => ({
        eq: () => ({
          select: () => ({
            single: () => Promise.resolve({
              data: makeCanvas({ name: 'Renamed' }),
              error: null,
            }),
          }),
        }),
      }),
    })

    await store.renameCanvas('c1', 'Renamed')
    expect(store.canvases[0].name).toBe('Renamed')
  })

  test('duplicateCanvas creates copy with " (Copy)" suffix', async () => {
    const original = makeCanvas({ name: 'Original' })
    const copy = makeCanvas({ id: 'c-copy', name: 'Original (Copy)' })

    // Seed
    mockFrom.mockReturnValueOnce({
      select: () => ({
        eq: () => ({
          is: () => Promise.resolve({ data: [original], error: null }),
        }),
      }),
    })

    const store = useCanvasesStore()
    await store.fetchCanvases('b1')

    // Duplicate — first call reads original, second call inserts
    mockFrom.mockReturnValueOnce({
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: copy, error: null }),
        }),
      }),
    })

    const result = await store.duplicateCanvas('c1')
    expect(result.name).toBe('Original (Copy)')
    expect(store.canvases).toHaveLength(2)
  })

  test('moveToTrash sets trashed_at and removes from canvases', async () => {
    const canvas = makeCanvas()
    const trashed = makeCanvas({ trashed_at: '2026-03-17T00:00:00Z' })

    mockFrom.mockReturnValueOnce({
      select: () => ({
        eq: () => ({
          is: () => Promise.resolve({ data: [canvas], error: null }),
        }),
      }),
    })

    const store = useCanvasesStore()
    await store.fetchCanvases('b1')

    mockFrom.mockReturnValueOnce({
      update: () => ({
        eq: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: trashed, error: null }),
          }),
        }),
      }),
    })

    await store.moveToTrash('c1')
    expect(store.canvases).toEqual([])
    expect(store.trashedCanvases).toContainEqual(trashed)
  })

  test('restoreCanvas clears trashed_at and removes from trashedCanvases', async () => {
    const trashed = makeCanvas({ trashed_at: '2026-03-17T00:00:00Z' })

    // Seed trashed
    mockFrom.mockReturnValueOnce({
      select: () => ({
        not: () => Promise.resolve({ data: [trashed], error: null }),
      }),
    })

    const store = useCanvasesStore()
    await store.fetchTrashed()

    mockFrom.mockReturnValueOnce({
      update: () => ({
        eq: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: makeCanvas({ trashed_at: null }), error: null }),
          }),
        }),
      }),
    })

    await store.restoreCanvas('c1')
    expect(store.trashedCanvases).toEqual([])
    // Does NOT add to canvases — let fetchCanvases(brandId) pick it up
    expect(store.canvases).toEqual([])
  })

  test('permanentlyDelete removes canvas and deletes thumbnail', async () => {
    const trashed = makeCanvas({ trashed_at: '2026-03-17T00:00:00Z' })

    mockFrom.mockReturnValueOnce({
      select: () => ({
        not: () => Promise.resolve({ data: [trashed], error: null }),
      }),
    })

    const store = useCanvasesStore()
    await store.fetchTrashed()

    mockFrom.mockReturnValueOnce({
      delete: () => ({
        eq: () => Promise.resolve({ error: null }),
      }),
    })

    await store.permanentlyDelete('c1')
    expect(store.trashedCanvases).toEqual([])
    expect(mockStorageFrom).toHaveBeenCalledWith('thumbnails')
  })

  test('fetchTrashed loads trashed canvases', async () => {
    const trashed = [makeCanvas({ trashed_at: '2026-03-17T00:00:00Z' })]

    mockFrom.mockReturnValueOnce({
      select: () => ({
        not: () => Promise.resolve({ data: trashed, error: null }),
      }),
    })

    const store = useCanvasesStore()
    await store.fetchTrashed()

    expect(store.trashedCanvases).toEqual(trashed)
  })

  test('sortedCanvases sorts by updated_at descending', async () => {
    const canvases = [
      makeCanvas({ id: 'c1', updated_at: '2026-01-01T00:00:00Z' }),
      makeCanvas({ id: 'c2', updated_at: '2026-03-01T00:00:00Z' }),
    ]

    mockFrom.mockReturnValueOnce({
      select: () => ({
        eq: () => ({
          is: () => Promise.resolve({ data: canvases, error: null }),
        }),
      }),
    })

    const store = useCanvasesStore()
    await store.fetchCanvases('b1')

    expect(store.sortedCanvases[0].id).toBe('c2')
    expect(store.sortedCanvases[1].id).toBe('c1')
  })

  test('sortedTrashed sorts by trashed_at descending', async () => {
    const trashed = [
      makeCanvas({ id: 'c1', trashed_at: '2026-01-01T00:00:00Z' }),
      makeCanvas({ id: 'c2', trashed_at: '2026-03-01T00:00:00Z' }),
    ]

    mockFrom.mockReturnValueOnce({
      select: () => ({
        not: () => Promise.resolve({ data: trashed, error: null }),
      }),
    })

    const store = useCanvasesStore()
    await store.fetchTrashed()

    expect(store.sortedTrashed[0].id).toBe('c2')
    expect(store.sortedTrashed[1].id).toBe('c1')
  })

  test('fetchCanvases sets isLoading false on error', async () => {
    mockFrom.mockReturnValueOnce({
      select: () => ({
        eq: () => ({
          is: () => Promise.resolve({ data: null, error: { message: 'Network error' } }),
        }),
      }),
    })

    const store = useCanvasesStore()
    await expect(store.fetchCanvases('b1')).rejects.toThrow()
    expect(store.isLoading).toBe(false)
  })
})
