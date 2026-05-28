/**
 * useRightPanelTab — Cluster 06 Task 7.
 *
 * Thin wrapper over useRightPanelStore exposing switchToDesign / switchToAi /
 * focusAiComposer + a listener registry so Cluster 10's <ChatPanel> can subscribe
 * to focus-composer requests fired by the bottom-toolbar AI button.
 */
import type { Ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRightPanelStore, type RightPanelTab } from '@/stores/right-panel'

// Module-singleton listener registry. Survives hot-reload (intentional —
// keeps subscribers alive across HMR cycles in dev) but means every
// subscriber must call the unsubscribe function returned from
// onFocusRequest() on unmount, otherwise stale handlers leak.
// H6 from code review — promote to provide/inject if we ever run multiple
// Vue app instances in the same JS realm (SSR, Storybook, dual-window
// Tauri). For now, single-app assumption holds.
const focusListeners = new Set<() => void>()

/** Test-only: clear focus listeners between tests. */
export function __resetRightPanelTabListeners(): void {
  focusListeners.clear()
}

export interface UseRightPanelTab {
  activeTab: Ref<RightPanelTab>
  switchToDesign: () => void
  switchToAi: () => void
  focusAiComposer: () => void
  onFocusRequest: (fn: () => void) => () => void
}

export function useRightPanelTab(): UseRightPanelTab {
  const store = useRightPanelStore()
  const { activeTab } = storeToRefs(store)

  function switchToDesign(): void {
    store.setActiveTab('design')
  }

  function switchToAi(): void {
    store.setActiveTab('ai')
  }

  function focusAiComposer(): void {
    store.setActiveTab('ai')
    // Run after DOM updates so the ChatPanel input is mounted before focus.
    queueMicrotask(() => {
      for (const fn of focusListeners) fn()
    })
  }

  function onFocusRequest(fn: () => void): () => void {
    focusListeners.add(fn)
    return () => focusListeners.delete(fn)
  }

  return {
    activeTab,
    switchToDesign,
    switchToAi,
    focusAiComposer,
    onFocusRequest,
  }
}
