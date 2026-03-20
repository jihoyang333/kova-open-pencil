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
    auth: {
      getSession: mock(() => Promise.resolve({ data: { session: null }, error: null })),
      onAuthStateChange: mock(() => ({ data: { subscription: { unsubscribe: () => {} } } })),
    },
  },
}))

const mockPush = mock(() => {})
mock.module('@/router', () => ({
  getRouter: () => ({ push: mockPush }),
}))

const mockBrandsStore = {
  createBrandFull: mock(() => Promise.resolve({ id: 'brand-1', name: 'Test Brand' })),
}
mock.module('@/stores/brands', () => ({
  useBrandsStore: () => mockBrandsStore,
}))

const mockCanvasesStore = {
  createCanvas: mock(() => Promise.resolve({ id: 'canvas-1', name: 'Test Brand - Canvas 1' })),
}
mock.module('@/stores/canvases', () => ({
  useCanvasesStore: () => mockCanvasesStore,
}))

const { completeOnboarding } = await import('@/composables/useOnboardingComplete')
const { useAuthStore } = await import('@/stores/auth')

// Mock functions to replace on the real auth store
const mockUpdateName = mock(() => Promise.resolve())
const mockFetchProfile = mock(() => Promise.resolve())

describe('completeOnboarding', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockFrom.mockClear()
    mockPush.mockClear()
    mockUpdateName.mockClear()
    mockFetchProfile.mockClear()
    mockBrandsStore.createBrandFull.mockClear()
    mockCanvasesStore.createCanvas.mockClear()

    // Set up the real auth store with a test user and mocked methods
    const authStore = useAuthStore()
    authStore.user = { id: 'user-1' } as any
    authStore.profile = { name: null, onboarded: false, plan: 'free' }
    authStore.updateName = mockUpdateName as any
    authStore.fetchProfile = mockFetchProfile as any
  })

  test('saves name, creates brand, creates canvas, sets onboarded, redirects to editor', async () => {
    // Mock the users update for onboarded=true
    mockFrom.mockReturnValueOnce({
      update: () => ({
        eq: () => Promise.resolve({ error: null }),
      }),
    })

    await completeOnboarding({
      name: 'Jiho',
      brandName: 'Kova',
      colors: { primary: '#000', secondary: '#fff', accent: '#f00', background: '#eee' },
      fonts: { heading: 'Inter', body: 'Georgia' },
      voice: 'Professional',
      logoFile: null,
      logoUrl: null,
    })

    expect(mockUpdateName).toHaveBeenCalledWith('Jiho')
    expect(mockBrandsStore.createBrandFull).toHaveBeenCalledWith({
      name: 'Kova',
      colors: { primary: '#000', secondary: '#fff', accent: '#f00', background: '#eee' },
      fonts: { heading: 'Inter', body: 'Georgia' },
      voice: 'Professional',
      logoUrl: null,
      logoFile: null,
    })
    expect(mockCanvasesStore.createCanvas).toHaveBeenCalledWith('brand-1', 'Kova - Canvas 1')
    expect(mockFrom).toHaveBeenCalledWith('users')
    expect(mockPush).toHaveBeenCalledWith('/editor/canvas-1')
  })

  test('throws on error and does not redirect', async () => {
    mockUpdateName.mockImplementationOnce(() => Promise.reject(new Error('Failed')))

    await expect(
      completeOnboarding({
        name: 'Jiho',
        brandName: 'Kova',
        colors: null,
        fonts: null,
        voice: null,
        logoFile: null,
        logoUrl: null,
      }),
    ).rejects.toThrow('Failed')

    expect(mockPush).not.toHaveBeenCalled()
  })

  test('throws when user is not authenticated', async () => {
    const authStore = useAuthStore()
    authStore.user = null

    await expect(
      completeOnboarding({
        name: 'Jiho',
        brandName: 'Kova',
        colors: null,
        fonts: null,
        voice: null,
        logoFile: null,
        logoUrl: null,
      }),
    ).rejects.toThrow('Not authenticated')

    expect(mockPush).not.toHaveBeenCalled()
  })
})
