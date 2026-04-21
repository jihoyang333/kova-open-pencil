import { describe, test, expect, beforeEach, mock } from 'bun:test'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, inject, provide, ref } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import type { ConnectionState, Connection } from '@/composables/use-shopify-connection'

// ---- Composable mock state ----
const mockState = ref<ConnectionState>('loading')
const mockConnection = ref<Connection | null>(null)
const mockIsSyncing = ref(false)
const mockIsDisconnecting = ref(false)
const mockHandleRefreshNow = mock(() => Promise.resolve())
const mockHandleDisconnect = mock(() => Promise.resolve())
const mockHandleReauthorize = mock(() => {})
const mockOpenOAuthPopup = mock((_shop: string) => {})

mock.module('@/composables/use-shopify-connection', () => ({
  useShopifyConnection: () => ({
    state: mockState,
    connection: mockConnection,
    isSyncing: mockIsSyncing,
    isDisconnecting: mockIsDisconnecting,
    handleRefreshNow: mockHandleRefreshNow,
    handleDisconnect: mockHandleDisconnect,
    handleReauthorize: mockHandleReauthorize,
    openOAuthPopup: mockOpenOAuthPopup,
    loadConnection: mock(() => Promise.resolve()),
    subscribeToSyncProgress: mock(() => {}),
    unsubscribe: mock(() => {}),
  }),
}))

// ---- Router mock ----
const mockRouterPush = mock((_path: string) => Promise.resolve())

mock.module('vue-router', () => ({
  useRoute: () => ({ params: { brandId: 'b1' } }),
  useRouter: () => ({ push: mockRouterPush }),
}))

// ---- Reka UI stubs ----
const Passthrough = defineComponent({
  inheritAttrs: false,
  setup(_, { slots }) { return () => slots.default?.() },
})
const DialogRootStub = defineComponent({
  props: { open: { type: Boolean, default: false } },
  setup(props, { slots }) { return () => props.open ? slots.default?.() : null },
})
const EmptyDiv = defineComponent({ setup() { return () => h('div') } })

// Accordion stubs — manage open/close via a shared ref + provide/inject
const accordionOpenRef = ref('')

const AccordionRootStub = defineComponent({
  props: { defaultValue: { type: String, default: '' }, collapsible: Boolean, type: String },
  setup(props, { slots }) {
    accordionOpenRef.value = props.defaultValue ?? ''
    return () => slots.default?.()
  },
})

const AccordionItemStub = defineComponent({
  props: { value: { type: String, required: true } },
  setup(props, { slots }) {
    provide('accordion-item', props.value)
    return () => slots.default?.()
  },
})

const AccordionTriggerStub = defineComponent({
  inheritAttrs: false,
  setup(_, { slots, attrs }) {
    const itemValue = inject('accordion-item', '')
    return () => h('button', {
      ...attrs,
      onClick: () => {
        accordionOpenRef.value = accordionOpenRef.value === itemValue ? '' : itemValue
      },
    }, slots.default?.())
  },
})

const AccordionContentStub = defineComponent({
  inheritAttrs: false,
  setup(_, { slots, attrs }) {
    const itemValue = inject('accordion-item', '')
    return () => accordionOpenRef.value === itemValue
      ? h('div', { ...attrs }, slots.default?.())
      : null
  },
})

mock.module('reka-ui', () => ({
  DialogRoot: DialogRootStub,
  DialogPortal: Passthrough,
  DialogOverlay: EmptyDiv,
  DialogContent: Passthrough,
  DialogTitle: Passthrough,
  DialogDescription: Passthrough,
  DialogClose: Passthrough,
  AccordionRoot: AccordionRootStub,
  AccordionItem: AccordionItemStub,
  AccordionTrigger: AccordionTriggerStub,
  AccordionContent: AccordionContentStub,
}))

// ---- Import after mocks ----
const { default: SettingsBrandIntegrationsView } = await import(
  '@/views/dashboard/SettingsBrandIntegrationsView.vue'
)

function mountView() {
  return mount(SettingsBrandIntegrationsView)
}

