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
    <h1 class="text-3xl font-bold text-white">What's your brand's website?</h1>
    <p class="mt-3 text-base text-[#999]">
      We'll use this to extract your colors, fonts, and logo automatically.
    </p>
    <input
      ref="inputRef"
      v-model="state.brandUrl.value"
      data-test-id="onboarding-brand-url-input"
      type="text"
      placeholder="e.g. lumiere-skincare.com"
      aria-label="Brand website URL"
      class="mt-8 w-full rounded-lg border border-[#555] bg-[#383838] px-4 py-3 text-white placeholder-[#aaa] transition-colors outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
    />
    <button
      data-test-id="onboarding-skip-extraction"
      class="mt-4 text-sm text-[#999] transition-colors hover:text-white"
      @click="emit('skip')"
    >
      I don't have a website
    </button>
  </div>
</template>
