// PRD 02 §6.3 + Plan T09 — time-of-day greeting with first-name extraction.
// Powers the dashboard `.greeting` headline (e.g. "Good morning, Jiho").

import { computed, ref, type ComputedRef } from 'vue'
import { useIntervalFn } from '@vueuse/core'

import { useAuthStore } from '@/stores/auth'
import { now } from '@/utils/clock'

const FALLBACK_NAME = 'there'
// H4 audit fix — bump tick every minute so a long-running tab transitions
// from "Good morning" → "Good afternoon" without a reload. Tick depends on a
// reactive ref so the computed re-evaluates `now()` on every interval.
const GREETING_TICK_MS = 60_000

export function useGreeting(): ComputedRef<string> {
  const auth = useAuthStore()
  const tick = ref(0)
  useIntervalFn(() => { tick.value++ }, GREETING_TICK_MS)
  return computed(() => {
    // Touch tick so the computed re-runs each interval.
    void tick.value
    const hour = now().getHours()
    const phase =
      hour >= 4 && hour < 12
        ? 'Good morning'
        : hour >= 12 && hour < 18
          ? 'Good afternoon'
          : 'Good evening'

    const fullName = auth.profile?.name?.trim() ?? ''
    if (fullName) {
      const first = fullName.split(/\s+/)[0]
      if (first) return `${phase}, ${first}`
    }
    // B-HIGH4: email is on auth.user (Supabase auth), not on UserProfile.
    const emailLocal = auth.user?.email?.split('@')[0]
    return `${phase}, ${emailLocal ?? FALLBACK_NAME}`
  })
}
