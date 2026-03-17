import { createRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth'

import type { Router, RouterHistory, RouteMeta } from 'vue-router'

const LoginView = () => import('./views/LoginView.vue')
const SignupView = () => import('./views/SignupView.vue')
const DashboardView = () => import('./views/DashboardView.vue')
const OnboardingView = () => import('./views/OnboardingView.vue')
const EditorView = () => import('./views/EditorView.vue')

interface AuthState {
  isAuthenticated: boolean
  isOnboarded: boolean
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
  if (to.meta.onboardingOnly && auth.isOnboarded) return '/dashboard'
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
    meta: { requiresAuth: true, requiresOnboarding: false, onboardingOnly: true }
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

let _router: Router | null = null

/** Returns the app router instance. Must be called after createAppRouter(). */
export function getRouter(): Router {
  if (!_router) throw new Error('Router not created yet — call createAppRouter() first.')
  return _router
}

export function createAppRouter(history: RouterHistory): Router {
  _router = createRouter({ history, routes })

  _router.beforeEach((to) => {
    const auth = useAuthStore()
    if (auth.isLoading) return false
    return resolveGuard(to, auth)
  })

  return _router
}
