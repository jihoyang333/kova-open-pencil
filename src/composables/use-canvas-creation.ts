// PRD 02 §3.2 — cross-component bus for the dashboard topbar "New canvas"
// button. DashboardView owns the topbar but the creation logic lives on the
// active child view (RecentsView). The topbar publishes a request via
// `requestNewCanvas()`; the active child registers a handler in `onMounted`
// and tears it down in `onUnmounted`. Replaces the H2 audit finding pattern
// that reached into `router.currentRoute.value.matched[1].instances.default`
// (vue-router internal API).

type Handler = () => void | Promise<void>

let currentHandler: Handler | null = null

export interface UseCanvasCreation {
  requestNewCanvas: () => void
  registerHandler: (handler: Handler) => void
  unregisterHandler: (handler: Handler) => void
}

export function useCanvasCreation(): UseCanvasCreation {
  function requestNewCanvas(): void {
    if (currentHandler) void currentHandler()
  }

  function registerHandler(handler: Handler): void {
    currentHandler = handler
  }

  function unregisterHandler(handler: Handler): void {
    if (currentHandler === handler) currentHandler = null
  }

  return { requestNewCanvas, registerHandler, unregisterHandler }
}

export function _resetForTesting(): void {
  currentHandler = null
}
