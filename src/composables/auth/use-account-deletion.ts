import { computed } from 'vue'
import type { ComputedRef } from 'vue'

import { useAuthStore } from '@/stores/auth'

// W8a Cluster 01 — useAccountDeletion composable (Plan 01 Task 12.1).
// Thin delegation surface around the Pinia store — keeps DangerZoneCard +
// AccountPendingDeletionView decoupled from the store import path.

export function useAccountDeletion(): {
  requestDeletion: () => Promise<void>
  restoreAccount: () => Promise<boolean>
  pending: ComputedRef<boolean>
  scheduledPurgeAt: ComputedRef<string | null>
} {
  const auth = useAuthStore()
  return {
    requestDeletion: () => auth.requestAccountDeletion(),
    restoreAccount: () => auth.restoreAccount(),
    pending: computed(() => auth.pendingDeletion),
    scheduledPurgeAt: computed(() => auth.scheduledPurgeAt),
  }
}
