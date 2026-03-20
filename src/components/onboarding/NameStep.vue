<script setup lang="ts">
import { inject, onMounted, ref } from 'vue'

import { useAuthStore } from '@/stores/auth'

import type { useOnboardingState } from '@/composables/useOnboardingState'

const state = inject('onboardingState') as ReturnType<typeof useOnboardingState>
const inputRef = ref<HTMLInputElement | null>(null)

// Reviewer fix #5: Pre-fill name from Google OAuth metadata
onMounted(() => {
  const authStore = useAuthStore()
  if (!state.name.value) {
    const oauthName = authStore.user?.user_metadata?.full_name as string | undefined
    if (oauthName) {
      state.name.value = oauthName
    }
  }
  inputRef.value?.focus()
})
</script>

<template>
  <div data-test-id="onboarding-name-step">
    <h1 class="text-2xl font-semibold text-gray-900">What's your name?</h1>
    <p class="mt-2 text-sm text-gray-500">This is how you'll appear in Kova.</p>
    <input
      ref="inputRef"
      v-model="state.name.value"
      data-test-id="onboarding-name-input"
      type="text"
      placeholder="Your name"
      class="mt-6 w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 transition-colors outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
    />
  </div>
</template>
