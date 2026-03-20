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

const mockPush = mock(() => {})
mock.module('@/router', () => ({
  getRouter: () => ({ push: mockPush }),
}))

const mockAuthStore = {
  user: { id: 'user-1' },
  profile: { name: null, onboarded: false, plan: 'free' },
  fetchProfile: mock(() => Promise.resolve()),
  updateName: mock(() => Promise.resolve()),
}
mock.module('@/stores/auth', () => ({
  useAuthStore: () => mockAuthStore,
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

describe('completeOnboarding', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockFrom.mockClear()
    mockPush.mockClear()
    mockAuthStore.updateName.mockClear()
    mockBrandsStore.createBrandFull.mockClear()
    mockCanvasesStore.createCanvas.mockClear()
    mockAuthStore.fetchProfile.mockClear()
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

    expect(mockAuthStore.updateName).toHaveBeenCalledWith('Jiho')
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
    mockAuthStore.updateName.mockImplementationOnce(() => Promise.reject(new Error('Failed')))

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
    const originalUser = mockAuthStore.user
    mockAuthStore.user = null as never

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
    mockAuthStore.user = originalUser
  })
})
