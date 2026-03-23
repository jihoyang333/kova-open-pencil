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
    <h1 class="text-3xl font-bold text-white">What's your name?</h1>
    <p class="mt-3 text-base text-[#999]">This is how you'll appear in Kova.</p>
    <input
      ref="inputRef"
      v-model="state.name.value"
      data-test-id="onboarding-name-input"
      type="text"
      placeholder="e.g. Jiho Yang"
      aria-label="Your name"
      class="mt-8 w-full rounded-lg border border-[#555] bg-[#383838] px-4 py-3 text-white placeholder-[#aaa] transition-colors outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
    />
  </div>
</template>
