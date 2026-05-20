// Server-side Supabase Realtime channel-name helper (Cluster 11 Plan Task 1.7).
// Format: `kova.<userId>.<domain>.<topic>`.
// Examples: `kova.u1.canvas.abc.snapshot`, `kova.u1.shopify.sync.status`.

export function channelName(userId: string, domain: string, topic: string): string {
  if (!userId || !domain || !topic) {
    throw new Error('channelName parts cannot be empty')
  }
  return `kova.${userId}.${domain}.${topic}`
}
