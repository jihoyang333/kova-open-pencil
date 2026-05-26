import { describe, test, expect, beforeEach, mock } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'
import { ref } from 'vue'
import * as vueuse from '@vueuse/core'

// B-MED7: replace wall-clock debounce with a passthrough so search commits
// synchronously. VueUse's debounce timing is verified by its own test suite.
mock.module('@vueuse/core', () => ({
  ...vueuse,
  useDebounceFn: <T extends (...args: never[]) => unknown>(fn: T) => fn,
}))

mock.module('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          is: async () => ({ data: [], error: null }),
        }),
      }),
    }),
  },
}))
mock.module('@/stores/auth', () => ({
  useAuthStore: () => ({ user: { id: 'user-test' } }),
}))

const { useFileGrid } = await import('@/composables/use-file-grid')
const { useDashboardStore } = await import('@/stores/dashboard')

describe('useFileGrid', () => {
  beforeEach(() => setActivePinia(createPinia()))

  test('search commits to dashboard store (debounce stubbed)', () => {
    const brandId = ref('b1')
    const { search } = useFileGrid(brandId)
    const dash = useDashboardStore()
    search('Spring')
    expect(dash.searchQuery).toBe('Spring')
  })

  test('isEmpty true when no canvases AND no search', () => {
    const brandId = ref('b1')
    const { isEmpty } = useFileGrid(brandId)
    expect(isEmpty.value).toBe(true)
  })

  test('hasSearchQuery true when search has value', () => {
    const brandId = ref('b1')
    const { search, hasSearchQuery } = useFileGrid(brandId)
    search('foo')
    expect(hasSearchQuery.value).toBe(true)
  })

  test('setSort updates dashboard store', () => {
    const brandId = ref('b1')
    const { setSort } = useFileGrid(brandId)
    setSort('name')
    expect(useDashboardStore().sortMode).toBe('name')
  })

  test('setView updates dashboard store AND ui-state singleton (persist per device)', async () => {
    const brandId = ref('b1')
    const { setView } = useFileGrid(brandId)
    setView('list')
    const dash = useDashboardStore()
    const { useUIStateStore } = await import('@/stores/ui-state')
    const ui = useUIStateStore()
    expect(dash.viewMode).toBe('list')
    expect(ui.fileGridViewMode).toBe('list')
  })
})
