// W6 Cluster 11 Phase 5c — server-side channel-name mirror (Plan 11 Task 1.7).
//
// Mirror of `src/composables/use-channel-name.ts` for Edge Functions that
// broadcast over Supabase Realtime. Browser callers use the composable
// (reads auth store for userId); server callers pass userId explicitly.
//
// Naming convention per PRD 11 §5.6 — `kova.{userId}.{domain}.{topic}`.
// Documented as the ONLY allowed pattern. Downstream PRDs build on this.

const USER_ID_PATTERN = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
const SEGMENT_PATTERN = /^[a-zA-Z0-9._-]+$/

/**
 * Build a Supabase Realtime channel name. Server-side mirror of
 * `useChannelName()`.
 *
 * Throws if userId is not a UUID v4-shaped string, or if domain/topic
 * contain anything other than `[a-zA-Z0-9._-]+`. The channel name is part
 * of the wire protocol — accept narrow input to avoid quoting bugs.
 *
 * @example
 *   channelName('00000000-0000-0000-0000-000000000001', 'canvas', `${canvasId}.snapshot`)
 *   // → `kova.00000000-0000-0000-0000-000000000001.canvas.<canvasId>.snapshot`
 */
export function channelName(userId: string, domain: string, topic: string): string {
  if (!USER_ID_PATTERN.test(userId)) {
    throw new Error(`channelName: invalid userId (must be UUID): ${userId}`)
  }
  if (!SEGMENT_PATTERN.test(domain)) {
    throw new Error(`channelName: invalid domain (must match [a-zA-Z0-9._-]+): ${domain}`)
  }
  if (!SEGMENT_PATTERN.test(topic)) {
    throw new Error(`channelName: invalid topic (must match [a-zA-Z0-9._-]+): ${topic}`)
  }
  return `kova.${userId}.${domain}.${topic}`
}
