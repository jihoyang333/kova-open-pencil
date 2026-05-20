import { useMediaQuery } from '@vueuse/core'

import type { Ref } from 'vue'

/**
 * Reactive `prefers-reduced-motion: reduce` media query.
 * Cluster 11 — drives KovaSkeleton shimmer fallback + any future motion gates.
 * Future: Cluster 12 user-preferences override is composed via a derived
 * `computed(() => userPrefersReduce.value || mediaPrefersReduce.value)`.
 */
export function useReducedMotion(): Ref<boolean> {
  return useMediaQuery('(prefers-reduced-motion: reduce)')
}
