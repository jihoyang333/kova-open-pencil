import { computed, ref } from 'vue'
import type { Ref } from 'vue'

import { supabase } from '@/lib/supabase'

// W8a Cluster 01 — useOtp composable (Plan 01 Task 11).
//
// 6-cell OTP entry + 5-attempt lockout per PRD §12.4 founder lock.
// Auto-submit on 6th digit per §12.6 founder lock (consumed by OtpInput).
// Returns a typed SubmitResult so callers can branch on wrong_code /
// locked_out / expired without try/catch.

type SubmitResult =
  | { ok: true }
  | { ok: false; reason: 'wrong_code' | 'locked_out' | 'expired' }

const MAX_ATTEMPTS = 5

export function useOtp(email: string): {
  digits: Ref<string[]>
  submit: () => Promise<SubmitResult>
  attemptsLeft: ReturnType<typeof computed<number>>
  locked: ReturnType<typeof computed<boolean>>
  reset: () => void
} {
  const digits = ref<string[]>(['', '', '', '', '', ''])
  const attempts = ref(0)

  const attemptsLeft = computed(() => Math.max(0, MAX_ATTEMPTS - attempts.value))
  const locked = computed(() => attempts.value >= MAX_ATTEMPTS)

  async function submit(): Promise<SubmitResult> {
    if (locked.value) return { ok: false, reason: 'locked_out' }
    const code = digits.value.join('')
    if (code.length !== 6) return { ok: false, reason: 'wrong_code' }

    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' })

    if (error) {
      attempts.value++
      if (error.message?.toLowerCase().includes('expired')) return { ok: false, reason: 'expired' }
      return { ok: false, reason: attempts.value >= MAX_ATTEMPTS ? 'locked_out' : 'wrong_code' }
    }
    return { ok: true }
  }

  function reset(): void {
    digits.value = ['', '', '', '', '', '']
    attempts.value = 0
  }

  return { digits, submit, attemptsLeft, locked, reset }
}
