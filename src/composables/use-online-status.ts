// Realtime-backed online/offline status (Cluster 11 Plan Task 2.4).
//
// Combines navigator.onLine (debounced 1s to suppress browser flapping) with a
// Realtime heartbeat: the composable pings every 3s and tracks the last ack
// time. If no ack for > 10s, status flips to 'offline' even if the browser
// thinks it is online — covers VPN-down / Supabase-degraded scenarios.
//
// Heartbeat channel name is per-user (presence) so two sessions of the same
// user share an ack stream. Pre-auth callers (e.g. signin page) fall back to
// navigator.onLine only.

import { ref, computed, onMounted, onUnmounted } from 'vue'
import { supabase } from '@/lib/supabase'
import { useChannelName } from './use-channel-name'

const PING_INTERVAL_MS = 3000
const PING_TIMEOUT_MS = 10000
const DEBOUNCE_MS = 1000

export function useOnlineStatus() {
  const browserOnline = ref(typeof navigator !== 'undefined' ? navigator.onLine : true)
  const lastAckAt = ref(Date.now())
  let pingTimer: ReturnType<typeof setInterval> | null = null
  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  let channel: ReturnType<typeof supabase.channel> | null = null

  const status = computed<'online' | 'offline'>(() => {
    if (!browserOnline.value) return 'offline'
    if (Date.now() - lastAckAt.value > PING_TIMEOUT_MS) return 'offline'
    return 'online'
  })

  function onOnline() {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      browserOnline.value = true
    }, DEBOUNCE_MS)
  }
  function onOffline() {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      browserOnline.value = false
    }, DEBOUNCE_MS)
  }

  onMounted(() => {
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    try {
      const name = useChannelName('presence', 'heartbeat')
      channel = supabase.channel(name)
      channel
        .on('broadcast', { event: 'ack' }, () => {
          lastAckAt.value = Date.now()
        })
        .subscribe()
      pingTimer = setInterval(() => {
        channel?.send({
          type: 'broadcast',
          event: 'ping',
          payload: { ts: Date.now() },
        })
      }, PING_INTERVAL_MS)
    } catch {
      // Pre-auth (no userId yet) — fall back to navigator.onLine only.
    }
  })

  onUnmounted(() => {
    window.removeEventListener('online', onOnline)
    window.removeEventListener('offline', onOffline)
    if (pingTimer) clearInterval(pingTimer)
    if (debounceTimer) clearTimeout(debounceTimer)
    if (channel) supabase.removeChannel(channel)
  })

  return { status, lastAckAt: computed(() => lastAckAt.value) }
}
