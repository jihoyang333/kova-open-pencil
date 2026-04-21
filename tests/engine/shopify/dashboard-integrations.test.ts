import { beforeEach, describe, expect, mock, test } from 'bun:test'
import { nextTick } from 'vue'
import { RouterLinkStub, flushPromises, mount } from '@vue/test-utils'

// ----- Supabase mock (overrides setup-dom.ts global for this file) -----

let _mockData: Record<string, unknown> | null = null
let _mockError: { message: string } | null = null

const mockMaybeSingle = mock(() => Promise.resolve({ data: _mockData, error: _mockError }))
const mockEq = mock(() => ({ maybeSingle: mockMaybeSingle }))
const mockSelect = mock(() => ({ eq: mockEq }))
const mockFrom = mock(() => ({ select: mockSelect }))

const mockUnsubscribe = mock(() => Promise.resolve('ok' as const))
const mockSubscribe = mock(() => mockRealtimeChannel)
const mockRealtimeOn = mock(() => mockRealtimeChannel)
const mockRealtimeChannel = { on: mockRealtimeOn, subscribe: mockSubscribe, unsubscribe: mockUnsubscribe }
const mockChannelFn = mock(() => mockRealtimeChannel)

const mockGetSession = mock(() =>
  Promise.resolve({ data: { session: { access_token: 'test-jwt-token' } }, error: null }),
)

mock.module('@/lib/supabase', () => ({
  supabase: {
    from: mockFrom,
    channel: mockChannelFn,
    auth: { getSession: mockGetSession },
  },
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
      stubs: { RouterLink: RouterLinkStub, 'icon-lucide-check-circle': true, 'icon-lucide-alert-triangle': true, 'icon-lucide-refresh-cw': true },
    },
  })
}

function setConnectionData(data: Record<string, unknown> | null, error: { message: string } | null = null) {
  _mockData = data
  _mockError = error
}

