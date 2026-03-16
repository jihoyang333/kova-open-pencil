import { createPinia } from 'pinia'
import { createHead } from '@unhead/vue/client'
import { createApp } from 'vue'

import './app.css'
import { IS_TAURI } from '@/constants'
import { preloadFonts } from '@/engine/fonts'
import { useAuthStore } from '@/stores/auth'

import App from './App.vue'
import router from './router'

preloadFonts()

const pinia = createPinia()
const head = createHead()
const app = createApp(App)

app.use(pinia).use(router).use(head)

// Initialize auth store before mounting — prevents flash of unauthenticated content.
// Pinia must be installed via app.use(pinia) before calling useAuthStore().
const auth = useAuthStore()
auth.initialize().finally(() => {
  app.mount('#app')
})

if (!IS_TAURI) {
  void import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({ immediate: true })
  })
}
