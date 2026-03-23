import { describe, test, expect, beforeEach, mock } from 'bun:test'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import { setActivePinia, createPinia } from 'pinia'

// Passthrough for Reka UI stubs (renders slots unconditionally)
const Passthrough = defineComponent({
  inheritAttrs: false,
  setup(_, { slots }) {
    return () => slots.default?.()
  },
})

// DialogRoot respects the `open` prop — only renders children when open=true
const DialogRootStub = defineComponent({
  props: { open: { type: Boolean, default: false } },
  setup(props, { slots }) {
    return () => props.open ? slots.default?.() : null
  },
})

// --- Mocks ---

const mockUpdateBrand = mock(() => Promise.resolve())

// Use a reactive ref so mountWithBrand can change the value after import
const mockSelectedBrand = ref<Record<string, unknown> | null>(null)

mock.module('@/lib/supabase', () => ({
  supabase: {
    from: mock(() => ({})),
    storage: {
      from: mock(() => ({
        upload: mock(() => Promise.resolve({ error: null })),
        getPublicUrl: () => ({ data: { publicUrl: 'https://url' } }),
      })),
    },
    auth: {
      getSession: mock(() => Promise.resolve({ data: { session: null }, error: null })),
      onAuthStateChange: mock(() => ({ data: { subscription: { unsubscribe: () => {} } } })),
    },
  },
}))

mock.module('@/stores/brands', () => ({
  useBrandsStore: () => ({
    get selectedBrand() { return mockSelectedBrand.value },
    updateBrand: mockUpdateBrand,
  }),
}))

mock.module('@/stores/auth', () => ({
  useAuthStore: () => ({
    user: { id: 'user-1' },
    session: { access_token: 'test-token' },
  }),
}))

mock.module('@/utils/api-headers', () => ({
  getAuthHeaders: () => ({
    'Content-Type': 'application/json',
    'Authorization': 'Bearer test-token',
  }),
}))

const EmptyDiv = defineComponent({ setup() { return () => h('div') } })

mock.module('reka-ui', () => ({
  DialogRoot: DialogRootStub,
  DialogPortal: Passthrough,
  DialogOverlay: EmptyDiv,
  DialogContent: Passthrough,
  DialogTitle: Passthrough,
  DialogDescription: Passthrough,
  DialogClose: Passthrough,
  PopoverRoot: Passthrough,
  PopoverTrigger: Passthrough,
  PopoverPortal: Passthrough,
  PopoverContent: Passthrough,
  TooltipProvider: Passthrough,
  TooltipRoot: Passthrough,
  TooltipTrigger: Passthrough,
  TooltipContent: Passthrough,
  TooltipPortal: Passthrough,
  SelectRoot: Passthrough,
  SelectTrigger: Passthrough,
  SelectPortal: Passthrough,
  SelectContent: Passthrough,
  SelectItem: Passthrough,
  SelectItemText: Passthrough,
  SelectValue: Passthrough,
  SelectViewport: Passthrough,
  SelectScrollUpButton: Passthrough,
  SelectScrollDownButton: Passthrough,
  SeparatorRoot: EmptyDiv,
  LabelRoot: Passthrough,
}))

mock.module('vue-router', () => ({
  useRoute: () => ({ params: { brandId: 'b1' } }),
  useRouter: () => ({ push: mock(() => {}) }),
}))

mock.module('@/composables/use-toast', () => ({
  toast: { show: mock(() => {}) },
}))

const successResponse = {
  colors: { primary: '#ff0000', secondary: '#00ff00', accent: '#0000ff', background: '#ffffff' },
  fonts: { heading: 'Inter', body: 'Georgia' },
  writing_style: 'Professional tone',
  logo_url: 'https://example.com/logo.png',
}

const mockFetch = mock(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve(successResponse),
  })
)
globalThis.fetch = mockFetch as any

// Import after mocks
const { default: BrandSettingsView } = await import(
  '@/views/dashboard/BrandSettingsView.vue'
)

function mountWithBrand(brandOverrides: Record<string, unknown> = {}) {
  mockSelectedBrand.value = {
    id: 'b1',
    user_id: 'user-1',
    name: 'Test Brand',
    url: null,
    colors: null,
    fonts: null,
    logo_url: null,
    voice: null,
    industry: null,
    ...brandOverrides,
  }

  return mount(BrandSettingsView, {
    global: {
      stubs: {
        BrandColorPicker: defineComponent({
          props: ['modelValue', 'label'],
          setup() { return () => h('div') },
        }),
      },
    },
  })
}

