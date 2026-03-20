<script setup lang="ts">
import { inject, onMounted, ref } from 'vue'

import type { useOnboardingState } from '@/composables/useOnboardingState'

const state = inject('onboardingState') as ReturnType<typeof useOnboardingState>
const inputRef = ref<HTMLInputElement | null>(null)

onMounted(() => {
  inputRef.value?.focus()
})
</script>

<template>
  <div data-test-id="onboarding-brand-name-step">
    <h1 class="text-2xl font-semibold text-gray-900">What's your brand name?</h1>
    <p class="mt-2 text-sm text-gray-500">This is how we'll identify your brand across Kova.</p>
    <input
      ref="inputRef"
      v-model="state.brandName.value"
      data-test-id="onboarding-brand-name-input"
      type="text"
      placeholder="Your brand name"
      class="mt-6 w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 transition-colors outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
    />
  </div>
</template>
