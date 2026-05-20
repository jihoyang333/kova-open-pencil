import { useAuthStore } from '@/stores/auth'

/**
 * Builds Supabase Realtime channel names per PRD 11 §5.6.
 * Format: `kova.{userId}.{domain}.{topic}`
 *
 * Throws if called before sign-in (no userId).
 *
 * @example
 *   const channel = useChannelName('canvas', `${canvasId}.snapshot`)
 *   // -> `kova.<userId>.canvas.<canvasId>.snapshot`
 */
export function useChannelName(domain: string, topic: string): string {
  const auth = useAuthStore()
  const userId = auth.user?.id
  if (!userId) {
    throw new Error('useChannelName called before sign-in (no user in auth store)')
  }
  return `kova.${userId}.${domain}.${topic}`
}
