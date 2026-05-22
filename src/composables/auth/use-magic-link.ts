import { computed, onUnmounted, ref } from 'vue'
import type { ComputedRef } from 'vue'

import { supabase } from '@/lib/supabase'

// W8a Cluster 01 — useMagicLink composable (Plan 01 Task 10).
//
// Wraps supabase.auth.signInWithOtp (email magic-link). Exposes a typed
// SendResult (no thrown errors at the API boundary so the caller can map
// reasons to UI states without try/catch). Maintains a 60-second cooldown
// timer to gate resend buttons (A15.03 hi-fi annotation).

type SendResult =
  | { ok: true }
  | { ok: false; reason: 'rate_limited' | 'invalid_email' | 'no_account' | 'unknown' }

const COOLDOWN_SECONDS = 60

export function useMagicLink(): {
  send: (email: string) => Promise<SendResult>
  cooldown: ComputedRef<number>
} {
  const lastSentAt = ref<number | null>(null)
  const now = ref(Date.now())
  let intervalId: ReturnType<typeof setInterval> | null = null

  function startTimer(): void {
    if (intervalId) return
    intervalId = setInterval(() => {
      now.value = Date.now()
    }, 1000)
  }

  onUnmounted(() => {
    if (intervalId) clearInterval(intervalId)
  })

  const cooldown = computed(() => {
    if (!lastSentAt.value) return 0
    const elapsed = (now.value - lastSentAt.value) / 1000
    return Math.max(0, COOLDOWN_SECONDS - Math.floor(elapsed))
  })

  async function send(email: string): Promise<SendResult> {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) {
      if (error.status === 429) return { ok: false, reason: 'rate_limited' }
      if (error.message.toLowerCase().includes('invalid')) return { ok: false, reason: 'invalid_email' }
      return { ok: false, reason: 'unknown' }
    }
    lastSentAt.value = Date.now()
    startTimer()
    return { ok: true }
  }

  return { send, cooldown }
}
