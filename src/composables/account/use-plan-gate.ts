// PRD 04 §6.3 — usePlanGate (STUB at MVP).
//
// Returns allowed=true for everything until founder activates pricing
// (PLAN_GATE_ENFORCED flag in @/constants/billing-plans). When flipped on,
// upgrade this to consult plan + usage counters.

import { computed } from 'vue'

import { PLAN_GATE_ENFORCED } from '@/constants/billing-plans'
import { useBillingStore } from '@/stores/billing'

export type GateFeature =
  | 'extra_brand'
  | 'ai_generation'
  | 'unlimited_versions'
  | 'priority_support'

export function usePlanGate() {
  const billing = useBillingStore()
  const enforced = computed(() => PLAN_GATE_ENFORCED)

  function isAllowed(_feature: GateFeature): boolean {
    if (!enforced.value) return true
    // Stub future logic: switch on plan + usage counter.
    return billing.plan !== 'free'
  }

  return { isAllowed, enforced }
}
