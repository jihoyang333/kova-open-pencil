<script setup lang="ts">
import { onMounted } from 'vue'
import { useHead } from '@unhead/vue'

import AppToast from '@/components/AppToast.vue'
import ConfirmModal from '@/components/ui/ConfirmModal.vue'
import ToastStack from '@/components/ui/ToastStack.vue'
import PreferencesModal from '@/components/settings/PreferencesModal.vue'
import { APP_NAME } from '@/constants'
import { toast } from '@/composables/use-toast'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()

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
    <img src="/favicon-128.png" :alt="APP_NAME" class="size-12 animate-pulse rounded-xl" />
  </div>

  <!-- App ready -->
  <template v-else>
    <RouterView />
    <AppToast />
    <ToastStack />
    <ConfirmModal />
    <PreferencesModal />
  </template>
</template>
