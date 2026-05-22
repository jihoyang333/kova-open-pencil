import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * Cluster 11 toast store — PRD 11 §3.1 + Plan 11 Task 3.2.
 *
 * Variants (canonical taxonomy per PRD 11 §3.1):
 *   success | error | info | action | progress | ai
 *
 * Sticky variants: error / action / progress (no auto-dismiss).
 * Auto-dismiss default: 5000 ms; per-toast `duration` override allowed.
 *
 * Cap: 5 visible at a time (KD-1). Excess queued + promoted on dismiss.
 */

export type ToastVariant = 'success' | 'error' | 'info' | 'action' | 'progress' | 'ai'

export interface ToastAction {
  label: string
  onClick: () => void
  /** Muted style for secondary actions ("Dismiss" next to "Undo"). */
  muted?: boolean
}

export interface NewToast {
  variant: ToastVariant
  message: string
  meta?: string
  /** Override duration (ms). Ignored for sticky variants. */
  duration?: number
  actions?: ToastAction[]
  /** Lucide icon name override. Defaults per variant. */
  icon?: string
}

export interface Toast extends NewToast {
  id: string
  createdAt: number
}

const MAX_VISIBLE = 5
const DEFAULT_DURATION_MS = 5000
const STICKY_VARIANTS: ReadonlySet<ToastVariant> = new Set(['error', 'action', 'progress'])

const VARIANT_ICON: Readonly<Record<ToastVariant, string>> = {
  success: 'check',
  error: 'alert-triangle',
  info: 'info',
  action: 'info',
  progress: 'loader',
  ai: 'sparkles',
}

export function defaultIcon(variant: ToastVariant): string {
  return VARIANT_ICON[variant]
}

export const useToastStore = defineStore('toast', () => {
  const visible = ref<Toast[]>([])
  const queued = ref<Toast[]>([])
  const dismissTimers = new Map<string, ReturnType<typeof setTimeout>>()

  function show(input: NewToast): string {
    const id = crypto.randomUUID()
    const toast: Toast = { ...input, id, createdAt: Date.now() }

    if (visible.value.length < MAX_VISIBLE) {
      visible.value = [...visible.value, toast]
      scheduleAutoDismiss(toast)
    } else {
      queued.value = [...queued.value, toast]
    }
    return id
  }

  function dismiss(id: string): void {
    const timer = dismissTimers.get(id)
    if (timer) {
      clearTimeout(timer)
      dismissTimers.delete(id)
    }
    visible.value = visible.value.filter((t) => t.id !== id)
    promoteFromQueue()
  }

  function dismissAll(): void {
    dismissTimers.forEach((t) => clearTimeout(t))
    dismissTimers.clear()
    visible.value = []
    queued.value = []
  }

  function promoteFromQueue(): void {
    if (queued.value.length === 0 || visible.value.length >= MAX_VISIBLE) return
    const [next, ...rest] = queued.value
    queued.value = rest
    visible.value = [...visible.value, next]
    scheduleAutoDismiss(next)
  }

  function scheduleAutoDismiss(toast: Toast): void {
    if (STICKY_VARIANTS.has(toast.variant)) return
    const ms = toast.duration ?? DEFAULT_DURATION_MS
    if (!Number.isFinite(ms) || ms <= 0) return
    const timer = setTimeout(() => dismiss(toast.id), ms)
    dismissTimers.set(toast.id, timer)
  }

  return { visible, queued, show, dismiss, dismissAll }
})
