import type { NavigationGuard } from 'vue-router'

import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'

// W8a Cluster 01 — Vue Router authGuard (Plan 01 Task 13).
//
// Three checks in order:
//   1. viewport guard — desktop-only redirect when innerWidth < 1024
//   2. session check — Supabase session + deleted-account intercept
//   3. requiresAuth — redirect to /login (with redirect= query) when missing
//
// Order is deliberate: viewport first (cheap, no DB hit) before session
// refresh (which calls supabase.auth.getSession internally).

const DESKTOP_MIN = 1024

export const authGuard: NavigationGuard = async (to) => {
  // 1. Viewport
  if (
    to.meta.viewportGuard === 'desktop' &&
    typeof window !== 'undefined' &&
    window.innerWidth < DESKTOP_MIN &&
    to.name !== 'desktop-only'
  ) {
    return { name: 'desktop-only', query: { redirect: to.fullPath } }
  }

  // 2. Session check
  const auth = useAuthStore()
  const { data } = await supabase.auth.getSession()
  const session = data.session

  if (session) {
    if (auth.profile?.deleted_at && !to.meta.allowDeletedAccount) {
      return { name: 'account-pending-deletion' }
    }
    if (to.meta.redirectIfAuth) {
      return { name: 'dashboard' }
    }
    return true
  }

  // 3. Unauthenticated
  if (to.meta.requiresAuth) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  return true
}
