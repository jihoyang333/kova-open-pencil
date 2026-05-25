// PRD 02 §6.3 + Plan T11 — onboarding wizard state machine.
//
// C-HIGH3 + B-MED15: useOnboarding() is the SINGLE entry point for the wizard.
// `state` is a Reactive<OnboardingState> backed by a module-scope singleton —
// every call returns the same instance. Templates write `v-model="state.field"`
// (no .value). Scripts read `state.field` (no .value). The M9-era
// provide('onboardingState')/inject pattern is RETIRED.

import { computed, reactive, ref, type ComputedRef, type Ref } from 'vue'
import { useRouter } from 'vue-router'

import { useBrandsStore } from '@/stores/brands'

export interface OnboardingState {
  brandName: string
  brandUrl: string
  industry: string
  tempBrandId: string
}

export const STEP_ORDER = ['brand', 'shopify', 'brand-kit', 'splash'] as const
export type OnboardingStep = (typeof STEP_ORDER)[number]
const DRAFT_KEY = 'kova:onboarding:draft'

interface DraftShape {
  step?: OnboardingStep
  brandName?: string
  brandUrl?: string
  industry?: string
  tempBrandId?: string
}

// Module-scope singletons — see file header.
const state = reactive<OnboardingState>({
  brandName: '',
  brandUrl: '',
  industry: '',
  tempBrandId: '',
})
const step = ref<OnboardingStep>('brand')
const isFinishing = ref(false)
const finishError = ref<string | null>(null)

export interface UseOnboarding {
  state: OnboardingState
  step: Ref<OnboardingStep>
  isFinishing: Ref<boolean>
  finishError: Ref<string | null>
  canProceed: ComputedRef<boolean>
  next: () => void
  prev: () => void
  complete: () => Promise<{ brandId: string }>
  persistDraft: () => void
  restoreDraft: () => void
}

export function useOnboarding(): UseOnboarding {
  const router = useRouter()
  const brands = useBrandsStore()

  const canProceed = computed(() => {
    if (step.value === 'brand') {
      return state.brandName.trim().length > 0 && state.brandUrl.trim().length > 0
    }
    // Other steps are advisory — Skip + Continue both unlock advance.
    return true
  })

  function next(): void {
    const idx = STEP_ORDER.indexOf(step.value)
    if (idx < STEP_ORDER.length - 1) {
      step.value = STEP_ORDER[idx + 1]!
    }
    persistDraft()
  }

  function prev(): void {
    const idx = STEP_ORDER.indexOf(step.value)
    if (idx > 0) {
      step.value = STEP_ORDER[idx - 1]!
    }
    persistDraft()
  }

  async function complete(): Promise<{ brandId: string }> {
    isFinishing.value = true
    finishError.value = null
    try {
      const brand = await brands.createBrand(state.brandName)
      sessionStorage.removeItem(DRAFT_KEY)
      await router.push(`/brand/${brand.id}`)
      return { brandId: brand.id }
    } catch (err) {
      finishError.value = err instanceof Error ? err.message : 'Something went wrong'
      throw err
    } finally {
      isFinishing.value = false
    }
  }

  function persistDraft(): void {
    sessionStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        step: step.value,
        brandName: state.brandName,
        brandUrl: state.brandUrl,
        industry: state.industry,
        tempBrandId: state.tempBrandId,
      })
    )
  }

  function restoreDraft(): void {
    const raw = sessionStorage.getItem(DRAFT_KEY)
    if (!raw) return
    let draft: DraftShape
    try {
      draft = JSON.parse(raw) as DraftShape
    } catch {
      sessionStorage.removeItem(DRAFT_KEY)
      return
    }
    if (draft.step && (STEP_ORDER as readonly string[]).includes(draft.step)) {
      step.value = draft.step
    }
    if (typeof draft.brandName === 'string') state.brandName = draft.brandName
    if (typeof draft.brandUrl === 'string') state.brandUrl = draft.brandUrl
    if (typeof draft.industry === 'string') state.industry = draft.industry
    if (typeof draft.tempBrandId === 'string') state.tempBrandId = draft.tempBrandId
  }

  return {
    state,
    step,
    isFinishing,
    finishError,
    canProceed,
    next,
    prev,
    complete,
    persistDraft,
    restoreDraft,
  }
}

// Test-only escape hatch: reset the module-scope singletons between specs.
export function _resetForTesting(): void {
  state.brandName = ''
  state.brandUrl = ''
  state.industry = ''
  state.tempBrandId = ''
  step.value = 'brand'
  isFinishing.value = false
  finishError.value = null
}
