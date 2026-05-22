import { onMounted, onUnmounted } from 'vue'

import { getRouter } from '@/router'
import { supabase } from '@/lib/supabase'

// W8a Cluster 01 — useSessionWatcher composable (Plan 01 Task 12.3).
//
// Listens to supabase.auth.onAuthStateChange. On SIGNED_OUT from a protected
// route (and not from /login or signup/callback flows — those are user-
// initiated), routes the user to /auth/session-expired with the original
// path as the redirect query param. Mount once at the App.vue level.

const SAFE_SIGNED_OUT_ROUTES = new Set(['login', 'auth-callback', 'signup'])

export function useSessionWatcher(): void {
  let sub: { unsubscribe: () => void } | null = null

  onMounted(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event !== 'SIGNED_OUT') return
      const router = getRouter()
      const route = router.currentRoute.value
      const routeName = typeof route.name === 'string' ? route.name : null
      if (routeName && SAFE_SIGNED_OUT_ROUTES.has(routeName)) return
      if (!route.meta?.requiresAuth) return

      void router.push({
        name: 'auth-session-expired',
        query: { redirect: route.fullPath },
      })
    })
    sub = data.subscription
  })

  onUnmounted(() => sub?.unsubscribe())
}
