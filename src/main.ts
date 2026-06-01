import { createHead } from '@unhead/vue/client'
import { createPinia } from 'pinia'
import { createApp } from 'vue'
import { createWebHistory } from 'vue-router'

import './app.css'
import { IS_TAURI } from '@/constants'
import { preloadFonts } from '@/engine/fonts'
import { createAppRouter } from '@/router'
import { initBrowserSentry } from '@/sentry'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { usePreferencesStore } from '@/stores/preferences'
import { useToolRegistry } from '@/stores/tool-registry'
import { useRightPanelStore } from '@/stores/right-panel'
import { useEditorStore } from '@/stores/editor'
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

// Cluster 06 Task 4 — register the 8 default bottom-toolbar tools.
// Slice (frame dropdown) + Measurement (primary slot) are registered by
// Cluster 07a at app init (canvas-extensions). Per W0-4 lock, ToolDef.icon
// is a KovaIcon registry name; no `i-lucide-*` / `<icon-lucide-*>` raw tags.
function registerDefaultTools(): void {
  const registry = useToolRegistry()
  const editor = () => useEditorStore()
  const rightPanel = () => useRightPanelStore()

  registry.register({
    id: 'move',
    slot: 'move',
    icon: 'mouse-pointer-2',
    label: 'Move',
    key: 'V',
    onActivate: () => editor().setTool('SELECT'),
  })
  registry.register({
    id: 'frame',
    slot: 'frame',
    icon: 'frame',
    label: 'Frame',
    key: 'F',
    onActivate: () => editor().setTool('FRAME'),
  })
  registry.register({
    id: 'rectangle',
    slot: 'rectangle',
    icon: 'square',
    label: 'Rectangle',
    key: 'R',
    onActivate: () => editor().setTool('RECTANGLE'),
  })
  registry.register({
    id: 'ellipse',
    slot: 'ellipse',
    icon: 'circle',
    label: 'Ellipse',
    key: 'O',
    onActivate: () => editor().setTool('ELLIPSE'),
  })
  registry.register({
    id: 'pen',
    slot: 'pen',
    icon: 'pen-tool',
    label: 'Pen',
    key: 'P',
    onActivate: () => editor().setTool('PEN'),
  })
  registry.register({
    id: 'text',
    slot: 'text',
    icon: 'type',
    label: 'Text',
    key: 'T',
    onActivate: () => editor().setTool('TEXT'),
  })
  registry.register({
    id: 'ai',
    slot: 'ai',
    icon: 'sparkles',
    label: 'Ask Kova',
    onActivate: () => rightPanel().setActiveTab('ai'),
  })
  registry.register({
    id: 'components',
    slot: 'components',
    icon: 'component',
    label: 'Components',
    disabled: true,
    tooltip: 'Components — Phase 2',
    onActivate: () => {},
  })
}

registerDefaultTools()

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

    // Reload prefs on subsequent SIGNED_IN (account switch / re-login);
    // reset to DEFAULTS on SIGNED_OUT so the next user doesn't ghost the
    // previous user's prefs on <html data-*>.
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        void prefs.load()
      } else if (event === 'SIGNED_OUT') {
        prefs.reset()
      }
    })
  })

// Cluster 12 — global Cmd+, / Ctrl+, opens the A8.3 Accessibility modal
// (matches Figma's keyboard shortcut convention, founder-ratified 2026-05-17).
//
// The listener attaches at module load, before app.mount() resolves. During
// the brief auth-resolve window before <PreferencesModal /> mounts,
// usePreferencesModal().open() flips reactive state but renders nothing
// visually; once the modal mounts it reads the now-true isOpen and appears.
// No-op-then-activate is intentional — no early-keydown swallow needed.
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
