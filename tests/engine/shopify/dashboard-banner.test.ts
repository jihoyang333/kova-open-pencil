import { beforeEach, describe, expect, mock, test } from 'bun:test'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'

import { BANNER_DISMISS_KEY } from '../../../src/utils/shopify-banner'

// --- Stable localStorage fixture (replaces undefined bare `localStorage` in Bun) ---
const _ls: Record<string, string> = {}
const mockLocalStorage: Storage = {
  getItem: (k) => _ls[k] ?? null,
  setItem: (k, v) => {
    _ls[k] = v
  },
  removeItem: (k) => {
    delete _ls[k]
  },
  clear: () => {
    for (const k of Object.keys(_ls)) delete _ls[k]
  },
  key: (i) => Object.keys(_ls)[i] ?? null,
  get length() {
    return Object.keys(_ls).length
  },
}
;(globalThis as Record<string, unknown>).localStorage = mockLocalStorage

// --- Supabase mock (before component import) ---
let _brandsData: Record<string, unknown>[] = []
let _connectionsData: Record<string, unknown>[] = []

const mockIn = mock(() => Promise.resolve({ data: _connectionsData, error: null }))
const mockConnectionsEq = mock(() => ({ in: mockIn }))
const mockConnectionsSelect = mock(() => ({ eq: mockConnectionsEq }))
const mockBrandsSelect = mock(() => Promise.resolve({ data: _brandsData, error: null }))
const mockFrom = mock((table: string) => {
  if (table === 'brands') return { select: mockBrandsSelect }
  return { select: mockConnectionsSelect }
})

mock.module('@/lib/supabase', () => ({
  supabase: { from: mockFrom },
  getSupabase: () => ({ from: mockFrom }),
}))

// --- Component import (after mocks are registered) ---
const { default: DashboardView } = await import('@/views/DashboardView.vue')

// --- Helpers ---
function makeDashboardRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/dashboard', component: { template: '<div />' } },
      { path: '/dashboard/:brandId', component: { template: '<div />' } },
    ],
  })
}

function mountDashboard() {
  const pinia = createPinia()
  setActivePinia(pinia)
  return mount(DashboardView, {
    global: {
      plugins: [pinia, makeDashboardRouter()],
      stubs: {
        AccountMenu: true,
        BrandList: true,
        EmptyState: true,
        RouterView: true,
        RouterLink: true,
      },
    },
  })
}

// --- Tests ---
describe('DashboardView Shopify banner', () => {
  beforeEach(() => {
    _brandsData = []
    _connectionsData = []
    mockFrom.mockClear()
    mockBrandsSelect.mockClear()
    mockIn.mockClear()
    mockLocalStorage.clear()
  })

  test('shows banner when a brand has no Shopify connection and localStorage has no dismiss key', async () => {
    _brandsData = [{ id: 'brand-1', name: 'Brand 1' }]
    _connectionsData = []

    const wrapper = mountDashboard()
    await flushPromises()

    expect(wrapper.find('[data-test-id="shopify-banner"]').exists()).toBe(true)
  })

  test('hides banner when localStorage has a recent dismiss timestamp (within 30-day cooldown)', async () => {
    _brandsData = [{ id: 'brand-1', name: 'Brand 1' }]
    _connectionsData = []
    mockLocalStorage.setItem(BANNER_DISMISS_KEY, String(Date.now()))

    const wrapper = mountDashboard()
    await flushPromises()

    expect(wrapper.find('[data-test-id="shopify-banner"]').exists()).toBe(false)
  })

  test('hides banner when all brands have active Shopify connections', async () => {
    _brandsData = [{ id: 'brand-1', name: 'Brand 1' }]
    _connectionsData = [{ brand_id: 'brand-1' }]

    const wrapper = mountDashboard()
    await flushPromises()

    expect(wrapper.find('[data-test-id="shopify-banner"]').exists()).toBe(false)
  })

  test('hides banner when no brands exist', async () => {
    _brandsData = []
    _connectionsData = []

    const wrapper = mountDashboard()
    await flushPromises()

    expect(wrapper.find('[data-test-id="shopify-banner"]').exists()).toBe(false)
  })

  test('dismiss button hides banner and writes timestamp to localStorage', async () => {
    _brandsData = [{ id: 'brand-1', name: 'Brand 1' }]
    _connectionsData = []

    const wrapper = mountDashboard()
    await flushPromises()

    expect(wrapper.find('[data-test-id="shopify-banner"]').exists()).toBe(true)
    await wrapper.find('[data-test-id="shopify-banner-dismiss"]').trigger('click')
    expect(wrapper.find('[data-test-id="shopify-banner"]').exists()).toBe(false)
    expect(mockLocalStorage.getItem(BANNER_DISMISS_KEY)).not.toBeNull()
  })
})
