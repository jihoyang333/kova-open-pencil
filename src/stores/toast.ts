// Cluster 11 Plan Task 3.2 — useToastStore (Pinia).
//
// Visible/queued split: max 5 toasts on screen at once. New toasts beyond the
// cap land in `queued` and promote to `visible` as visible toasts dismiss.
// Auto-dismiss applies to success / info / default / warning / ai-gen after
// `DEFAULT_DURATION_MS`. error / action / progress are STICKY — they only
// dismiss when the user (or caller) explicitly dismisses them.

import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { Toast, NewToast } from '@/types/toast'

const MAX_VISIBLE = 5
const DEFAULT_DURATION_MS = 5000

const STICKY_VARIANTS = new Set(['error', 'action', 'progress'])

export const useToastStore = defineStore('toast', () => {
  const visible = ref<Toast[]>([])
  const queued = ref<Toast[]>([])
  const timers = new Map<string, ReturnType<typeof setTimeout>>()

  function show(input: NewToast): string {
    const id = crypto.randomUUID()
    const toast: Toast = { ...input, id, createdAt: Date.now() }
    if (visible.value.length < MAX_VISIBLE) {
      visible.value.push(toast)
      scheduleAutoDismiss(toast)
    } else {
      queued.value.push(toast)
    }
    return id
  }

  function dismiss(id: string): void {
    const handle = timers.get(id)
    if (handle) {
      clearTimeout(handle)
      timers.delete(id)
    }
    visible.value = visible.value.filter((t) => t.id !== id)
    const next = queued.value.shift()
    if (next) {
      visible.value.push(next)
      scheduleAutoDismiss(next)
    }
  }

  function scheduleAutoDismiss(toast: Toast): void {
    if (STICKY_VARIANTS.has(toast.variant)) return
    const ms = toast.duration ?? DEFAULT_DURATION_MS
    if (!Number.isFinite(ms)) return
    const handle = setTimeout(() => dismiss(toast.id), ms)
    timers.set(toast.id, handle)
  }

  return { visible, queued, show, dismiss }
})
