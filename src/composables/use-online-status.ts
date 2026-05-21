import { useDebounceFn, useEventListener } from '@vueuse/core'
import { onMounted, onUnmounted, ref } from 'vue'

import type { Ref } from 'vue'

export type OnlineStatus = 'online' | 'offline'

const PING_INTERVAL_MS = 3000
const ACK_TIMEOUT_MS = 10000
const DEBOUNCE_OFFLINE_MS = 1000

export interface UseOnlineStatusReturn {
  status: Ref<OnlineStatus>
  /**
   * Consumer-cluster hook — Realtime / fetch ACK reporter.
   * Called by every Realtime channel + fetch wrapper that successfully
   * round-trips to Supabase. Resets the ACK timeout; if status is
   * offline and `navigator.onLine` is back, flips to online.
   */
  noteAck: () => void
}

/**
 * Reactive online/offline status — PRD 11 §3.7 + KD-3.
 *
 * Primary: `navigator.onLine` reactive ref (instant on flip-to-offline).
 * Secondary: consumer clusters report ACKs into this composable's
 * `noteAck()` (Realtime presence ping, fetch success). If no ACK within
 * `ACK_TIMEOUT_MS` (10 s), debounce 1 s then flip to offline. Covers
 * DNS/firewall edge cases where browser thinks online but backend is
 * unreachable.
 *
 * Transition back to online is instant on `window.online`.
 *
 * Stateless: each call returns a fresh closure pair (no shared singleton).
 * Suitable for per-component scoping. If a single source of truth is
 * needed across the app, wrap in a Pinia store.
 */
export function useOnlineStatus(): UseOnlineStatusReturn {
  const status = ref<OnlineStatus>(
    typeof navigator !== 'undefined' && navigator.onLine ? 'online' : 'offline'
  )

  let lastAck: number = Date.now()
  let pingTimer: ReturnType<typeof setInterval> | null = null

  const flipOfflineDebounced = useDebounceFn(() => {
    status.value = 'offline'
  }, DEBOUNCE_OFFLINE_MS)

  useEventListener(typeof window === 'undefined' ? null : window, 'online', () => {
    // Cancel any pending offline-flip from the debounce window.
    flipOfflineDebounced.cancel?.()
    lastAck = Date.now()
    status.value = 'online'
  })

  useEventListener(typeof window === 'undefined' ? null : window, 'offline', () => {
    status.value = 'offline'
  })

  function noteAck(): void {
    lastAck = Date.now()
    if (status.value === 'offline' && typeof navigator !== 'undefined' && navigator.onLine) {
      flipOfflineDebounced.cancel?.()
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
    flipOfflineDebounced.cancel?.()
  })

  return { status, noteAck }
}