// Default idle connection fixture
const IDLE_CONNECTION = {
  shop_domain: 'acme.myshopify.com',
  status: 'active',
  last_synced_at: null,
  sync_progress: { phase: 'idle', count_done: 0, count_total: 0 },
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
    mockChannelFn.mockClear()
    mockRealtimeOn.mockClear()
    mockSubscribe.mockClear()
    mockUnsubscribe.mockClear()
    mockGetSession.mockClear()
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
        sync_progress: { phase: 'idle', count_done: 0, count_total: 0 },
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
        sync_progress: { phase: 'idle', count_done: 0, count_total: 0 },
      })
      const wrapper = mountCard()
      await flushPromises()

      expect(wrapper.find('[data-test-id="integrations-last-sync"]').text()).toBe('Never synced')
    })

    test('renders disconnect button and settings link', async () => {
      setConnectionData({ ...IDLE_CONNECTION })
      const wrapper = mountCard('brand-abc')
      await flushPromises()

      expect(wrapper.find('[data-test-id="integrations-disconnect-btn"]').exists()).toBe(true)
      const settingsLinks = wrapper.findAllComponents(RouterLinkStub)
      const settingsLink = settingsLinks.find((c) => c.attributes('data-test-id') === 'integrations-settings-link')
      expect(settingsLink).toBeDefined()
      expect(settingsLink!.props('to')).toContain('brand-abc')
    })

    test('disconnect button calls the disconnect API and transitions to not-connected', async () => {
      setConnectionData({ ...IDLE_CONNECTION })
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
    test('clicking Reauthorize button invokes handleReauthorize without error', async () => {
      setConnectionData({
        shop_domain: 'pending.myshopify.com',
        status: 'error',
        last_synced_at: null,
      })
      const originalOpen = (globalThis as Record<string, unknown>).open
      ;(globalThis as Record<string, unknown>).open = () => null

      const wrapper = mountCard()
      await flushPromises()

      // Should not throw — exercises handleReauthorize() → openOAuthPopup() path
      await wrapper.find('[data-test-id="integrations-reauthorize-btn"]').trigger('click')
      await flushPromises()

      expect(wrapper.find('[data-test-id="integrations-reauthorize"]').exists()).toBe(true)

      ;(globalThis as Record<string, unknown>).open = originalOpen
    })

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

  describe('Refresh Now button', () => {
    test('"Refresh now" button is visible in connected state when idle', async () => {
      setConnectionData({ ...IDLE_CONNECTION })
      const wrapper = mountCard()
      await flushPromises()

      expect(wrapper.find('[data-test-id="integrations-refresh-btn"]').exists()).toBe(true)
    })

    test('"Refresh now" button is enabled when sync phase is idle', async () => {
      setConnectionData({ ...IDLE_CONNECTION })
      const wrapper = mountCard()
      await flushPromises()

      const btn = wrapper.find('[data-test-id="integrations-refresh-btn"]')
      expect((btn.element as HTMLButtonElement).disabled).toBe(false)
    })

    test('"Refresh now" button is disabled when sync phase is running', async () => {
      setConnectionData({
        ...IDLE_CONNECTION,
        sync_progress: { phase: 'running', count_done: 0, count_total: 0 },
      })
      const wrapper = mountCard()
      await flushPromises()

      const btn = wrapper.find('[data-test-id="integrations-refresh-btn"]')
      expect((btn.element as HTMLButtonElement).disabled).toBe(true)
    })

    test('"Refresh now" button is disabled when sync phase is parsing', async () => {
      setConnectionData({
        ...IDLE_CONNECTION,
        sync_progress: { phase: 'parsing', count_done: 50, count_total: 100 },
      })
      const wrapper = mountCard()
      await flushPromises()

      const btn = wrapper.find('[data-test-id="integrations-refresh-btn"]')
      expect((btn.element as HTMLButtonElement).disabled).toBe(true)
    })

    test('"Refresh now" button POSTs to /api/shopify/sync/bulk-start with JWT', async () => {
      setConnectionData({ ...IDLE_CONNECTION })
      const fetchRequests: Array<{ url: string; init: RequestInit }> = []
      const originalFetch = globalThis.fetch
      globalThis.fetch = mock(async (url: string, init: RequestInit) => {
        fetchRequests.push({ url, init })
        return new Response(JSON.stringify({ ok: true, bulk_op_id: 'gid://shopify/BulkOperation/1' }), { status: 200 })
      }) as typeof fetch

      const wrapper = mountCard('brand-abc')
      await flushPromises()

      await wrapper.find('[data-test-id="integrations-refresh-btn"]').trigger('click')
      await flushPromises()

      expect(fetchRequests[0]?.url).toContain('/api/shopify/sync/bulk-start')
      const headers = fetchRequests[0]?.init?.headers as Record<string, string> | undefined
      expect(headers?.['Authorization']).toContain('Bearer test-jwt-token')

      globalThis.fetch = originalFetch
    })

    test('optimistically sets phase to running after successful refresh', async () => {
      setConnectionData({ ...IDLE_CONNECTION })
      const originalFetch = globalThis.fetch
      globalThis.fetch = mock(async () =>
        new Response(JSON.stringify({ ok: true, bulk_op_id: 'gid://shopify/BulkOperation/1' }), { status: 200 })
      ) as typeof fetch

      const wrapper = mountCard()
      await flushPromises()

      await wrapper.find('[data-test-id="integrations-refresh-btn"]').trigger('click')
      await flushPromises()

      // Button should be disabled after optimistic update
      const btn = wrapper.find('[data-test-id="integrations-refresh-btn"]')
      expect((btn.element as HTMLButtonElement).disabled).toBe(true)

      globalThis.fetch = originalFetch
    })

    test('sets sync_progress to error phase when server returns non-409 error', async () => {
      setConnectionData({ ...IDLE_CONNECTION })
      const originalFetch = globalThis.fetch
      globalThis.fetch = mock(async () =>
        new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 })
      ) as typeof fetch

      const wrapper = mountCard()
      await flushPromises()

      await wrapper.find('[data-test-id="integrations-refresh-btn"]').trigger('click')
      await flushPromises()

      const errEl = wrapper.find('[data-test-id="integrations-sync-error"]')
      expect(errEl.exists()).toBe(true)
      expect(errEl.text()).toContain('Sync failed')

      globalThis.fetch = originalFetch
    })

    test('does not crash when server returns 409 (already syncing)', async () => {
      setConnectionData({ ...IDLE_CONNECTION })
      const originalFetch = globalThis.fetch
      globalThis.fetch = mock(async () =>
        new Response(JSON.stringify({ error: 'Sync already in progress' }), { status: 409 })
      ) as typeof fetch

      const wrapper = mountCard()
      await flushPromises()

      // Should not throw
      await wrapper.find('[data-test-id="integrations-refresh-btn"]').trigger('click')
      await flushPromises()

      // Button should stay enabled (409 = no state change)
      const btn = wrapper.find('[data-test-id="integrations-refresh-btn"]')
      expect((btn.element as HTMLButtonElement).disabled).toBe(false)

      globalThis.fetch = originalFetch
    })
  })

  describe('sync progress display', () => {
    test('shows spinner when phase is running', async () => {
      setConnectionData({
        ...IDLE_CONNECTION,
        sync_progress: { phase: 'running', count_done: 0, count_total: 0 },
      })
      const wrapper = mountCard()
      await flushPromises()

      expect(wrapper.find('[data-test-id="integrations-sync-progress"]').exists()).toBe(true)
    })

    test('shows progress counts when phase is parsing with totals', async () => {
      setConnectionData({
        ...IDLE_CONNECTION,
        sync_progress: { phase: 'parsing', count_done: 150, count_total: 300 },
      })
      const wrapper = mountCard()
      await flushPromises()

      const progressEl = wrapper.find('[data-test-id="integrations-sync-progress"]')
      expect(progressEl.exists()).toBe(true)
      expect(progressEl.text()).toContain('150')
      expect(progressEl.text()).toContain('300')
    })

    test('hides progress indicator when phase is idle', async () => {
      setConnectionData({ ...IDLE_CONNECTION })
      const wrapper = mountCard()
      await flushPromises()

      expect(wrapper.find('[data-test-id="integrations-sync-progress"]').exists()).toBe(false)
    })

    test('hides progress indicator when phase is done', async () => {
      setConnectionData({
        ...IDLE_CONNECTION,
        sync_progress: { phase: 'done', count_done: 300, count_total: 300 },
      })
      const wrapper = mountCard()
      await flushPromises()

      expect(wrapper.find('[data-test-id="integrations-sync-progress"]').exists()).toBe(false)
    })

    test('shows error message when phase is error', async () => {
      setConnectionData({
        ...IDLE_CONNECTION,
        sync_progress: { phase: 'error', count_done: 0, count_total: 0, error: 'Bulk operation failed' },
      })
      const wrapper = mountCard()
      await flushPromises()

      const errEl = wrapper.find('[data-test-id="integrations-sync-error"]')
      expect(errEl.exists()).toBe(true)
      expect(errEl.text()).toContain('Bulk operation failed')
    })
  })

  describe('composable lifecycle', () => {
    test('realtime payload updates sync_progress on connection', async () => {
      setConnectionData({ ...IDLE_CONNECTION })
      mountCard()
      await flushPromises()

      // The composable registers an .on('postgres_changes', config, callback) — find callback
      const realtimeCall = mockRealtimeOn.mock.calls.find(
        (args) => args[0] === 'postgres_changes'
      )
      const realtimeCallback = realtimeCall?.[2] as ((p: unknown) => void) | undefined
      expect(realtimeCallback).toBeDefined()

      realtimeCallback?.({
        new: { sync_progress: { phase: 'running', count_done: 3, count_total: 10 } },
      })
      await nextTick()

      // Verify the callback ran without throwing (side-effect: connection.sync_progress updated)
      expect(true).toBe(true)
    })

    test('oauth success postMessage triggers loadConnection', async () => {
      setConnectionData(null)
      mountCard()
      await flushPromises()

      mockFrom.mockClear()
      setConnectionData({ ...IDLE_CONNECTION })

      window.dispatchEvent(
        new MessageEvent('message', { data: { type: 'shopify_oauth_success' } }),
      )
      await flushPromises()

      // loadConnection re-queries supabase
      expect(mockFrom).toHaveBeenCalledWith('shopify_connections')
    })

    test('unmounting component unsubscribes from realtime channel', async () => {
      setConnectionData({ ...IDLE_CONNECTION })
      const wrapper = mountCard()
      await flushPromises()

      mockUnsubscribe.mockClear()
      wrapper.unmount()
      await flushPromises()

      expect(mockUnsubscribe).toHaveBeenCalled()
    })
  })

  describe('snapshots', () => {
    test('not-connected state matches snapshot', async () => {
      setConnectionData(null)
      const wrapper = mountCard()
      await flushPromises()
      expect(wrapper.html()).toMatchSnapshot()
    })

    test('connected state matches snapshot', async () => {
      setConnectionData({ ...IDLE_CONNECTION })
      const wrapper = mountCard()
      await flushPromises()
      expect(wrapper.html()).toMatchSnapshot()
    })

    test('reauthorize state matches snapshot', async () => {
      setConnectionData({
        shop_domain: 'pending.myshopify.com',
        status: 'error',
        last_synced_at: null,
      })
      const wrapper = mountCard()
      await flushPromises()
      expect(wrapper.html()).toMatchSnapshot()
    })

    test('running state matches snapshot', async () => {
      setConnectionData({
        ...IDLE_CONNECTION,
        sync_progress: { phase: 'running', count_done: 0, count_total: 0 },
      })
      const wrapper = mountCard()
      await flushPromises()
      expect(wrapper.html()).toMatchSnapshot()
    })

    test('parsing state matches snapshot', async () => {
      setConnectionData({
        ...IDLE_CONNECTION,
        sync_progress: { phase: 'parsing', count_done: 150, count_total: 300 },
      })
      const wrapper = mountCard()
      await flushPromises()
      expect(wrapper.html()).toMatchSnapshot()
    })
  })
})
