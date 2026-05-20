// Cluster 11 Plan Task 5.2 — useConfirm composable.
// Thin wrapper around useConfirmStore so callers get a single .confirm()
// method without coupling to the store implementation.

import { useConfirmStore } from '@/stores/confirm'
import type { ConfirmOptions } from '@/types/confirm'

export function useConfirm() {
  const store = useConfirmStore()
  return {
    confirm: (opts: ConfirmOptions): Promise<boolean> => store.confirm(opts),
  }
}
