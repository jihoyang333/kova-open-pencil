import { beforeEach, describe, expect, mock, test } from 'bun:test'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'

import { timeAgo } from '@/utils/time-ago'

// ----- Supabase mock -----

let _mockData: Record<string, unknown> | null = null
let _mockError: { message: string } | null = null

const mockMaybeSingle = mock(() => Promise.resolve({ data: _mockData, error: _mockError }))
const mockEqStatus = mock(() => ({ maybeSingle: mockMaybeSingle }))
const mockEqBrand = mock(() => ({ eq: mockEqStatus }))
const mockSelect = mock(() => ({ eq: mockEqBrand }))
const mockFrom = mock(() => ({ select: mockSelect }))

mock.module('@/lib/supabase', () => ({
  supabase: { from: mockFrom },
}))

// ----- Component import (after mock registration) -----

const { default: BrandContextPill } = await import(
  '@/components/editor/BrandContextPill.vue'
)
const { useBrandsStore } = await import('@/stores/brands')

// ----- Fixtures -----

const BRAND = {
  id: 'brand-1',
  user_id: 'user-1',
  name: 'Acme Co',
  colors: null,
  fonts: null,
  logo_url: null,
  voice: null,
  industry: null,
  url: null,
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
}

// ----- Helpers -----

function setConnectionData(
  data: Record<string, unknown> | null,
  error: { message: string } | null = null
) {
  _mockData = data
  _mockError = error
}

function mountPill(brandId = 'brand-1') {
  const pinia = createPinia()
  setActivePinia(pinia)

  const store = useBrandsStore()
  store.brands = [BRAND]

  return mount(BrandContextPill, {
    props: { brandId },
    global: {
      plugins: [pinia],
      stubs: { 'icon-lucide-tag': true },
    },
  })
}

// ----- timeAgo unit tests -----

describe('timeAgo', () => {
  test('returns "Never synced" for null', () => {
    expect(timeAgo(null)).toBe('Never synced')
  })

  test('returns "just now" for timestamps under 1 minute', () => {
    const ts = new Date(Date.now() - 30_000).toISOString()
    expect(timeAgo(ts)).toBe('just now')
  })

  test('returns minutes ago for timestamps under 1 hour', () => {
    const ts = new Date(Date.now() - 15 * 60_000).toISOString()
    expect(timeAgo(ts)).toBe('15m ago')
  })

  test('returns hours ago for timestamps under 24 hours', () => {
    const ts = new Date(Date.now() - 3 * 60 * 60_000).toISOString()
    expect(timeAgo(ts)).toBe('3h ago')
  })

  test('returns days ago for timestamps over 24 hours', () => {
    const ts = new Date(Date.now() - 2 * 24 * 60 * 60_000).toISOString()
    expect(timeAgo(ts)).toBe('2d ago')
  })

  test('returns "1m ago" at exactly 1 minute', () => {
    const ts = new Date(Date.now() - 60_000).toISOString()
    expect(timeAgo(ts)).toBe('1m ago')
  })
})

// ----- BrandContextPill component tests -----

describe('BrandContextPill', () => {
  beforeEach(() => {
    _mockData = null
    _mockError = null
    mockFrom.mockClear()
    mockSelect.mockClear()
    mockEqBrand.mockClear()
    mockEqStatus.mockClear()
    mockMaybeSingle.mockClear()
  })

  describe('pill rendering', () => {
    test('renders the brand name', async () => {
      setConnectionData(null)
      const wrapper = mountPill()
      await flushPromises()

      expect(wrapper.find('[data-test-id="brand-context-pill"]').exists()).toBe(true)
      expect(wrapper.find('[data-test-id="brand-context-pill-name"]').text()).toBe('Acme Co')
    })

    test('renders fallback "—" when brand is not found in store', async () => {
      setConnectionData(null)
      const wrapper = mountPill('unknown-brand')
      await flushPromises()

      expect(wrapper.find('[data-test-id="brand-context-pill-name"]').text()).toBe('—')
    })
  })

  describe('with Shopify connection', () => {
    test('sets connection state with shop_domain and last_synced_at', async () => {
      setConnectionData({
        shop_domain: 'acme.myshopify.com',
        last_synced_at: null,
      })
      const wrapper = mountPill()
      await flushPromises()

      const vm = wrapper.vm as unknown as { connection: { shop_domain: string; last_synced_at: string | null } | null }
      expect(vm.connection).not.toBeNull()
      expect(vm.connection?.shop_domain).toBe('acme.myshopify.com')
    })

    test('timeAgo formats last_synced_at correctly (5 minutes)', () => {
      const ts = new Date(Date.now() - 5 * 60_000).toISOString()
      expect(timeAgo(ts)).toBe('5m ago')
    })

    test('timeAgo returns "Never synced" when last_synced_at is null', () => {
      expect(timeAgo(null)).toBe('Never synced')
    })
  })

  describe('without Shopify connection', () => {
    test('leaves connection null when no active connection found', async () => {
      setConnectionData(null)
      const wrapper = mountPill()
      await flushPromises()

      const vm = wrapper.vm as unknown as { connection: unknown }
      expect(vm.connection).toBeNull()
    })
  })

  describe('supabase query', () => {
    test('queries shopify_connections filtered by brandId with active status', async () => {
      setConnectionData(null)
      mountPill('my-brand')
      await flushPromises()

      expect(mockFrom).toHaveBeenCalledWith('shopify_connections')
      expect(mockEqBrand).toHaveBeenCalledWith('brand_id', 'my-brand')
      expect(mockEqStatus).toHaveBeenCalledWith('status', 'active')
    })
  })
})
