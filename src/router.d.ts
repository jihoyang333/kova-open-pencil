import 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    demo?: boolean
    requiresAuth?: boolean
    publicOnly?: boolean
    requiresOnboarding?: boolean
    onboardingOnly?: boolean
  }
}
