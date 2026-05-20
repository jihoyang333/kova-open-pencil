import { useConfirmStore } from '@/stores/confirm'

import type { ConfirmOptions } from '@/stores/confirm'

/**
 * Promise-returning confirm modal — Plan 11 Task 5.2.
 *
 * @example
 *   const ok = await useConfirm({ title: 'Delete canvas?', destructive: true })
 *   if (ok) deleteCanvas()
 */
export function useConfirm() {
  const store = useConfirmStore()
  return (opts: ConfirmOptions) => store.confirm(opts)
}
