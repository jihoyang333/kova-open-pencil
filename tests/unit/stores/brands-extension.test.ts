import { describe, test, expect, beforeEach, mock } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'
import { nextTick } from 'vue'

// useVueUse dispatches a StorageEvent after write; bun's window lacks the
// global. Polyfill so the writer doesn't throw and abort the test mid-flush.
if (typeof (globalThis as { StorageEvent?: unknown }).StorageEvent === 'undefined') {
  ;(globalThis as { StorageEvent: typeof CustomEvent }).StorageEvent = CustomEvent
}

// PRD 02 §6.2.1 + Plan T05 — extend useBrandsStore with:
//   - selectedBrandId persistence to kova:ui:last-brand (C-MED8 shared singleton)
//   - sortedActiveBrands getter (filter archived)
//   - ensureSelectedBrand action (fallback to most-recent active brand)

// Stub supabase BEFORE importing the store so fetchBrands inside
// ensureSelectedBrand never touches the network.
const mockBrandsRef: { value: Array<{ id: string; updated_at: string; archived_at?: string | null; name?: string }> } = {
  value: [],
}

mock.module('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: async () => ({ data: mockBrandsRef.value, error: null }),
    }),
  },
}))
mock.module('@/stores/auth', () => ({
  useAuthStore: () => ({ user: { id: 'user-1' } }),
}))

// Top-level imports so the module-scope singleton refs stay shared across tests
// (otherwise the C-MED8 contract — one ref backing both stores — cannot be
// verified).
const { useBrandsStore } = await import('@/stores/brands')
const { useUIStateStore, lastActiveBrandIdRef } = await import('@/stores/ui-state')

describe('useBrandsStore — selectedBrandId persistence + ensureSelectedBrand', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    // useLocalStorage caches the in-memory value across tests; reset the
    // singleton ref so each test starts from a known state.
    lastActiveBrandIdRef.value = null
    mockBrandsRef.value = []
  })

  test('selectBrand writes through to the kova:ui:last-brand singleton ref', () => {
    // The singleton ref is backed by useLocalStorage('kova:ui:last-brand', ...)
    // so a write here is what propagates to localStorage. The async watcher
    // flush + happy-dom's missing StorageEvent global make the
    // round-trip-through-localStorage assertion flaky in unit-test land; the
    // browser integration test (T39) gates that path. Here we verify the
    // contract at the level Kova owns — the ref mutation itself.
    const store = useBrandsStore()
    store.selectBrand('brand-77')
    expect(store.selectedBrandId).toBe('brand-77')
    expect(lastActiveBrandIdRef.value).toBe('brand-77')
  })

  test('ensureSelectedBrand returns null when user has no brands', async () => {
    const store = useBrandsStore()
    const result = await store.ensureSelectedBrand()
    expect(result).toBeNull()
    expect(store.selectedBrandId).toBeNull()
  })

  test('ensureSelectedBrand falls back to most-recent brand when selectedBrandId is stale', async () => {
    lastActiveBrandIdRef.value = 'missing-id'
    mockBrandsRef.value = [
      { id: 'b1', name: 'B1', updated_at: '2026-05-01' },
      { id: 'b2', name: 'B2', updated_at: '2026-05-10' },
    ]
    const store = useBrandsStore()
    const result = await store.ensureSelectedBrand()
    expect(result?.id).toBe('b2')
    expect(store.selectedBrandId).toBe('b2')
  })

  test('ensureSelectedBrand keeps a still-valid selectedBrandId', async () => {
    lastActiveBrandIdRef.value = 'b1'
    mockBrandsRef.value = [
      { id: 'b1', name: 'B1', updated_at: '2026-05-01' },
      { id: 'b2', name: 'B2', updated_at: '2026-05-10' },
    ]
    const store = useBrandsStore()
    const result = await store.ensureSelectedBrand()
    expect(result?.id).toBe('b1')
  })

  test('sortedActiveBrands filters archived brands and orders by updated_at DESC', () => {
    const store = useBrandsStore()
    store.brands = [
      { id: 'b1', name: 'B1', updated_at: '2026-04-01', archived_at: '2026-04-15' },
      { id: 'b2', name: 'B2', updated_at: '2026-05-01', archived_at: null },
      { id: 'b3', name: 'B3', updated_at: '2026-05-20', archived_at: null },
    ] as unknown as typeof store.brands
    expect(store.sortedActiveBrands.map((b: { id: string }) => b.id)).toEqual(['b3', 'b2'])
  })

  test('C-MED8: useBrandsStore.selectedBrandId and useUIStateStore.lastActiveBrandId share one ref', () => {
    const brands = useBrandsStore()
    const ui = useUIStateStore()
    brands.selectBrand('shared-brand-id')
    expect(ui.lastActiveBrandId).toBe('shared-brand-id')
    ui.setLastActiveBrandId('flipped-id')
    expect(brands.selectedBrandId).toBe('flipped-id')
  })
})
