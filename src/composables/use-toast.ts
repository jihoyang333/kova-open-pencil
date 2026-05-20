// Cluster 11 Plan Task 3.3 — useToast composable.
//
// Two surfaces in one module:
//
//   useToast()  — the new Plan-specified API. Six variant helpers backed by
//                 useToastStore (Pinia). Returns { show, dismiss, success,
//                 error, info, action, progress, aiGen }.
//
//   toast.show(message, variant?)
//   toast.remove(id)
//   toast.toasts (ref)
//   toast.setupGlobalErrorHandler()
//   toast.TOAST_DURATION
//                 — back-compat shim used by ~15 M1-era callsites
//                 (App.vue, stores/editor.ts, etc). Routes to the same
//                 Pinia store under the hood. New code should prefer
//                 useToast().

import { computed } from 'vue'
import { useEventListener } from '@vueuse/core'
import { useToastStore } from '@/stores/toast'
import type { NewToast, Toast, ToastVariant } from '@/types/toast'

export const TOAST_DURATION = 3000

function getStore() {
  // Pinia may not be installed yet when the legacy `toast.show()` is called
  // during module-load error handlers. Lazily resolve so installation order
  // doesn't matter at import time.
  return useToastStore()
}

export function useToast() {
  const store = getStore()

  function make(variant: NewToast['variant']) {
    return (message: string, opts: Partial<NewToast> = {}) =>
      store.show({ variant, message, ...opts })
  }

  return {
    show: (input: NewToast) => store.show(input),
    dismiss: (id: string) => store.dismiss(id),
    success: make('success'),
    error: make('error'),
    info: make('info'),
    action: make('action'),
    progress: make('progress'),
    aiGen: make('ai-gen'),
    warning: make('warning'),
  }
}

// ---- Legacy `toast` export (back-compat with M1 callsites) -------------

let errorHandlersInitialized = false

function show(message: string, variant: ToastVariant = 'default'): void {
  getStore().show({ variant, message })
}

function remove(id: string): void {
  getStore().dismiss(id)
}

function setupGlobalErrorHandler(): void {
  if (errorHandlersInitialized) return
  errorHandlersInitialized = true

  useEventListener(window, 'error', (e: ErrorEvent) => {
    show(e.message || 'An unexpected error occurred', 'error')
  })
  useEventListener(window, 'unhandledrejection', (e: PromiseRejectionEvent) => {
    const msg = e.reason instanceof Error ? e.reason.message : String(e.reason)
    show(msg || 'An unexpected error occurred', 'error')
  })
}

// Computed proxy onto the store's visible array. Existing callers that read
// `toast.toasts.value` (.value because the legacy export was a vue ref) get
// the same reactive shape — but rendering is now via <ToastStack>, so most
// callers won't read this.
const toasts = computed<Toast[]>(() => getStore().visible)

export const toast = {
  show,
  remove,
  toasts,
  setupGlobalErrorHandler,
  TOAST_DURATION,
}
