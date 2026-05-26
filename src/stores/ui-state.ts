import { defineStore } from 'pinia'
import { useLocalStorage } from '@vueuse/core'

// C-MED8 — refs that are also consumed by sibling stores (currently
// `useBrandsStore.selectedBrandId`) live at module scope so every consumer
// shares ONE underlying `useLocalStorage` ref. Two separate `useLocalStorage`
// instances on the same key were not synchronized in-tab.
export const lastActiveBrandIdRef = useLocalStorage<string | null>('kova:ui:last-brand', null)
export const lastActiveCanvasIdRef = useLocalStorage<string | null>('kova:ui:last-canvas', null)
export const fileGridViewModeRef = useLocalStorage<'grid' | 'list'>('kova:ui:file-grid-view', 'grid')

export const useUIStateStore = defineStore('ui-state', () => {
  const pagesCollapsed = useLocalStorage<boolean>('kova:ui:pages-collapsed', false)
  const layersCollapsed = useLocalStorage<boolean>('kova:ui:layers-collapsed', false)
  const sidebarLeftWidth = useLocalStorage<number>('kova:ui:sidebar-left-width', 240)
  const sidebarRightWidth = useLocalStorage<number>('kova:ui:sidebar-right-width', 264)
  const recentColors = useLocalStorage<string[]>('kova:ui:recent-colors', [])
  const dismissedToasts = useLocalStorage<string[]>('kova:ui:dismissed-toasts', [])

  // Shared module-scope singletons (C-MED8).
  const lastActiveBrandId = lastActiveBrandIdRef
  const lastActiveCanvasId = lastActiveCanvasIdRef
  const fileGridViewMode = fileGridViewModeRef

  // Normalize to lowercase so '#FF00AA' and '#ff00aa' dedupe as a single
  // entry. Hex is case-insensitive — downstream consumers must not rely on
  // round-trip case preservation.
  function pushRecentColor(hex: string): void {
    const next = hex.toLowerCase()
    const filtered = recentColors.value.filter((c) => c.toLowerCase() !== next)
    recentColors.value = [next, ...filtered].slice(0, 12)
  }

  function dismissToast(toastId: string): void {
    if (dismissedToasts.value.includes(toastId)) return
    dismissedToasts.value = [...dismissedToasts.value, toastId]
  }

  // B-HIGH14 — sanctioned mutation paths.
  function setLastActiveBrandId(id: string | null): void {
    lastActiveBrandId.value = id
  }

  function setLastActiveCanvasId(id: string | null): void {
    lastActiveCanvasId.value = id
  }

  function setFileGridViewMode(mode: 'grid' | 'list'): void {
    fileGridViewMode.value = mode
  }

  return {
    pagesCollapsed,
    layersCollapsed,
    sidebarLeftWidth,
    sidebarRightWidth,
    recentColors,
    lastActiveBrandId,
    lastActiveCanvasId,
    fileGridViewMode,
    dismissedToasts,
    pushRecentColor,
    dismissToast,
    setLastActiveBrandId,
    setLastActiveCanvasId,
    setFileGridViewMode,
  }
})
