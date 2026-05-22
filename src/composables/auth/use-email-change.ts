import { computed, onUnmounted, ref } from 'vue'

import { useAuthStore } from '@/stores/auth'

// W8a Cluster 01 — useEmailChange composable (Plan 01 Task 12.2).
// Calls POST /api/auth/email-change-request + tracks a 1-hour cooldown
// (Supabase Auth's per-recipient email send cap).

type Result =
  | { ok: true }
  | { ok: false; reason: 'in_use' | 'invalid' | 'rate_limited' | 'unknown' }

const COOLDOWN_SECONDS = 3600

export function useEmailChange(): {
  requestChange: (newEmail: string) => Promise<Result>
  cooldown: ReturnType<typeof computed<number>>
} {
  const auth = useAuthStore()
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
    return Math.max(0, COOLDOWN_SECONDS - Math.floor((now.value - lastSentAt.value) / 1000))
  })

  async function requestChange(newEmail: string): Promise<Result> {
    const res = await fetch('/api/auth/email-change-request', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${auth.session?.access_token ?? ''}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ new_email: newEmail }),
    })
    if (res.status === 200) {
      lastSentAt.value = Date.now()
      startTimer()
      return { ok: true }
    }
    if (res.status === 400) return { ok: false, reason: 'invalid' }
    if (res.status === 409) return { ok: false, reason: 'in_use' }
    if (res.status === 429) return { ok: false, reason: 'rate_limited' }
    return { ok: false, reason: 'unknown' }
  }

  return { requestChange, cooldown }
}
