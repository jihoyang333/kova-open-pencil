import { describe, test, expect, beforeEach, mock } from 'bun:test'

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

const mockUpdateName = mock(() => Promise.resolve())
const mockFetchProfile = mock(() => Promise.resolve())

const mockAuthStore = {
  user: { id: 'user-1' } as { id: string } | null,
  profile: { name: null, onboarded: false, plan: 'free' } as { name: string | null; onboarded: boolean; plan: string } | null,
  updateName: mockUpdateName,
  fetchProfile: mockFetchProfile,
}
mock.module('@/stores/auth', () => ({
  useAuthStore: () => mockAuthStore,
}))

const { completeOnboarding } = await import('@/composables/useOnboardingComplete')

describe('completeOnboarding', () => {
  beforeEach(() => {
    mockFrom.mockClear()
    mockPush.mockClear()
    mockUpdateName.mockClear()
    mockFetchProfile.mockClear()
    mockBrandsStore.createBrandFull.mockClear()
    mockCanvasesStore.createCanvas.mockClear()

    mockAuthStore.user = { id: 'user-1' }
    mockAuthStore.profile = { name: null, onboarded: false, plan: 'free' }
  })

  test('saves name, creates brand, creates canvas, sets onboarded, redirects to editor', async () => {
    // Mock brand_profiles insert
    mockFrom.mockReturnValueOnce({
      insert: () => Promise.resolve({ error: null }),
    })
    // Mock users update for onboarded=true
    mockFrom.mockReturnValueOnce({
      update: () => ({
        eq: () => Promise.resolve({ error: null }),
      }),
    })

    await completeOnboarding({
      name: 'Jiho',
      brandName: 'Kova',
      brandUrl: 'https://kova.design',
      colors: { primary: '#000', secondary: '#fff', accent: '#f00', background: '#eee' },
      fonts: { heading: 'Inter', body: 'Georgia' },
      voice: 'Professional',
      industry: 'Technology',
      logoFile: null,
      logoUrl: null,
    })

    expect(mockUpdateName).toHaveBeenCalledWith('Jiho')
    expect(mockBrandsStore.createBrandFull).toHaveBeenCalledWith({
      name: 'Kova',
      url: 'https://kova.design',
      colors: { primary: '#000', secondary: '#fff', accent: '#f00', background: '#eee' },
      fonts: { heading: 'Inter', body: 'Georgia' },
      voice: 'Professional',
      industry: 'Technology',
      logoUrl: null,
      logoFile: null,
    })
    expect(mockCanvasesStore.createCanvas).toHaveBeenCalledWith('brand-1', 'Kova - Canvas 1')
    expect(mockFrom).toHaveBeenCalledWith('brand_profiles')
    expect(mockFrom).toHaveBeenCalledWith('users')
    expect(mockPush).toHaveBeenCalledWith('/editor/canvas-1')
  })

  test('throws on error and does not redirect', async () => {
    mockUpdateName.mockImplementationOnce(() => Promise.reject(new Error('Failed')))

    await expect(
      completeOnboarding({
        name: 'Jiho',
        brandName: 'Kova',
        brandUrl: '',
        colors: null,
        fonts: null,
        voice: null,
        industry: null,
        logoFile: null,
        logoUrl: null,
      }),
    ).rejects.toThrow('Failed')

    expect(mockPush).not.toHaveBeenCalled()
  })

  test('throws when user is not authenticated', async () => {
    mockAuthStore.user = null

    await expect(
      completeOnboarding({
        name: 'Jiho',
        brandName: 'Kova',
        brandUrl: '',
        colors: null,
        fonts: null,
        voice: null,
        industry: null,
        logoFile: null,
        logoUrl: null,
      }),
    ).rejects.toThrow('Not authenticated')

    expect(mockPush).not.toHaveBeenCalled()
  })
})
