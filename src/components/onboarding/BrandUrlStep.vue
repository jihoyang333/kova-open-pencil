<script setup lang="ts">
import { inject, onMounted, ref } from 'vue'

import type { useOnboardingState } from '@/composables/useOnboardingState'

const state = inject('onboardingState') as ReturnType<typeof useOnboardingState>
const inputRef = ref<HTMLInputElement | null>(null)

const emit = defineEmits<{
  skip: []
}>()

onMounted(() => {
  inputRef.value?.focus()
})
</script>

<template>
  <div data-test-id="onboarding-brand-url-step">
    <h1 class="text-2xl font-semibold text-gray-900">What's your brand's website?</h1>
    <p class="mt-2 text-sm text-gray-500">
      We'll use this to automatically extract your brand colors, fonts, and logo.
    </p>
    <input
      ref="inputRef"
      v-model="state.brandUrl.value"
      data-test-id="onboarding-brand-url-input"
      type="text"
      placeholder="example.com"
      class="mt-6 w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 transition-colors outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
    />
    <button
      data-test-id="onboarding-skip-extraction"
      class="mt-4 text-sm text-gray-400 transition-colors hover:text-gray-600"
      @click="emit('skip')"
    >
      I don't have a website — enter manually
    </button>
  </div>
</template>
