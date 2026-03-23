import { computed, ref } from 'vue'

import { isValidUrl } from '@/utils/onboarding-validators'

import type { BrandColors, BrandFonts } from '@/types/kova/database'

const TOTAL_STEPS = 6

export function useOnboardingState() {
  const currentStep = ref(1)
  const name = ref('')
  const brandName = ref('')
  const brandUrl = ref('')
  const logoFile = ref<File | null>(null)
  const logoUrl = ref<string | null>(null)
  const colors = ref<BrandColors | null>(null)
  const fonts = ref<BrandFonts | null>(null)
  const voice = ref<string | null>(null)

  const canProceed = computed(() => {
    switch (currentStep.value) {
      case 1:
        return true
      case 2:
        return name.value.trim().length > 0
      case 3:
        return brandName.value.trim().length > 0
      case 4:
        return isValidUrl(brandUrl.value)
      case 5:
        return true
      case 6:
        return true
      default:
        return false
    }
  })

  const progress = computed(() => currentStep.value / TOTAL_STEPS)

  function next(): void {
    if (currentStep.value < TOTAL_STEPS) {
      currentStep.value += 1
    }
  }

  function back(): void {
    if (currentStep.value > 1) {
      currentStep.value -= 1
    }
  }

  function goTo(step: number): void {
    currentStep.value = Math.max(1, Math.min(TOTAL_STEPS, step))
  }

  function skipToReview(): void {
    currentStep.value = 6
  }

  return {
    currentStep,
    name,
    brandName,
    brandUrl,
    logoFile,
    logoUrl,
    colors,
    fonts,
    voice,
    canProceed,
    progress,
    totalSteps: TOTAL_STEPS,
    next,
    back,
    goTo,
    skipToReview
  }
}
