import { defineStore } from 'pinia'
import { useLocalStorage } from '@vueuse/core'

export const useUIStateStore = defineStore('ui-state', () => {
  const pagesCollapsed = useLocalStorage<boolean>('kova:ui:pages-collapsed', false)
  const layersCollapsed = useLocalStorage<boolean>('kova:ui:layers-collapsed', false)
  const sidebarLeftWidth = useLocalStorage<number>('kova:ui:sidebar-left-width', 240)
  const sidebarRightWidth = useLocalStorage<number>('kova:ui:sidebar-right-width', 264)
  const recentColors = useLocalStorage<string[]>('kova:ui:recent-colors', [])
  const lastActiveBrandId = useLocalStorage<string | null>('kova:ui:last-brand', null)
  const lastActiveCanvasId = useLocalStorage<string | null>('kova:ui:last-canvas', null)
  const dismissedToasts = useLocalStorage<string[]>('kova:ui:dismissed-toasts', [])

  function pushRecentColor(hex: string): void {
    const next = hex.toLowerCase()
    const filtered = recentColors.value.filter((c) => c.toLowerCase() !== next)
    recentColors.value = [next, ...filtered].slice(0, 12)
  }

  function dismissToast(toastId: string): void {
    if (dismissedToasts.value.includes(toastId)) return
    dismissedToasts.value = [...dismissedToasts.value, toastId]
  }

  return {
    pagesCollapsed,
    layersCollapsed,
    sidebarLeftWidth,
    sidebarRightWidth,
    recentColors,
    lastActiveBrandId,
    lastActiveCanvasId,
    dismissedToasts,
    pushRecentColor,
    dismissToast,
  }
})
