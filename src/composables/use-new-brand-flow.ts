import { computed, ref } from 'vue'

import { useBrandsStore } from '@/stores/brands'

import type { Brand } from '@/types/kova/database'
import type { ComputedRef, Ref } from 'vue'

// W9b Cluster 03 — new-brand wizard state machine (Plan 03 Task 19).
//
// 4 steps: name-url → shopify → brand-kit → done. The first three steps
// hold the user's input; the brand is only committed to the server at
// `commitAndAdvance()` from the brand-kit step. After commit the wizard
// advances to step 4 with `brandId` populated for the "Enter <brand>" CTA.

export type WizardStep = 'name-url' | 'shopify' | 'brand-kit' | 'done'

const STEP_ORDER: readonly WizardStep[] = ['name-url', 'shopify', 'brand-kit', 'done'] as const

// M5: explicit Ref<T> / ComputedRef<T> instead of ReturnType<typeof ref<T>>.
// The wrapper form is fragile against Vue's internal type changes.
interface UseNewBrandFlow {
  step: Ref<WizardStep>
  name: Ref<string>
  url: Ref<string>
  description: Ref<string>
  brandId: Ref<string | null>
  isDirty: ComputedRef<boolean>
  isCommitting: Ref<boolean>
  advance: () => void
  back: () => void
  goTo: (target: WizardStep) => void
  commitAndAdvance: () => Promise<Brand | null>
  reset: () => void
}

export function useNewBrandFlow(): UseNewBrandFlow {
  const step = ref<WizardStep>('name-url')
  const name = ref<string>('')
  const url = ref<string>('')
  const description = ref<string>('')
  const brandId = ref<string | null>(null)
  const isCommitting = ref<boolean>(false)

  const isDirty = computed(
    () => name.value.length > 0 || url.value.length > 0 || description.value.length > 0
  )

  function advance(): void {
    const i = STEP_ORDER.indexOf(step.value)
    if (i >= 0 && i < STEP_ORDER.length - 1) {
      step.value = STEP_ORDER[i + 1]
    }
  }

  function back(): void {
    if (step.value === 'done') return // No back from terminal step.
    const i = STEP_ORDER.indexOf(step.value)
    if (i > 0) step.value = STEP_ORDER[i - 1]
  }

  function goTo(target: WizardStep): void {
    step.value = target
  }

  async function commitAndAdvance(): Promise<Brand | null> {
    if (brandId.value !== null) {
      // Already committed (e.g. user clicked twice). Idempotent — just advance.
      step.value = 'done'
      return null
    }
    const store = useBrandsStore()
    isCommitting.value = true
    try {
      const brand = await store.createBrandFromInput({
        name: name.value.trim(),
        url: url.value.trim().length > 0 ? url.value.trim() : null,
        description: description.value.trim().length > 0 ? description.value.trim() : null,
      })
      brandId.value = brand.id
      step.value = 'done'
      return brand
    } finally {
      isCommitting.value = false
    }
  }

  function reset(): void {
    step.value = 'name-url'
    name.value = ''
    url.value = ''
    description.value = ''
    brandId.value = null
    isCommitting.value = false
  }

  return {
    step,
    name,
    url,
    description,
    brandId,
    isDirty,
    isCommitting,
    advance,
    back,
    goTo,
    commitAndAdvance,
    reset,
  }
}