describe('BrandSettingsView extract slot', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockUpdateBrand.mockClear()
    mockFetch.mockClear()
    mockSelectedBrand.value = null
  })

  test('extract button is disabled when URL is empty', () => {
    const wrapper = mountWithBrand({ url: null })
    const btn = wrapper.find('[data-test-id="brand-settings-extract-button"]')
    expect(btn.exists()).toBe(true)
    expect(btn.attributes('disabled')).toBeDefined()
  })

  test('extract button is enabled when URL is present and no prior extraction', () => {
    const wrapper = mountWithBrand({ url: 'https://example.com', colors: null, fonts: null })
    const btn = wrapper.find('[data-test-id="brand-settings-extract-button"]')
    expect(btn.exists()).toBe(true)
    expect(btn.attributes('disabled')).toBeUndefined()
  })

  test('clicking extract calls runExtraction directly (no dialog) on first use', async () => {
    const wrapper = mountWithBrand({ url: 'https://example.com', colors: null, fonts: null })
    await wrapper.find('[data-test-id="brand-settings-extract-button"]').trigger('click')
    // Should call fetch directly, not show a dialog
    expect(mockFetch).toHaveBeenCalledWith('/api/extract-brand', expect.objectContaining({
      method: 'POST',
    }))
    // No confirmation dialog should be visible
    const dialog = wrapper.find('[data-test-id="brand-settings-reextract-confirm"]')
    expect(dialog.exists()).toBe(false)
  })

  test('progress banner shows during extraction', async () => {
    let resolveResponse!: (v: unknown) => void
    mockFetch.mockImplementationOnce(() =>
      new Promise((resolve) => { resolveResponse = resolve })
    )

    const wrapper = mountWithBrand({ url: 'https://example.com', colors: null, fonts: null })
    await wrapper.find('[data-test-id="brand-settings-extract-button"]').trigger('click')
    await flushPromises()

    const banner = wrapper.find('[data-test-id="brand-settings-extract-banner"]')
    expect(banner.exists()).toBe(true)
    expect(banner.text()).toContain('example.com')

    // Resolve to clean up
    resolveResponse({ ok: true, json: () => Promise.resolve(successResponse) })
    await flushPromises()
  })

  test('after extraction, re-extract button appears', async () => {
    const wrapper = mountWithBrand({ url: 'https://example.com', colors: null, fonts: null })
    await wrapper.find('[data-test-id="brand-settings-extract-button"]').trigger('click')
    await flushPromises()

    const reextract = wrapper.find('[data-test-id="brand-settings-reextract"]')
    expect(reextract.exists()).toBe(true)
  })

  test('shows re-extract button when brand has colors (hasExtractedBefore)', () => {
    const wrapper = mountWithBrand({
      url: 'https://example.com',
      colors: { primary: '#000', secondary: '#111', accent: '#222', background: '#fff' },
    })
    const btn = wrapper.find('[data-test-id="brand-settings-reextract"]')
    expect(btn.exists()).toBe(true)
  })

  test('clicking re-extract opens confirmation dialog', async () => {
    const wrapper = mountWithBrand({
      url: 'https://example.com',
      colors: { primary: '#000', secondary: '#111', accent: '#222', background: '#fff' },
    })
    await wrapper.find('[data-test-id="brand-settings-reextract"]').trigger('click')
    await flushPromises()

    const confirmBtn = wrapper.find('[data-test-id="brand-settings-reextract-confirm"]')
    expect(confirmBtn.exists()).toBe(true)
  })

  test('confirming re-extract calls runExtraction', async () => {
    const wrapper = mountWithBrand({
      url: 'https://example.com',
      colors: { primary: '#000', secondary: '#111', accent: '#222', background: '#fff' },
    })
    await wrapper.find('[data-test-id="brand-settings-reextract"]').trigger('click')
    await flushPromises()

    await wrapper.find('[data-test-id="brand-settings-reextract-confirm"]').trigger('click')
    expect(mockFetch).toHaveBeenCalledWith('/api/extract-brand', expect.objectContaining({
      method: 'POST',
    }))
  })

  test('extraction fetch includes Authorization header', async () => {
    const wrapper = mountWithBrand({ url: 'https://example.com', colors: null, fonts: null })
    await wrapper.find('[data-test-id="brand-settings-extract-button"]').trigger('click')
    expect(mockFetch).toHaveBeenCalledWith('/api/extract-brand', expect.objectContaining({
      headers: expect.objectContaining({
        'Authorization': 'Bearer test-token',
      }),
    }))
  })

  test('logo_url from extraction response is mapped to brand', async () => {
    const wrapper = mountWithBrand({ url: 'https://example.com', colors: null, fonts: null })
    await wrapper.find('[data-test-id="brand-settings-extract-button"]').trigger('click')
    await flushPromises()

    expect(mockUpdateBrand).toHaveBeenCalledWith('b1', { logo_url: 'https://example.com/logo.png' })
  })

  test('null logo_url from extraction does not clear existing logo', async () => {
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ ...successResponse, logo_url: null }),
      })
    )

    const wrapper = mountWithBrand({
      url: 'https://example.com',
      colors: null,
      fonts: null,
      logo_url: 'https://existing-logo.png',
    })
    await wrapper.find('[data-test-id="brand-settings-extract-button"]').trigger('click')
    await flushPromises()

    // updateBrand should NOT be called with logo_url
    const logoUpdateCalls = mockUpdateBrand.mock.calls.filter(
      (call) => (call[1] as Record<string, unknown>)?.logo_url !== undefined
    )
    expect(logoUpdateCalls).toHaveLength(0)
  })
})