describe('SettingsBrandIntegrationsView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockState.value = 'loading'
    mockConnection.value = null
    mockIsSyncing.value = false
    mockIsDisconnecting.value = false
    mockHandleRefreshNow.mockClear()
    mockHandleDisconnect.mockClear()
    mockHandleReauthorize.mockClear()
    mockOpenOAuthPopup.mockClear()
    mockRouterPush.mockClear()
    accordionOpenRef.value = ''
  })

  // --- Loading ---
  test('shows loading spinner when state is loading', () => {
    mockState.value = 'loading'
    const wrapper = mountView()
    expect(wrapper.find('[data-test-id="integrations-loading"]').exists()).toBe(true)
  })

  // --- Not connected ---
  test('shows not-connected section when state is not-connected', () => {
    mockState.value = 'not-connected'
    const wrapper = mountView()
    expect(wrapper.find('[data-test-id="integrations-not-connected"]').exists()).toBe(true)
  })

  test('connect button reveals shop domain input', async () => {
    mockState.value = 'not-connected'
    const wrapper = mountView()
    await wrapper.find('[data-test-id="integrations-connect-btn"]').trigger('click')
    expect(wrapper.find('[data-test-id="integrations-shop-input"]').exists()).toBe(true)
  })

  test('invalid domain shows error and does not call openOAuthPopup', async () => {
    mockState.value = 'not-connected'
    const wrapper = mountView()
    await wrapper.find('[data-test-id="integrations-connect-btn"]').trigger('click')
    await wrapper.find('[data-test-id="integrations-shop-input"]').setValue('not-a-valid-domain')
    await wrapper.find('[data-test-id="integrations-confirm-connect"]').trigger('click')
    expect(wrapper.find('[data-test-id="integrations-connect-error"]').exists()).toBe(true)
    expect(mockOpenOAuthPopup).not.toHaveBeenCalled()
  })

  test('valid domain calls openOAuthPopup with normalized domain', async () => {
    mockState.value = 'not-connected'
    const wrapper = mountView()
    await wrapper.find('[data-test-id="integrations-connect-btn"]').trigger('click')
    await wrapper.find('[data-test-id="integrations-shop-input"]').setValue('my-shop.myshopify.com')
    await wrapper.find('[data-test-id="integrations-confirm-connect"]').trigger('click')
    expect(mockOpenOAuthPopup).toHaveBeenCalledWith('my-shop.myshopify.com')
  })

  // --- Connected ---
  test('shows connected section when state is connected', () => {
    mockState.value = 'connected'
    mockConnection.value = {
      shop_domain: 'fern-co.myshopify.com',
      last_synced_at: '2026-04-21T10:00:00Z',
      sync_progress: { phase: 'done', count_done: 243, count_total: 243 },
      scopes: ['read_products', 'read_themes'],
      product_count: 243,
    }
    const wrapper = mountView()
    expect(wrapper.find('[data-test-id="integrations-connected"]').exists()).toBe(true)
  })

  test('renders shop domain in connected state', () => {
    mockState.value = 'connected'
    mockConnection.value = {
      shop_domain: 'fern-co.myshopify.com',
      last_synced_at: null,
      sync_progress: { phase: 'done', count_done: 0, count_total: 0 },
      scopes: [],
      product_count: 0,
    }
    const wrapper = mountView()
    expect(wrapper.find('[data-test-id="integrations-shop-domain"]').text()).toBe('fern-co.myshopify.com')
  })

  test('renders product count in connected state', () => {
    mockState.value = 'connected'
    mockConnection.value = {
      shop_domain: 'fern-co.myshopify.com',
      last_synced_at: null,
      sync_progress: { phase: 'done', count_done: 0, count_total: 0 },
      scopes: [],
      product_count: 42,
    }
    const wrapper = mountView()
    expect(wrapper.find('[data-test-id="integrations-product-count"]').text()).toContain('42')
  })

  test('shows "No products synced" when product count is 0', () => {
    mockState.value = 'connected'
    mockConnection.value = {
      shop_domain: 'fern-co.myshopify.com',
      last_synced_at: null,
      sync_progress: { phase: 'idle', count_done: 0, count_total: 0 },
      scopes: [],
      product_count: 0,
    }
    const wrapper = mountView()
    expect(wrapper.find('[data-test-id="integrations-product-count"]').text()).toBe('No products synced')
  })

  test('renders scope chips for each scope', () => {
    mockState.value = 'connected'
    mockConnection.value = {
      shop_domain: 'fern-co.myshopify.com',
      last_synced_at: null,
      sync_progress: { phase: 'done', count_done: 0, count_total: 0 },
      scopes: ['read_products', 'read_themes', 'read_orders'],
      product_count: 0,
    }
    const wrapper = mountView()
    const scopes = wrapper.find('[data-test-id="integrations-scopes"]')
    expect(scopes.exists()).toBe(true)
    expect(scopes.text()).toContain('products')
    expect(scopes.text()).toContain('themes')
    expect(scopes.text()).toContain('orders')
  })

  test('refresh button calls handleRefreshNow', async () => {
    mockState.value = 'connected'
    mockConnection.value = {
      shop_domain: 'fern-co.myshopify.com',
      last_synced_at: null,
      sync_progress: { phase: 'idle', count_done: 0, count_total: 0 },
      scopes: [],
      product_count: 0,
    }
    const wrapper = mountView()
    await wrapper.find('[data-test-id="integrations-refresh-btn"]').trigger('click')
    expect(mockHandleRefreshNow).toHaveBeenCalledTimes(1)
  })

  test('brand kit button navigates to brand settings', async () => {
    mockState.value = 'connected'
    mockConnection.value = {
      shop_domain: 'fern-co.myshopify.com',
      last_synced_at: null,
      sync_progress: { phase: 'idle', count_done: 0, count_total: 0 },
      scopes: [],
      product_count: 0,
    }
    const wrapper = mountView()
    await wrapper.find('[data-test-id="integrations-brand-kit-btn"]').trigger('click')
    expect(mockRouterPush).toHaveBeenCalledWith('/dashboard/b1/settings')
  })

  test('disconnect button opens confirmation modal', async () => {
    mockState.value = 'connected'
    mockConnection.value = {
      shop_domain: 'fern-co.myshopify.com',
      last_synced_at: null,
      sync_progress: { phase: 'idle', count_done: 0, count_total: 0 },
      scopes: [],
      product_count: 0,
    }
    const wrapper = mountView()
    await wrapper.find('[data-test-id="integrations-disconnect-btn"]').trigger('click')
    expect(wrapper.find('[data-test-id="integrations-disconnect-confirm"]').exists()).toBe(true)
  })

  test('confirming disconnect calls handleDisconnect', async () => {
    mockState.value = 'connected'
    mockConnection.value = {
      shop_domain: 'fern-co.myshopify.com',
      last_synced_at: null,
      sync_progress: { phase: 'idle', count_done: 0, count_total: 0 },
      scopes: [],
      product_count: 0,
    }
    const wrapper = mountView()
    await wrapper.find('[data-test-id="integrations-disconnect-btn"]').trigger('click')
    await wrapper.find('[data-test-id="integrations-disconnect-confirm"]').trigger('click')
    await flushPromises()
    expect(mockHandleDisconnect).toHaveBeenCalledTimes(1)
  })

  test('cancelling disconnect does not call handleDisconnect', async () => {
    mockState.value = 'connected'
    mockConnection.value = {
      shop_domain: 'fern-co.myshopify.com',
      last_synced_at: null,
      sync_progress: { phase: 'idle', count_done: 0, count_total: 0 },
      scopes: [],
      product_count: 0,
    }
    const wrapper = mountView()
    await wrapper.find('[data-test-id="integrations-disconnect-btn"]').trigger('click')
    await wrapper.find('[data-test-id="integrations-disconnect-cancel"]').trigger('click')
    expect(mockHandleDisconnect).not.toHaveBeenCalled()
  })

  test('disconnect dialog shows exact §8.5 copy', async () => {
    mockState.value = 'connected'
    mockConnection.value = {
      shop_domain: 'fern-co.myshopify.com',
      last_synced_at: null,
      sync_progress: { phase: 'idle', count_done: 0, count_total: 0 },
      scopes: [],
      product_count: 0,
    }
    const wrapper = mountView()
    await wrapper.find('[data-test-id="integrations-disconnect-btn"]').trigger('click')
    const html = wrapper.html()
    expect(html).toContain('Your emails stay')
    expect(html).toContain('Products will show as unavailable until you reconnect')
    expect(html).toContain("We'll delete your store data in 30 days unless you reconnect")
    expect(html).toContain('To fully uninstall Kova from Shopify admin')
  })

  test('disconnect dialog deep link points to correct shop admin URL', async () => {
    mockState.value = 'connected'
    mockConnection.value = {
      shop_domain: 'fern-co.myshopify.com',
      last_synced_at: null,
      sync_progress: { phase: 'idle', count_done: 0, count_total: 0 },
      scopes: [],
      product_count: 0,
    }
    const wrapper = mountView()
    await wrapper.find('[data-test-id="integrations-disconnect-btn"]').trigger('click')
    const link = wrapper.find('[data-test-id="integrations-disconnect-admin-link"]')
    expect(link.exists()).toBe(true)
    expect(link.attributes('href')).toBe('https://fern-co.myshopify.com/admin/apps')
    expect(link.attributes('target')).toBe('_blank')
    expect(link.attributes('rel')).toContain('noopener')
  })

  test('shows sync progress when isSyncing is true', () => {
    mockState.value = 'connected'
    mockIsSyncing.value = true
    mockConnection.value = {
      shop_domain: 'fern-co.myshopify.com',
      last_synced_at: null,
      sync_progress: { phase: 'running', count_done: 0, count_total: 0 },
      scopes: [],
      product_count: 0,
    }
    const wrapper = mountView()
    expect(wrapper.find('[data-test-id="integrations-sync-progress"]').exists()).toBe(true)
  })

  test('shows spinner text when syncing in running phase', () => {
    mockState.value = 'connected'
    mockIsSyncing.value = true
    mockConnection.value = {
      shop_domain: 'fern-co.myshopify.com',
      last_synced_at: null,
      sync_progress: { phase: 'running', count_done: 0, count_total: 0 },
      scopes: [],
      product_count: 0,
    }
    const wrapper = mountView()
    expect(wrapper.find('[data-test-id="integrations-sync-progress"]').text()).toContain('Syncing your products…')
    expect(wrapper.find('[data-test-id="integrations-sync-bar"]').exists()).toBe(false)
  })

  test('shows progress bar when phase is parsing and count_total > 0', () => {
    mockState.value = 'connected'
    mockIsSyncing.value = true
    mockConnection.value = {
      shop_domain: 'fern-co.myshopify.com',
      last_synced_at: null,
      sync_progress: { phase: 'parsing', count_done: 50, count_total: 200 },
      scopes: [],
      product_count: 0,
    }
    const wrapper = mountView()
    expect(wrapper.find('[data-test-id="integrations-sync-bar"]').exists()).toBe(true)
  })

  test('progress bar shows count_done / count_total', () => {
    mockState.value = 'connected'
    mockIsSyncing.value = true
    mockConnection.value = {
      shop_domain: 'fern-co.myshopify.com',
      last_synced_at: null,
      sync_progress: { phase: 'parsing', count_done: 75, count_total: 300 },
      scopes: [],
      product_count: 0,
    }
    const wrapper = mountView()
    expect(wrapper.find('[data-test-id="integrations-sync-count"]').text()).toContain('75')
    expect(wrapper.find('[data-test-id="integrations-sync-count"]').text()).toContain('300')
  })

  test('progress bar has correct aria attributes', () => {
    mockState.value = 'connected'
    mockIsSyncing.value = true
    mockConnection.value = {
      shop_domain: 'fern-co.myshopify.com',
      last_synced_at: null,
      sync_progress: { phase: 'parsing', count_done: 40, count_total: 100 },
      scopes: [],
      product_count: 0,
    }
    const wrapper = mountView()
    const bar = wrapper.find('[data-test-id="integrations-sync-bar"]')
    expect(bar.attributes('aria-valuenow')).toBe('40')
    expect(bar.attributes('aria-valuemax')).toBe('100')
  })

  test('shows spinner not progress bar when parsing but count_total is 0', () => {
    mockState.value = 'connected'
    mockIsSyncing.value = true
    mockConnection.value = {
      shop_domain: 'fern-co.myshopify.com',
      last_synced_at: null,
      sync_progress: { phase: 'parsing', count_done: 0, count_total: 0 },
      scopes: [],
      product_count: 0,
    }
    const wrapper = mountView()
    expect(wrapper.find('[data-test-id="integrations-sync-bar"]').exists()).toBe(false)
    expect(wrapper.find('[data-test-id="integrations-sync-progress"]').text()).toContain('Syncing your products…')
  })

  test('shows sync error banner when phase is error', () => {
    mockState.value = 'connected'
    mockConnection.value = {
      shop_domain: 'fern-co.myshopify.com',
      last_synced_at: null,
      sync_progress: { phase: 'error', count_done: 0, count_total: 0, error: 'Bulk op failed' },
      scopes: [],
      product_count: 0,
    }
    const wrapper = mountView()
    const banner = wrapper.find('[data-test-id="integrations-sync-error"]')
    expect(banner.exists()).toBe(true)
    expect(banner.text()).toContain('Bulk op failed')
  })

  test('sync error banner shows fallback message when no error string', () => {
    mockState.value = 'connected'
    mockConnection.value = {
      shop_domain: 'fern-co.myshopify.com',
      last_synced_at: null,
      sync_progress: { phase: 'error', count_done: 0, count_total: 0 },
      scopes: [],
      product_count: 0,
    }
    const wrapper = mountView()
    expect(wrapper.find('[data-test-id="integrations-sync-error"]').text()).toContain('Sync failed')
  })


  // --- History section ---
  test('history section is collapsed by default', () => {
    mockState.value = 'not-connected'
    const wrapper = mountView()
    expect(wrapper.find('[data-test-id="integrations-history-content"]').exists()).toBe(false)
  })

  test('clicking history toggle expands the section', async () => {
    mockState.value = 'not-connected'
    const wrapper = mountView()
    await wrapper.find('[data-test-id="integrations-history-toggle"]').trigger('click')
    expect(wrapper.find('[data-test-id="integrations-history-content"]').exists()).toBe(true)
  })

  test('clicking history toggle again collapses the section', async () => {
    mockState.value = 'not-connected'
    const wrapper = mountView()
    await wrapper.find('[data-test-id="integrations-history-toggle"]').trigger('click')
    await wrapper.find('[data-test-id="integrations-history-toggle"]').trigger('click')
    expect(wrapper.find('[data-test-id="integrations-history-content"]').exists()).toBe(false)
  })

  test('history shows "No history yet." when no history entries', async () => {
    mockState.value = 'not-connected'
    const wrapper = mountView()
    await wrapper.find('[data-test-id="integrations-history-toggle"]').trigger('click')
    expect(wrapper.find('[data-test-id="integrations-history-content"]').text()).toContain('No history yet.')
  })

  test('history shows event type for each entry', async () => {
    mockState.value = 'connected'
    mockConnection.value = {
      shop_domain: 'fern-co.myshopify.com',
      last_synced_at: null,
      sync_progress: { phase: 'idle', count_done: 0, count_total: 0 },
      scopes: [],
      product_count: 0,
      history: [
        { timestamp: '2026-04-21T10:00:00Z', event_type: 'connected' },
        { timestamp: '2026-04-20T09:00:00Z', event_type: 'disconnected' },
      ],
    }
    const wrapper = mountView()
    await wrapper.find('[data-test-id="integrations-history-toggle"]').trigger('click')
    const content = wrapper.find('[data-test-id="integrations-history-content"]')
    expect(content.text()).toContain('connected')
    expect(content.text()).toContain('disconnected')
  })

  test('history shows at most 10 rows when more than 10 entries exist', async () => {
    const manyEntries = Array.from({ length: 15 }, (_, i) => ({
      timestamp: `2026-04-${String(i + 1).padStart(2, '0')}T10:00:00Z`,
      event_type: 'connected' as const,
    }))
    mockState.value = 'connected'
    mockConnection.value = {
      shop_domain: 'fern-co.myshopify.com',
      last_synced_at: null,
      sync_progress: { phase: 'idle', count_done: 0, count_total: 0 },
      scopes: [],
      product_count: 0,
      history: manyEntries,
    }
    const wrapper = mountView()
    await wrapper.find('[data-test-id="integrations-history-toggle"]').trigger('click')
    expect(wrapper.findAll('[data-test-id="integrations-history-row"]').length).toBe(10)
  })

  // --- Reauthorize ---
  test('shows reauthorize section when state is reauthorize', () => {
    mockState.value = 'reauthorize'
    mockConnection.value = {
      shop_domain: 'fern-co.myshopify.com',
      last_synced_at: null,
      sync_progress: { phase: 'idle', count_done: 0, count_total: 0 },
      scopes: [],
      product_count: 0,
    }
    const wrapper = mountView()
    expect(wrapper.find('[data-test-id="integrations-reauthorize"]').exists()).toBe(true)
    expect(wrapper.find('[data-test-id="integrations-reauth-domain"]').text()).toBe('fern-co.myshopify.com')
  })

  test('reauthorize button calls handleReauthorize', async () => {
    mockState.value = 'reauthorize'
    mockConnection.value = {
      shop_domain: 'fern-co.myshopify.com',
      last_synced_at: null,
      sync_progress: { phase: 'idle', count_done: 0, count_total: 0 },
      scopes: [],
      product_count: 0,
    }
    const wrapper = mountView()
    await wrapper.find('[data-test-id="integrations-reauthorize-btn"]').trigger('click')
    expect(mockHandleReauthorize).toHaveBeenCalledTimes(1)
  })

  // --- Back navigation ---
  test('back button navigates to brand settings', async () => {
    mockState.value = 'loading'
    const wrapper = mountView()
    await wrapper.find('[data-test-id="integrations-back"]').trigger('click')
    expect(mockRouterPush).toHaveBeenCalledWith('/dashboard/b1/settings')
  })
})
