import { describe, test, expect, beforeEach } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'
import { useDashboardStore } from '@/stores/dashboard'
import { useCanvasesStore } from '@/stores/canvases'
import type { Canvas } from '@/types/kova/database'

describe('useDashboardStore', () => {
  beforeEach(() => setActivePinia(createPinia()))

  test('defaults', () => {
    const store = useDashboardStore()
    expect(store.searchQuery).toBe('')
    expect(store.sortMode).toBe('recent')
    expect(store.viewMode).toBe('grid')
    expect(store.showTrashed).toBe(false)
  })

  test('filteredCanvases applies case-insensitive search', () => {
    const canvases = useCanvasesStore()
    canvases.canvases = [
      { id: '1', name: 'Spring Drop', brand_id: 'b1', updated_at: '2026-05-10', created_at: '2026-05-01', trashed_at: null },
      { id: '2', name: 'Welcome flow', brand_id: 'b1', updated_at: '2026-05-09', created_at: '2026-05-01', trashed_at: null },
    ] as unknown as Canvas[]
    const store = useDashboardStore()
    store.setSearchQuery('SPRING')
    expect(store.filteredCanvases.map((c) => c.id)).toEqual(['1'])
  })

  test('filteredCanvases name sort alphabetizes', () => {
    const canvases = useCanvasesStore()
    canvases.canvases = [
      { id: '1', name: 'Zebra', brand_id: 'b1', updated_at: '2026-05-10', created_at: '2026-05-01', trashed_at: null },
      { id: '2', name: 'Alpha', brand_id: 'b1', updated_at: '2026-05-09', created_at: '2026-05-01', trashed_at: null },
    ] as unknown as Canvas[]
    const store = useDashboardStore()
    store.setSortMode('name')
    expect(store.filteredCanvases.map((c) => c.name)).toEqual(['Alpha', 'Zebra'])
  })

  test('filteredCanvases created sort uses created_at DESC', () => {
    const canvases = useCanvasesStore()
    canvases.canvases = [
      { id: '1', name: 'A', brand_id: 'b1', updated_at: '2026-05-10', created_at: '2026-05-01', trashed_at: null },
      { id: '2', name: 'B', brand_id: 'b1', updated_at: '2026-05-09', created_at: '2026-05-05', trashed_at: null },
    ] as unknown as Canvas[]
    const store = useDashboardStore()
    store.setSortMode('created')
    expect(store.filteredCanvases.map((c) => c.id)).toEqual(['2', '1'])
  })

  test('filteredCanvases respects showTrashed toggle', () => {
    const canvases = useCanvasesStore()
    canvases.canvases = [
      { id: '1', name: 'Live', brand_id: 'b1', updated_at: '2026-05-10', created_at: '2026-05-01', trashed_at: null },
    ] as unknown as Canvas[]
    canvases.trashedCanvases = [
      { id: '99', name: 'Trashed', brand_id: 'b1', updated_at: '2026-05-09', created_at: '2026-05-01', trashed_at: '2026-05-10' },
    ] as unknown as Canvas[]
    const store = useDashboardStore()
    store.setShowTrashed(true)
    expect(store.filteredCanvases.map((c) => c.id)).toEqual(['99'])
  })

  test('resetForBrand wipes search + sort but preserves viewMode', () => {
    const store = useDashboardStore()
    store.setSearchQuery('foo')
    store.setSortMode('name')
    store.setViewMode('list')
    store.resetForBrand()
    expect(store.searchQuery).toBe('')
    expect(store.sortMode).toBe('recent')
    expect(store.viewMode).toBe('list')
  })

  test('B-HIGH14: setSearchQuery is the sanctioned mutation path', () => {
    const store = useDashboardStore()
    store.setSearchQuery('hello')
    expect(store.searchQuery).toBe('hello')
  })
})
