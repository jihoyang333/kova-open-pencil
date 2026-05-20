// Cluster 11 Plan Task 5.1 — useConfirmStore.
//
// confirm() returns a promise; the user's click on the confirm or cancel
// button resolves it. Stack capped at 2 so a flow can spawn at most one
// nested confirm (e.g. "Discard unsaved changes?" inside "Delete brand?").
// Opening a third innermost-closes-false to keep the stack invariant.

import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { ConfirmOptions, ConfirmRequest } from '@/types/confirm'

const STACK_MAX = 2

export const useConfirmStore = defineStore('confirm', () => {
  const stack = ref<ConfirmRequest[]>([])
  const pending = computed(() => stack.value.at(-1) ?? null)

  async function confirm(opts: ConfirmOptions): Promise<boolean> {
    if (stack.value.length >= STACK_MAX) {
      const innermost = stack.value.pop()!
      innermost.resolve(false)
    }
    return new Promise<boolean>((resolve) => {
      stack.value.push({ ...opts, id: crypto.randomUUID(), resolve })
    })
  }

  function resolveTop(result: boolean): void {
    const top = stack.value.pop()
    if (top) top.resolve(result)
  }

  return { stack, pending, confirm, resolveTop }
})
