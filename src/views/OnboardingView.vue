<script setup lang="ts">
import { computed, provide, ref } from 'vue'

import { completeOnboarding } from '@/composables/useOnboardingComplete'
import { useOnboardingState } from '@/composables/useOnboardingState'

import BrandCard from '@/components/onboarding/BrandCard.vue'
import BrandNameStep from '@/components/onboarding/BrandNameStep.vue'
import BrandUrlStep from '@/components/onboarding/BrandUrlStep.vue'
import EmailWireframe from '@/components/onboarding/EmailWireframe.vue'
import ExtractionStep from '@/components/onboarding/ExtractionStep.vue'
import NameStep from '@/components/onboarding/NameStep.vue'
import ReviewStep from '@/components/onboarding/ReviewStep.vue'
import WelcomeStep from '@/components/onboarding/WelcomeStep.vue'

const state = useOnboardingState()
provide('onboardingState', state)

const isFinishing = ref(false)
const finishError = ref<string | null>(null)

const showBackButton = computed(() => state.currentStep.value > 1 && state.currentStep.value <= 6)
const showContinueButton = computed(() => {
  // Welcome has "Get Started" inside the step; Extraction auto-advances; Screen 7 is not visible
  return state.currentStep.value >= 2 && state.currentStep.value <= 4
})
const showFinishButton = computed(() => state.currentStep.value === 6)
const showRightEmailWireframe = computed(
  () => state.currentStep.value >= 1 && state.currentStep.value <= 4
)
const showRightBrandCard = computed(
  () => state.currentStep.value >= 5 && state.currentStep.value <= 6
)

const filledSegments = computed(() => {
  return Math.min(state.currentStep.value, 6)
})

function handleContinue(): void {
  if (state.canProceed.value) {
    state.next()
  }
}

function handleKeydown(e: KeyboardEvent): void {
  if (e.code === 'Enter' && showContinueButton.value && state.canProceed.value) {
    handleContinue()
  }
}

async function handleFinish(): Promise<void> {
  isFinishing.value = true
  finishError.value = null

  try {
    await completeOnboarding({
      name: state.name.value,
      brandName: state.brandName.value,
      colors: state.colors.value,
      fonts: state.fonts.value,
      voice: state.voice.value,
      logoFile: state.logoFile.value,
      logoUrl: state.logoUrl.value
    })
  } catch (err) {
    finishError.value = err instanceof Error ? err.message : 'Something went wrong'
  } finally {
    isFinishing.value = false
  }
}
</script>

<template>
  <div data-test-id="onboarding-view" class="flex h-screen" @keydown="handleKeydown">
    <!-- Left panel (38%) — white -->
    <div class="relative flex w-[38%] flex-col bg-white px-12 py-8">
      <!-- Back arrow -->
      <button
        v-if="showBackButton"
        data-test-id="onboarding-back"
        class="mb-8 flex size-10 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
        @click="state.back()"
      >
        <icon-lucide-arrow-left class="size-5" />
      </button>
      <div v-else class="mb-8 h-10" />

      <!-- Step content — upper third positioning -->
      <div class="flex flex-1 flex-col pt-8">
        <WelcomeStep v-if="state.currentStep.value === 1" @continue="state.next()" />
        <NameStep v-else-if="state.currentStep.value === 2" />
        <BrandNameStep v-else-if="state.currentStep.value === 3" />
        <BrandUrlStep v-else-if="state.currentStep.value === 4" @skip="state.skipToReview()" />
        <ExtractionStep v-else-if="state.currentStep.value === 5" @complete="state.next()" />
        <ReviewStep v-else-if="state.currentStep.value === 6" />
      </div>

      <!-- Bottom bar: progress + continue -->
      <div class="flex items-center justify-between pt-6">
        <!-- Progress bar -->
        <div class="flex gap-1">
          <div
            v-for="i in 7"
            :key="i"
            class="h-1 w-8 rounded-full transition-colors"
            :class="i <= filledSegments ? 'bg-blue-600' : 'bg-gray-200'"
          />
        </div>

        <!-- Continue button -->
        <button
          v-if="showContinueButton"
          data-test-id="onboarding-continue"
          class="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-opacity disabled:opacity-40"
          :disabled="!state.canProceed.value"
          @click="handleContinue"
        >
          Continue
        </button>

        <!-- Finish Setup button -->
        <div v-if="showFinishButton" class="flex flex-col items-end">
          <button
            data-test-id="onboarding-finish"
            class="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-opacity disabled:opacity-40"
            :disabled="isFinishing"
            @click="handleFinish"
          >
            {{ isFinishing ? 'Setting up...' : 'Finish Setup' }}
          </button>
          <p v-if="finishError" class="mt-2 text-sm text-red-500">{{ finishError }}</p>
        </div>
      </div>
    </div>

    <!-- Right panel (62%) — dark -->
    <div class="flex w-[62%] items-center justify-center bg-[#1e1e1e]">
      <EmailWireframe v-if="showRightEmailWireframe" />
      <BrandCard v-else-if="showRightBrandCard" />
    </div>
  </div>
</template>
