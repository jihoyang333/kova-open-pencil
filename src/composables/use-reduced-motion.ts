// Reduced-motion composable (Cluster 11 Plan Task 2.2).
// Reactive ref backed by `(prefers-reduced-motion: reduce)` media query.

import { useMediaQuery } from '@vueuse/core'

export function useReducedMotion() {
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)')
  return { reduced }
}
