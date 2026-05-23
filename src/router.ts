import { watch } from 'vue'
import { createRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth'

import type { Router, RouterHistory, RouteMeta } from 'vue-router'

const LoginView = () => import('./views/LoginView.vue')
const SignupView = () => import('./views/SignupView.vue')
const DashboardView = () => import('./views/DashboardView.vue')
const OnboardingView = () => import('./views/OnboardingView.vue')
const StoreTypeStep = () => import('./components/onboarding/StoreTypeStep.vue')
const EditorView = () => import('./views/EditorView.vue')
const CanvasGrid = () => import('./views/dashboard/CanvasGrid.vue')
const TrashView = () => import('./views/dashboard/TrashView.vue')
const BrandAssetsView = () => import('./views/dashboard/BrandAssetsView.vue')
const BrandSettingsView = () => import('./views/dashboard/BrandSettingsView.vue')
const SettingsBrandIntegrationsView = () => import('./views/dashboard/SettingsBrandIntegrationsView.vue')
const SettingsView = () => import('./views/dashboard/SettingsView.vue')
const AccountView = () => import('./views/account/AccountView.vue')
const StripeReturnLanding = () => import('./views/account/StripeReturnLanding.vue')

const ACCOUNT_SECTIONS_RE = '(profile|brands|billing|brand-kit|integrations|danger-zone)?'
const TokensDebugView = () => import('./views/dev/TokensDebugView.vue')
const Cluster11Showcase = () => import('./views/dev/Cluster11Showcase.vue')
const NotFoundView = () => import('./views/error/NotFoundView.vue')
const ServerErrorView = () => import('./views/error/ServerErrorView.vue')
const NetworkUnreachableView = () => import('./views/error/NetworkUnreachableView.vue')

interface AuthState {
  isAuthenticated: boolean
  isOnboarded: boolean
}

/** Pure guard logic — returns redirect path or true to allow navigation */
export function resolveGuard(
  to: { meta: RouteMeta; path: string },
  auth: AuthState
): string | true {
  if (to.meta.demo) return true
  if (to.meta.publicOnly && auth.isAuthenticated) return '/dashboard'
  if (to.meta.requiresAuth && !auth.isAuthenticated) return '/login'
  if (to.meta.requiresOnboarding && !auth.isOnboarded) return '/onboarding'
  if (to.meta.onboardingOnly && auth.isOnboarded) return '/dashboard'
  return true
}

/** Returns a route to navigate to after the given onboarding step, or null to stay in-flow. */
export function getOnboardingNextRoute(step: number): string | null {
  if (step === 3) return '/onboarding/store-type'
  return null
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
    path: '/onboarding/store-type',
    component: StoreTypeStep,
    meta: { requiresAuth: true, requiresOnboarding: false, onboardingOnly: true }
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: DashboardView,
    meta: { requiresAuth: true, requiresOnboarding: true },
    children: [
      {
        path: 'trash',
        component: TrashView,
        meta: { requiresAuth: true, requiresOnboarding: true }
      },
      {
        path: 'settings',
        component: SettingsView,
        meta: { requiresAuth: true, requiresOnboarding: true }
      },
      {
        path: ':brandId/settings/integrations',
        component: SettingsBrandIntegrationsView,
        meta: { requiresAuth: true, requiresOnboarding: true }
      },
      {
        path: ':brandId/settings',
        component: BrandSettingsView,
        meta: { requiresAuth: true, requiresOnboarding: true }
      },
      {
        path: ':brandId/assets',
        component: BrandAssetsView,
        meta: { requiresAuth: true, requiresOnboarding: true }
      },
      {
        path: ':brandId',
        component: CanvasGrid,
        meta: { requiresAuth: true, requiresOnboarding: true }
      }
    ]
  },
  {
    path: '/account/billing/success',
    name: 'account-billing-success',
    component: StripeReturnLanding,
    meta: { requiresAuth: true, requiresOnboarding: true, theme: 'dark' }
  },
  {
    path: '/account/billing/cancel',
    name: 'account-billing-cancel',
    component: StripeReturnLanding,
    meta: { requiresAuth: true, requiresOnboarding: true, theme: 'dark' }
  },
  {
    path: `/account/:section${ACCOUNT_SECTIONS_RE}`,
    name: 'account',
    component: AccountView,
    meta: { requiresAuth: true, requiresOnboarding: true, theme: 'dark', viewport: 'desktop' }
  },
  {
    path: '/account',
    redirect: { name: 'account', params: { section: 'profile' } }
  },
  {
    path: '/editor',
    redirect: '/dashboard'
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
  },
  {
    path: '/dev/tokens',
    component: TokensDebugView,
    meta: { demo: true, requiresAuth: false, publicOnly: false }
  },
  {
    path: '/dev/cluster-11',
    component: Cluster11Showcase,
    meta: { demo: true, requiresAuth: false, publicOnly: false }
  },
  {
    path: '/404',
    component: NotFoundView,
    meta: { demo: true, requiresAuth: false, publicOnly: false, theme: 'dark' }
  },
  {
    path: '/500',
    component: ServerErrorView,
    meta: { demo: true, requiresAuth: false, publicOnly: false, theme: 'dark' }
  },
  {
    path: '/network-unreachable',
    component: NetworkUnreachableView,
    meta: { demo: true, requiresAuth: false, publicOnly: false, theme: 'dark' }
  },
  {
    path: '/:pathMatch(.*)*',
    component: NotFoundView,
    meta: { demo: true, requiresAuth: false, publicOnly: false, theme: 'dark' }
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

  _router.beforeEach(async (to) => {
    const auth = useAuthStore()
    if (auth.isLoading) {
      await new Promise<void>((resolve) => {
        const stop = watch(
          () => auth.isLoading,
          (loading) => {
            if (!loading) {
              stop()
              resolve()
            }
          },
          { immediate: true }
        )
      })
    }
    return resolveGuard(to, auth)
  })

  return _router
}
