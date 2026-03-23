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
    <h1 class="text-3xl font-bold text-white">What's your brand called?</h1>
    <p class="mt-3 text-base text-[#999]">This is the brand you're designing emails for.</p>
    <input
      ref="inputRef"
      v-model="state.brandName.value"
      data-test-id="onboarding-brand-name-input"
      type="text"
      placeholder="e.g. Lumière Skincare"
      aria-label="Brand name"
      class="mt-8 w-full rounded-lg border border-[#555] bg-[#383838] px-4 py-3 text-white placeholder-[#aaa] transition-colors outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
    />
  </div>
</template>
