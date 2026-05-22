import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * Cluster 11 confirm store — PRD 11 §3.3 + Plan 11 Task 5.1.
 *
 * Module-level Promise-returning confirm modal. Stack ceiling: 2 (KD-2)
 * — opening a 3rd closes the innermost first.
 */

export interface ConfirmOptions {
  title: string
  body?: string
  /** Confirm button label. Default: 'Confirm'. */
  confirmLabel?: string
  /** Cancel button label. Default: 'Cancel'. */
  cancelLabel?: string
  /** Destructive confirm uses .btn.danger styling (currently mapped to ink-2 — Ban 12). */
  destructive?: boolean
  /** Optional typed-confirm. User must type this exact string to enable Confirm button. */
  typedConfirmPhrase?: string
}

export interface ConfirmRequest extends ConfirmOptions {
  id: string
  resolve: (value: boolean) => void
}

const MAX_STACK = 2

export const useConfirmStore = defineStore('confirm', () => {
  const stack = ref<ConfirmRequest[]>([])

  function confirm(opts: ConfirmOptions): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      if (stack.value.length >= MAX_STACK) {
        // Close innermost per KD-2.
        const innermost = stack.value[stack.value.length - 1]
        innermost.resolve(false)
        stack.value = stack.value.slice(0, -1)
      }
      const id = crypto.randomUUID()
      stack.value = [...stack.value, { ...opts, id, resolve }]
    })
  }

  function answer(id: string, value: boolean): void {
    const req = stack.value.find((r) => r.id === id)
    if (!req) return
    req.resolve(value)
    stack.value = stack.value.filter((r) => r.id !== id)
  }

  return { stack, confirm, answer }
})
