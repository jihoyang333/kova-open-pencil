// PRD 02 §6.3 + Plan T10 — file-grid driver.
// Wraps useDashboardStore + useCanvasesStore: debounced search, sort/view
// dispatch, and per-brand reset. View-mode change writes through to
// useUIStateStore so the preference persists per device.

import { computed, ref, watch, type ComputedRef, type Ref } from 'vue'
import { useDebounceFn } from '@vueuse/core'

import { useCanvasesStore } from '@/stores/canvases'
import { useDashboardStore, type SortMode, type ViewMode } from '@/stores/dashboard'
import { useUIStateStore } from '@/stores/ui-state'

import type { Canvas } from '@/types/kova/database'

const SEARCH_DEBOUNCE_MS = 200

export interface UseFileGrid {
  canvases: ComputedRef<Canvas[]>
  isLoading: Ref<boolean>
  isEmpty: ComputedRef<boolean>
  hasSearchQuery: ComputedRef<boolean>
  search: (q: string) => void
  setSort: (mode: SortMode) => void
  setView: (mode: ViewMode) => void
}

export function useFileGrid(brandId: Ref<string>): UseFileGrid {
  const canvasesStore = useCanvasesStore()
  const dash = useDashboardStore()
  const ui = useUIStateStore()
  const isLoading = ref(false)

  // H3 audit fix — sentinel guard so rapid brand-switches don't land stale
  // data or prematurely flip `isLoading` on the first-resolved fetch.
  watch(
    brandId,
    async (next, prev) => {
      if (next === prev) return
      if (!next) return
      const requested = next
      dash.resetForBrand()
      isLoading.value = true
      try {
        await canvasesStore.fetchCanvases(requested)
      } finally {
        if (brandId.value === requested) isLoading.value = false
      }
    },
    { immediate: true }
  )

  // B-HIGH14 — mutate store state only via actions.
  const debouncedSetSearch = useDebounceFn(
    (q: string) => dash.setSearchQuery(q),
    SEARCH_DEBOUNCE_MS
  )

  function search(q: string): void {
    void debouncedSetSearch(q)
  }

  function setSort(mode: SortMode): void {
    dash.setSortMode(mode)
  }

  function setView(mode: ViewMode): void {
    dash.setViewMode(mode)
    ui.setFileGridViewMode(mode)
  }

  const filtered = computed<Canvas[]>(() => dash.filteredCanvases)
  const isEmpty = computed(() => filtered.value.length === 0 && !dash.searchQuery.trim())
  const hasSearchQuery = computed(() => dash.searchQuery.trim().length > 0)

  return {
    canvases: filtered,
    isLoading,
    isEmpty,
    hasSearchQuery,
    search,
    setSort,
    setView,
  }
}
