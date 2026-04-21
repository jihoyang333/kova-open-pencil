import { beforeEach, describe, expect, mock, test } from 'bun:test'
import { RouterLinkStub, flushPromises, mount } from '@vue/test-utils'

// ----- Supabase mock (overrides setup-dom.ts global for this file) -----

let _mockData: Record<string, unknown> | null = null
let _mockError: { message: string } | null = null

const mockMaybeSingle = mock(() => Promise.resolve({ data: _mockData, error: _mockError }))
const mockEq = mock(() => ({ maybeSingle: mockMaybeSingle }))
const mockSelect = mock(() => ({ eq: mockEq }))
const mockFrom = mock(() => ({ select: mockSelect }))

mock.module('@/lib/supabase', () => ({
  supabase: { from: mockFrom },
  getSupabase: () => ({ from: mockFrom }),
}))

// ----- Component import (after mock registration) -----
const { default: IntegrationsCard } = await import(
  '@/components/dashboard/IntegrationsCard.vue'
)

// ----- Helpers -----
function mountCard(brandId = 'brand-test-1') {
  return mount(IntegrationsCard, {
    props: { brandId },
    global: {
      stubs: { RouterLink: RouterLinkStub, 'icon-lucide-check-circle': true, 'icon-lucide-alert-triangle': true },
    },
  })
}

function setConnectionData(data: Record<string, unknown> | null, error: { message: string } | null = null) {
  _mockData = data
  _mockError = error
}

// ----- Tests -----

