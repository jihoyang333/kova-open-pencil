// PRD 02 §6.3 + Plan T09 — time-of-day greeting with first-name extraction.
// Powers the dashboard `.greeting` headline (e.g. "Good morning, Jiho").

import { computed, type ComputedRef } from 'vue'

import { useAuthStore } from '@/stores/auth'
import { now } from '@/utils/clock'

const FALLBACK_NAME = 'there'

export function useGreeting(): ComputedRef<string> {
  const auth = useAuthStore()
  return computed(() => {
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
