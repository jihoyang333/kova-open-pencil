<script setup lang="ts">
import { computed, provide, ref } from 'vue'

import { completeOnboarding } from '@/composables/useOnboardingComplete'
import { useOnboardingState } from '@/composables/useOnboardingState'

import BrandNameStep from '@/components/onboarding/BrandNameStep.vue'
import BrandUrlStep from '@/components/onboarding/BrandUrlStep.vue'
import ExtractionStep from '@/components/onboarding/ExtractionStep.vue'
import NameStep from '@/components/onboarding/NameStep.vue'
import OnboardingPreview from '@/components/onboarding/OnboardingPreview.vue'
import ReviewStep from '@/components/onboarding/ReviewStep.vue'
import WelcomeStep from '@/components/onboarding/WelcomeStep.vue'

function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'object' && err !== null && 'message' in err) {
    return String((err as Record<string, unknown>).message)
  }
  return 'Something went wrong. Please try again.'
}

const state = useOnboardingState()
provide('onboardingState', state)

const isFinishing = ref(false)
const finishError = ref<string | null>(null)

const VISIBLE_STEPS = 6

const showBackButton = computed(() => state.currentStep.value > 1 && state.currentStep.value <= 6)
const showBottomButton = computed(() => {
  // Show for steps 1-4 (Get Started / Continue) and step 6 (Finish Setup)
  return (
    (state.currentStep.value >= 1 && state.currentStep.value <= 4) || state.currentStep.value === 6
  )
})
const isFinishStep = computed(() => state.currentStep.value === 6)

const buttonText = computed(() => {
  if (state.currentStep.value === 1) return 'Get Started'
  if (state.currentStep.value === 6) return isFinishing.value ? 'Setting up...' : 'Finish Setup'
  return 'Continue'
})

const buttonEnabled = computed(() => {
  if (isFinishStep.value) return !isFinishing.value
  return state.canProceed.value
})

const progressPercent = computed(() => {
  return (Math.min(state.currentStep.value, VISIBLE_STEPS) / VISIBLE_STEPS) * 100
})

function handleButtonClick(): void {
  if (isFinishStep.value) {
    void handleFinish()
  } else if (state.canProceed.value) {
    state.next()
  }
}

function handleKeydown(e: KeyboardEvent): void {
  if (e.code === 'Enter' && showBottomButton.value && buttonEnabled.value) {
    handleButtonClick()
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
      industry: state.industry.value,
      logoFile: state.logoFile.value,
      logoUrl: state.logoUrl.value
    })
  } catch (err: unknown) {
    finishError.value = extractErrorMessage(err)
  } finally {
    isFinishing.value = false
  }
}
</script>

<template>
  <div data-test-id="onboarding-view" class="flex h-screen" @keydown="handleKeydown">
    <!-- Left panel (38%) — dark -->
    <div class="relative flex w-[38%] flex-col bg-[#2c2c2c] py-8 pr-10 pl-[60px]">
      <!-- Back arrow -->
      <button
        v-if="showBackButton"
        data-test-id="onboarding-back"
        aria-label="Go to previous step"
        class="mb-8 flex size-10 items-center justify-center rounded-lg text-[#999] transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
        @click="state.back()"
      >
        <icon-lucide-chevron-left class="size-5" />
      </button>
      <div v-else class="mb-8 h-10" />

      <!-- Step content with fade + slide-up transition -->
      <div class="flex flex-1 flex-col pt-8">
        <Transition
          enter-active-class="transition-all duration-300 ease-out"
          enter-from-class="translate-y-4 opacity-0"
          enter-to-class="translate-y-0 opacity-100"
          leave-active-class="transition-all duration-200 ease-in"
          leave-from-class="translate-y-0 opacity-100"
          leave-to-class="translate-y-4 opacity-0"
          mode="out-in"
        >
          <div :key="state.currentStep.value">
            <WelcomeStep v-if="state.currentStep.value === 1" />
            <NameStep v-else-if="state.currentStep.value === 2" />
            <BrandNameStep v-else-if="state.currentStep.value === 3" />
            <BrandUrlStep v-else-if="state.currentStep.value === 4" @skip="state.skipToReview()" />
            <ExtractionStep v-else-if="state.currentStep.value === 5" @complete="state.next()" />
            <ReviewStep v-else-if="state.currentStep.value === 6" />
          </div>
        </Transition>
      </div>

      <!-- Bottom bar: progress + button -->
      <div class="flex items-center justify-between pt-6">
        <!-- Continuous progress bar -->
        <div
          class="h-1 w-[45%] rounded-full bg-[#444]"
          role="progressbar"
          aria-live="polite"
          :aria-valuenow="Math.min(state.currentStep.value, VISIBLE_STEPS)"
          aria-valuemin="0"
          :aria-valuemax="VISIBLE_STEPS"
          :aria-label="`Progress: step ${Math.min(state.currentStep.value, VISIBLE_STEPS)} of ${VISIBLE_STEPS}`"
        >
          <div
            class="h-full rounded-full bg-accent transition-all duration-300 ease-in-out"
            :style="{ width: `${progressPercent}%` }"
          />
        </div>

        <!-- Action button -->
        <div v-if="showBottomButton" class="flex flex-col items-end">
          <button
            :data-test-id="
              isFinishStep
                ? 'onboarding-finish'
                : state.currentStep.value === 1
                  ? 'onboarding-get-started'
                  : 'onboarding-continue'
            "
            class="rounded-lg px-6 py-2.5 text-sm font-medium transition-colors duration-200"
            :class="
              buttonEnabled
                ? 'cursor-pointer bg-accent text-white hover:bg-blue-400'
                : 'cursor-not-allowed bg-[#4b4b4b] text-white/40'
            "
            :disabled="!buttonEnabled"
            @click="handleButtonClick"
          >
            {{ buttonText }}
          </button>
          <p v-if="finishError" role="alert" class="mt-2 text-sm text-red-400">{{ finishError }}</p>
        </div>
      </div>
    </div>

    <!-- Right panel (62%) — darker -->
    <div class="flex w-[62%] items-center justify-center bg-canvas">
      <OnboardingPreview :step="state.currentStep.value" />
    </div>
  </div>
</template>
