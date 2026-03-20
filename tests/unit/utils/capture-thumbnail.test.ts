import { describe, test, expect, beforeEach, mock, spyOn } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'

// Mock supabase storage
const mockUpload = mock(() => Promise.resolve({ error: null }))
const mockGetPublicUrl = mock(() => ({ data: { publicUrl: 'https://example.com/thumb.png' } }))
const mockStorageFrom = mock(() => ({
  upload: mockUpload,
  getPublicUrl: mockGetPublicUrl,
}))

const mockUpdate = mock(() => ({
  eq: () => ({
    select: () => ({
      single: () => Promise.resolve({ data: {}, error: null }),
    }),
  }),
}))

const mockFrom = mock(() => ({
  update: mockUpdate,
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

const { captureThumbnail } = await import('@/utils/capture-thumbnail')
const { useAuthStore } = await import('@/stores/auth')

describe('captureThumbnail', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockUpload.mockClear()
    mockGetPublicUrl.mockClear()
    mockStorageFrom.mockClear()
    mockFrom.mockClear()
    mockUpdate.mockClear()
    const authStore = useAuthStore()
    authStore.user = { id: 'user-1' } as any
  })

  test('does nothing if no canvas element found', async () => {
    // No canvas element in DOM
    await captureThumbnail('c1')
    expect(mockUpload).not.toHaveBeenCalled()
  })

  test('does nothing if user is not authenticated', async () => {
    const authStore = useAuthStore()
    authStore.user = null
    await captureThumbnail('c1')
    expect(mockUpload).not.toHaveBeenCalled()
  })

  test('catches errors silently when canvas returns null blob', async () => {
    const consoleSpy = spyOn(console, 'warn').mockImplementation(() => {})

    // Provide a minimal document mock with a fake canvas element
    const fakeCanvas = {
      toBlob: (_cb: (blob: Blob | null) => void) => {
        _cb(null)
      },
    }
    const originalDocument = globalThis.document
    globalThis.document = {
      querySelector: () => fakeCanvas,
    } as any

    await captureThumbnail('c1')
    expect(mockUpload).not.toHaveBeenCalled()

    globalThis.document = originalDocument
    consoleSpy.mockRestore()
  })
})
