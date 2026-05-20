import { createHead } from '@unhead/vue/client'
import { createPinia } from 'pinia'
import { createApp } from 'vue'
import { createWebHistory } from 'vue-router'

import './app.css'
import { IS_TAURI } from '@/constants'
import { preloadFonts } from '@/engine/fonts'
import { createAppRouter } from '@/router'
import { registerProductVariantOverlay } from '@/canvas-extensions/product-variant/register'
import { useAuthStore } from '@/stores/auth'
import { installSentry } from '@/sentry'

import App from './App.vue'

preloadFonts()

const pinia = createPinia()
const head = createHead()
const router = createAppRouter(createWebHistory())
const app = createApp(App)

// Cluster 11 — Vue global error handler routes uncaught errors to /500.
// Sentry install is a no-op when VITE_SENTRY_DSN_BROWSER is unset (stub mode).
app.config.errorHandler = (err, _instance, info) => {
  console.error('[vue errorHandler]', err, info)
  void router.replace('/500')
}

app.use(pinia).use(router).use(head)
installSentry(app, router)
registerProductVariantOverlay()

// Initialize auth store before mounting — prevents flash of unauthenticated content.
// Pinia must be installed via app.use(pinia) before calling useAuthStore().
const auth = useAuthStore()
void auth.initialize().finally(() => {
  app.mount('#app')

  // Remove the static HTML loader from index.html
  const loader = document.getElementById('loader')
  if (loader) {
    loader.classList.add('fade-out')
    loader.addEventListener('transitionend', () => loader.remove())
  }
})

if (!IS_TAURI) {
  void import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({ immediate: true })
  })
}