describe('IntegrationsCard', () => {
  beforeEach(() => {
    _mockData = null
    _mockError = null
    mockFrom.mockClear()
    mockSelect.mockClear()
    mockEq.mockClear()
    mockMaybeSingle.mockClear()
  })

  describe('not-connected state', () => {
    test('renders not-connected panel when no row exists', async () => {
      setConnectionData(null)
      const wrapper = mountCard()
      await flushPromises()

      expect(wrapper.find('[data-test-id="integrations-not-connected"]').exists()).toBe(true)
      expect(wrapper.find('[data-test-id="integrations-connected"]').exists()).toBe(false)
      expect(wrapper.find('[data-test-id="integrations-reauthorize"]').exists()).toBe(false)
    })

    test('renders not-connected panel when status is disconnected', async () => {
      setConnectionData({ shop_domain: 'old.myshopify.com', status: 'disconnected', last_synced_at: null })
      const wrapper = mountCard()
      await flushPromises()

      expect(wrapper.find('[data-test-id="integrations-not-connected"]').exists()).toBe(true)
    })

    test('"Connect Shopify" button is visible initially', async () => {
      setConnectionData(null)
      const wrapper = mountCard()
      await flushPromises()

      expect(wrapper.find('[data-test-id="integrations-connect-btn"]').exists()).toBe(true)
      expect(wrapper.find('[data-test-id="integrations-shop-input"]').exists()).toBe(false)
    })

    test('clicking "Connect Shopify" reveals the shop domain input', async () => {
      setConnectionData(null)
      const wrapper = mountCard()
      await flushPromises()

      await wrapper.find('[data-test-id="integrations-connect-btn"]').trigger('click')

      expect(wrapper.find('[data-test-id="integrations-shop-input"]').exists()).toBe(true)
      expect(wrapper.find('[data-test-id="integrations-confirm-connect"]').exists()).toBe(true)
    })

    test('shows error message when an invalid domain is submitted', async () => {
      setConnectionData(null)
      const wrapper = mountCard()
      await flushPromises()

      await wrapper.find('[data-test-id="integrations-connect-btn"]').trigger('click')
      const input = wrapper.find('[data-test-id="integrations-shop-input"]')
      await input.setValue('not-a-shopify.com')
      await wrapper.find('[data-test-id="integrations-confirm-connect"]').trigger('click')

      expect(wrapper.find('[data-test-id="integrations-error"]').exists()).toBe(true)
      expect(wrapper.find('[data-test-id="integrations-error"]').text()).toContain('valid Shopify domain')
    })

    test('no error shown for a valid domain', async () => {
      setConnectionData(null)
      const openedUrls: string[] = []
      const originalOpen = (globalThis as Record<string, unknown>).open
      ;(globalThis as Record<string, unknown>).open = (url: string) => { openedUrls.push(url); return null }

      const wrapper = mountCard()
      await flushPromises()

      await wrapper.find('[data-test-id="integrations-connect-btn"]').trigger('click')
      await wrapper.find('[data-test-id="integrations-shop-input"]').setValue('valid.myshopify.com')
      await wrapper.find('[data-test-id="integrations-confirm-connect"]').trigger('click')

      expect(wrapper.find('[data-test-id="integrations-error"]').exists()).toBe(false)

      ;(globalThis as Record<string, unknown>).open = originalOpen
    })
  })

  describe('connected state', () => {
    test('renders shop domain and last-sync time', async () => {
      setConnectionData({
        shop_domain: 'acme.myshopify.com',
        status: 'active',
        last_synced_at: '2026-04-01T10:00:00Z',
      })
      const wrapper = mountCard()
      await flushPromises()

      expect(wrapper.find('[data-test-id="integrations-connected"]').exists()).toBe(true)
      expect(wrapper.find('[data-test-id="integrations-not-connected"]').exists()).toBe(false)
      expect(wrapper.find('[data-test-id="integrations-reauthorize"]').exists()).toBe(false)

      expect(wrapper.find('[data-test-id="integrations-shop-domain"]').text()).toBe('acme.myshopify.com')
      expect(wrapper.find('[data-test-id="integrations-last-sync"]').text()).toContain('Last synced')
    })

    test('shows "Never synced" when last_synced_at is null', async () => {
      setConnectionData({
        shop_domain: 'acme.myshopify.com',
        status: 'active',
        last_synced_at: null,
      })
      const wrapper = mountCard()
      await flushPromises()

      expect(wrapper.find('[data-test-id="integrations-last-sync"]').text()).toBe('Never synced')
    })

    test('renders disconnect button and settings link', async () => {
      setConnectionData({ shop_domain: 'acme.myshopify.com', status: 'active', last_synced_at: null })
      const wrapper = mountCard('brand-abc')
      await flushPromises()

      expect(wrapper.find('[data-test-id="integrations-disconnect-btn"]').exists()).toBe(true)
      const settingsLinks = wrapper.findAllComponents(RouterLinkStub)
      const settingsLink = settingsLinks.find((c) => c.attributes('data-test-id') === 'integrations-settings-link')
      expect(settingsLink).toBeDefined()
      expect(settingsLink!.props('to')).toContain('brand-abc')
    })

    test('disconnect button calls the disconnect API and transitions to not-connected', async () => {
      setConnectionData({ shop_domain: 'acme.myshopify.com', status: 'active', last_synced_at: null })
      const fetchCalls: string[] = []
      const originalFetch = globalThis.fetch
      globalThis.fetch = mock(async (url: string) => {
        fetchCalls.push(url)
        return new Response(JSON.stringify({ success: true }), { status: 200 })
      }) as typeof fetch

      const wrapper = mountCard('brand-abc')
      await flushPromises()

      // After disconnect, next loadConnection should return null
      setConnectionData(null)

      await wrapper.find('[data-test-id="integrations-disconnect-btn"]').trigger('click')
      await flushPromises()

      expect(fetchCalls[0]).toContain('/api/shopify/oauth/disconnect')
      expect(wrapper.find('[data-test-id="integrations-not-connected"]').exists()).toBe(true)

      globalThis.fetch = originalFetch
    })
  })

  describe('reauthorize state', () => {
    test('renders amber banner with shop domain', async () => {
      setConnectionData({
        shop_domain: 'pending.myshopify.com',
        status: 'error',
        last_synced_at: null,
      })
      const wrapper = mountCard()
      await flushPromises()

      expect(wrapper.find('[data-test-id="integrations-reauthorize"]').exists()).toBe(true)
      expect(wrapper.find('[data-test-id="integrations-connected"]').exists()).toBe(false)
      expect(wrapper.find('[data-test-id="integrations-not-connected"]').exists()).toBe(false)

      expect(wrapper.find('[data-test-id="integrations-reauth-domain"]').text()).toBe('pending.myshopify.com')
      expect(wrapper.find('[data-test-id="integrations-reauthorize-btn"]').exists()).toBe(true)
    })
  })

  describe('supabase query', () => {
    test('queries shopify_connections filtered by brandId', async () => {
      setConnectionData(null)
      mountCard('my-brand-id')
      await flushPromises()

      expect(mockFrom).toHaveBeenCalledWith('shopify_connections')
      expect(mockEq).toHaveBeenCalledWith('brand_id', 'my-brand-id')
    })
  })
})
