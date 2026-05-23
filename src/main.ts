import { createHead } from '@unhead/vue/client'
import { createPinia } from 'pinia'
import { createApp } from 'vue'
import { createWebHistory } from 'vue-router'

import './app.css'
import { IS_TAURI } from '@/constants'
import { preloadFonts } from '@/engine/fonts'
import { createAppRouter } from '@/router'
import { registerProductVariantOverlay } from '@/canvas-extensions/product-variant/register'
import { initBrowserSentry } from '@/sentry'
import { useAuthStore } from '@/stores/auth'
import { usePreferencesStore } from '@/stores/preferences'
import { applyReducedMotionDefault } from '@/composables/use-reduced-motion-default'
import { usePreferencesModal } from '@/composables/use-preferences-modal'

import App from './App.vue'

preloadFonts()

const pinia = createPinia()
const head = createHead()
const router = createAppRouter(createWebHistory())
const app = createApp(App)

app.use(pinia).use(router).use(head)
initBrowserSentry({ app, router })
registerProductVariantOverlay()

// Initialize auth store before mounting — prevents flash of unauthenticated content.
// Pinia must be installed via app.use(pinia) before calling useAuthStore().
const auth = useAuthStore()
void auth
  .initialize()
  .catch((err) => console.error('Auth initialize failed', err))
  .then(async () => {
    // Cluster 12 — load user preferences after auth resolves so DOM data-attrs
    // are set before any pref-dependent component renders.
    const prefs = usePreferencesStore()
    await prefs.load()
    applyReducedMotionDefault()

    app.mount('#app')

    const loader = document.getElementById('loader')
    if (loader) {
      loader.classList.add('fade-out')
      loader.addEventListener('transitionend', () => loader.remove())
    }
  })

// Cluster 12 — global Cmd+, / Ctrl+, opens the A8.3 Accessibility modal
// (matches Figma's keyboard shortcut convention, founder-ratified 2026-05-17).
window.addEventListener('keydown', (e) => {
  if (e.code !== 'Comma') return
  const isMod = e.metaKey || e.ctrlKey
  if (!isMod || e.altKey || e.shiftKey) return
  const target = e.target as HTMLElement | null
  if (target) {
    const tag = target.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) return
  }
  e.preventDefault()
  usePreferencesModal().open('accessibility')
})

if (!IS_TAURI) {
  void import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({ immediate: true })
  })
}
