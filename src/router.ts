import { createRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth'

import type { Router, RouterHistory } from 'vue-router'

const LoginView = () => import('./views/LoginView.vue')
const SignupView = () => import('./views/SignupView.vue')
const DashboardView = () => import('./views/DashboardView.vue')
const OnboardingView = () => import('./views/OnboardingView.vue')
const EditorView = () => import('./views/EditorView.vue')

interface AuthState {
  isAuthenticated: boolean
  isOnboarded: boolean
}

interface RouteMeta {
  demo?: boolean
  requiresAuth?: boolean
  publicOnly?: boolean
  requiresOnboarding?: boolean
}

/** Pure guard logic — returns redirect path or true to allow navigation */
export function resolveGuard(
  to: { meta: RouteMeta; path: string },
  auth: AuthState,
): string | true {
  if (to.meta.demo) return true
  if (to.meta.publicOnly && auth.isAuthenticated) return '/dashboard'
  if (to.meta.requiresAuth && !auth.isAuthenticated) return '/login'
  if (to.meta.requiresOnboarding && !auth.isOnboarded) return '/onboarding'
  if (to.path === '/onboarding' && auth.isOnboarded) return '/dashboard'
  return true
}

/** Resolves `/` redirect based on auth state */
export function resolveRootRedirect(auth: AuthState): string {
  return auth.isAuthenticated ? '/dashboard' : '/login'
}

const routes = [
  {
    path: '/',
    redirect: () => {
      const auth = useAuthStore()
      return resolveRootRedirect(auth)
    }
  },
  {
    path: '/login',
    component: LoginView,
    meta: { requiresAuth: false, publicOnly: true }
  },
  {
    path: '/signup',
    component: SignupView,
    meta: { requiresAuth: false, publicOnly: true }
  },
  {
    path: '/onboarding',
    component: OnboardingView,
    meta: { requiresAuth: true, requiresOnboarding: false }
  },
  {
    path: '/dashboard',
    component: DashboardView,
    meta: { requiresAuth: true, requiresOnboarding: true }
  },
  {
    path: '/editor/:canvasId',
    component: EditorView,
    meta: { requiresAuth: true, requiresOnboarding: true }
  },
  {
    path: '/demo',
    component: EditorView,
    meta: { demo: true, requiresAuth: false, publicOnly: false }
  }
]

export function createAppRouter(history: RouterHistory): Router {
  const router = createRouter({ history, routes })

  router.beforeEach((to) => {
    const auth = useAuthStore()
    return resolveGuard(to, auth)
  })

  return router
}
