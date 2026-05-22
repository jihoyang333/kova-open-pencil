<!-- token-exempt-file: Auth-shell view. Px values match A15 auth-shell convention (cluster-01-tokens-used.md §3-§5). -->
<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth'

// W8a Cluster 01 — handles both magic-link AND Google OAuth completion.
// Supabase's auth client parses the URL hash + populates the session
// automatically. We watch the store's isAuthenticated flag and route to
// /onboarding (new user) or /dashboard (existing). 5s timeout falls back
// to /login?status=callback_failed.

const CALLBACK_TIMEOUT_MS = 5_000

const router = useRouter()
const auth = useAuthStore()

let timeoutId: ReturnType<typeof setTimeout> | null = null
let stopWatcher: (() => void) | null = null

function routeAfterAuth(): void {
  if (timeoutId !== null) {
    clearTimeout(timeoutId)
    timeoutId = null
  }
  const next = auth.isOnboarded ? '/dashboard' : '/onboarding'
  void router.replace(next)
}

onMounted(() => {
  if (auth.isAuthenticated) {
    routeAfterAuth()
    return
  }
  stopWatcher = watch(
    () => auth.isAuthenticated,
    (next) => {
      if (next) routeAfterAuth()
    }
  )
  timeoutId = setTimeout(() => {
    void router.replace({ path: '/login', query: { status: 'callback_failed' } })
  }, CALLBACK_TIMEOUT_MS)
})

onUnmounted(() => {
  if (timeoutId !== null) clearTimeout(timeoutId)
  if (stopWatcher) stopWatcher()
})
</script>

<template>
  <div data-theme="light" class="flex min-h-screen items-center justify-center bg-page text-ink">
    <div class="flex flex-col items-center gap-3">
      <div
        class="size-8 animate-spin rounded-full border-2 border-line border-t-ink"
        aria-hidden="true"
      />
      <p class="text-[13px] text-ink-2">Signing you in...</p>
    </div>
  </div>
</template>
