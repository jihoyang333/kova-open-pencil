<script setup lang="ts">
import { onMounted } from 'vue'
import { useHead } from '@unhead/vue'

import { APP_NAME } from '@/constants'
import { toast } from '@/composables/use-toast'
import { useAuthStore } from '@/stores/auth'
import { useTheme } from '@/composables/use-theme'
import ToastStack from '@/components/ui/ToastStack.vue'
import ConfirmModal from '@/components/ui/ConfirmModal.vue'
import NetworkStatusIndicator from '@/components/ui/NetworkStatusIndicator.vue'

const auth = useAuthStore()

// Cluster 11 — route-driven theme swap. Dark default; auth/marketing routes
// opt in to light via `meta: { theme: 'light' }`.
useTheme()

useHead({ titleTemplate: (title) => (title ? `${title} — ${APP_NAME}` : APP_NAME) })

onMounted(() => {
  toast.setupGlobalErrorHandler()
})
</script>

<template>
  <!-- Loading state: centered logo with pulse -->
  <div
    v-if="auth.isLoading"
    data-test-id="app-loading-overlay"
    class="flex min-h-screen items-center justify-center bg-white"
  >
    <img
      src="/favicon-128.png"
      :alt="APP_NAME"
      class="size-12 animate-pulse rounded-xl"
    />
  </div>

  <!-- App ready -->
  <template v-else>
    <RouterView />
    <!-- Cluster 11 global mounts (C-MED-11.5). NetworkStatusIndicator is a
         no-op when online; the offline icon+tooltip floats top-right via its
         own absolute positioning. -->
    <ToastStack />
    <ConfirmModal />
    <div class="fixed right-4 top-4 z-50 pointer-events-none">
      <div class="pointer-events-auto">
        <NetworkStatusIndicator />
      </div>
    </div>
  </template>
</template>
