import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'

import type { ComputedRef } from 'vue'

export type Theme = 'dark' | 'light'

/**
 * Reads `route.meta.theme` and applies it as `data-theme` on `<html>`.
 * Dark is the default — auth + marketing routes set `meta.theme: 'light'`.
 * Cluster 11 owns the mechanism; downstream routes set `meta.theme`.
 */
export function useTheme(): ComputedRef<Theme> {
  const route = useRoute()
  const theme = computed<Theme>(() => {
    const v = route.meta.theme
    return v === 'light' ? 'light' : 'dark'
  })

  watch(
    theme,
    (t) => {
      if (typeof document !== 'undefined') {
        document.documentElement.dataset.theme = t
      }
    },
    { immediate: true }
  )

  return theme
}
