// PRD 02 §6.2.2 + Plan T06 — per-dashboard-pane search / sort / view-mode.
// Resets per-brand on selectBrand(). viewMode is preserved (per-device pref).

import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { useCanvasesStore } from '@/stores/canvases'

import type { Canvas } from '@/types/kova/database'

export type SortMode = 'recent' | 'name' | 'created'
export type ViewMode = 'grid' | 'list'

export const useDashboardStore = defineStore('dashboard', () => {
  // State
  const searchQuery = ref('')
  const sortMode = ref<SortMode>('recent') // §12 RESOLVED-3 default
  const viewMode = ref<ViewMode>('grid') // A1 + 03 hi-fi default
  const showTrashed = ref(false)

  // Getters
  const filteredCanvases = computed<Canvas[]>(() => {
    const canvases = useCanvasesStore()
    const source = showTrashed.value ? canvases.sortedTrashed : canvases.sortedCanvases
    const q = searchQuery.value.trim().toLowerCase()
    const filtered = q ? source.filter((c) => c.name.toLowerCase().includes(q)) : source
    return applySortMode(filtered, sortMode.value)
  })

  function applySortMode(list: readonly Canvas[], mode: SortMode): Canvas[] {
    if (mode === 'name') {
      return [...list].sort((a, b) => a.name.localeCompare(b.name))
    }
    if (mode === 'created') {
      return [...list].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    }
    // 'recent' = sortedCanvases default (by updated_at DESC) — return as-is.
    return [...list]
  }

  // Actions — B-HIGH14 only mutate through setters
  function setSearchQuery(q: string): void {
    searchQuery.value = q
  }
  function setSortMode(mode: SortMode): void {
    sortMode.value = mode
  }
  function setViewMode(mode: ViewMode): void {
    viewMode.value = mode
  }
  function setShowTrashed(flag: boolean): void {
    showTrashed.value = flag
  }

  // Reset on brand-switch — viewMode survives as a per-device preference.
  function resetForBrand(): void {
    searchQuery.value = ''
    sortMode.value = 'recent'
    showTrashed.value = false
  }

  return {
    searchQuery,
    sortMode,
    viewMode,
    showTrashed,
    filteredCanvases,
    setSearchQuery,
    setSortMode,
    setViewMode,
    setShowTrashed,
    resetForBrand,
  }
})
