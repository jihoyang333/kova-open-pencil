// Browser-side channel-name composable (Cluster 11 Plan Task 2.3).
// Mirrors api/_shared/realtime.ts on the server. Reads userId from the auth
// store; throws when called before sign-in so callers can fail loudly.

import { useAuthStore } from '@/stores/auth'

export function useChannelName(domain: string, topic: string): string {
  const auth = useAuthStore()
  const userId = auth.user?.id
  if (!userId) {
    throw new Error('useChannelName called before sign-in')
  }
  return `kova.${userId}.${domain}.${topic}`
}
