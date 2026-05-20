// Route-driven theme swap (Cluster 11 Plan Task 2.1).
//
// Dark = inside authenticated app (default).
// Light = marketing + auth (signin/signup/password-reset/marketing pages).
// No toggle: route.meta.theme drives the value.
//
// The composable writes `data-theme="<value>"` on <html> so the canonical
// stylesheets (kova-hifi.css for dark, kova-hifi-light.css for light) can
// switch via CSS attribute selector.

import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import type { Router } from 'vue-router'

export function useTheme(router?: Router) {
  const route = router ? router.currentRoute : useRoute()
  const theme = computed<'light' | 'dark'>(() => {
    const meta = 'value' in route ? route.value.meta : route.meta
    const value = (meta as { theme?: 'light' | 'dark' }).theme
    return value ?? 'dark'
  })
  watch(
    theme,
    (t) => {
      if (typeof document !== 'undefined') {
        document.documentElement.dataset['theme'] = t
      }
    },
    { immediate: true },
  )
  return { theme }
}
