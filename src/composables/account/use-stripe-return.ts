// PRD 04 §6.3 — useStripeReturn.
//
// Parses the success/cancel landing query string and synchronizes the
// billing store after Stripe Checkout returns. Surfaces a friendly state
// for B10.1/B10.2 landings.

import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'

import { useBillingStore } from '@/stores/billing'

export type StripeReturnState = 'success' | 'cancelled' | 'unknown'

export function useStripeReturn() {
  const route = useRoute()
  const billing = useBillingStore()
  const isHydrating = ref(false)

  const state = computed<StripeReturnState>(() => {
    const name = (route.name ?? '') as string
    if (name === 'account-billing-success') return 'success'
    if (name === 'account-billing-cancel') return 'cancelled'
    return 'unknown'
  })

  const sessionId = computed<string | null>(() => {
    const raw = route.query.session_id
    return typeof raw === 'string' && raw !== '' ? raw : null
  })

  async function hydrateAfterCheckout(): Promise<void> {
    if (state.value !== 'success') return
    isHydrating.value = true
    try {
      await billing.loadFromUser()
    } finally {
      isHydrating.value = false
    }
  }

  return { state, sessionId, isHydrating, hydrateAfterCheckout }
}
