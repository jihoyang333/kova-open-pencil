import { useDebounceFn, useEventListener } from '@vueuse/core'
import { onMounted, onUnmounted, ref } from 'vue'

import type { Ref } from 'vue'

export type OnlineStatus = 'online' | 'offline'

const PING_INTERVAL_MS = 3000
const ACK_TIMEOUT_MS = 10000
const DEBOUNCE_OFFLINE_MS = 1000

/**
 * Reactive online/offline status — PRD 11 §3.7 + KD-3.
 *
 * Primary: `navigator.onLine` reactive ref (instant on flip-to-offline).
 * Secondary: Supabase Realtime presence ping every 3 s; 10 s no-ack → offline.
 * Transition back to online: instant.
 *
 * **Cluster 11 owns the surface;** Cluster 10 / 04 / etc. plug their own
 * Realtime channels and report ACKs into this composable via the optional
 * `pingCallback` (see Plan 11 Task 2.4 contract — wired in §3.4 once
 * Supabase Realtime is initialized).
 */
export function useOnlineStatus(): Ref<OnlineStatus> {
  const status = ref<OnlineStatus>(
    typeof navigator !== 'undefined' && navigator.onLine ? 'online' : 'offline'
  )

  const flipOfflineDebounced = useDebounceFn(() => {
    status.value = 'offline'
  }, DEBOUNCE_OFFLINE_MS)

  useEventListener(typeof window === 'undefined' ? null : window, 'online', () => {
    status.value = 'online'
  })

  useEventListener(typeof window === 'undefined' ? null : window, 'offline', () => {
    status.value = 'offline'
  })

  let pingTimer: ReturnType<typeof setInterval> | null = null
  let lastAck: number = Date.now()

  function noteAck(): void {
    lastAck = Date.now()
    if (status.value === 'offline' && typeof navigator !== 'undefined' && navigator.onLine) {
      status.value = 'online'
    }
  }

  function tick(): void {
    if (Date.now() - lastAck > ACK_TIMEOUT_MS) {
      void flipOfflineDebounced()
    }
  }

  onMounted(() => {
    pingTimer = setInterval(tick, PING_INTERVAL_MS)
  })
  onUnmounted(() => {
    if (pingTimer) clearInterval(pingTimer)
  })

  ;(useOnlineStatus as unknown as { noteAck?: () => void }).noteAck = noteAck

  return status
}
