// PRD 04 §6.2.1 — useBillingStore.
//
// Holds Stripe subscription state mirrored from users table. Exposes:
//   - openCheckout(plan): POST /api/stripe/checkout-session → redirect
//   - openPortal(returnUrl): POST /api/stripe/portal-session → new tab
//   - fetchInvoices(): GET /api/stripe/invoices
//   - state: plan, planStatus, currentPeriodEnd, cancelAtPeriodEnd

import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { supabase } from '@/lib/supabase'
import { toast } from '@/composables/use-toast'
import type { PlanName, PlanStatus } from '@/constants/billing-plans'

export interface InvoiceItem {
  id: string
  created_iso: string
  description: string | null
  amount_paid_cents: number
  currency: string
  status: string
  hosted_invoice_url: string | null
  invoice_pdf: string | null
}

export const useBillingStore = defineStore('billing', () => {
  const plan = ref<PlanName>('free')
  const planStatus = ref<PlanStatus>('active')
  const currentPeriodEnd = ref<string | null>(null)
  const cancelAtPeriodEnd = ref(false)
  const stripeCustomerId = ref<string | null>(null)
  const invoices = ref<readonly InvoiceItem[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const isPastDue = computed(() => planStatus.value === 'past_due')
  const isCancelled = computed(() => planStatus.value === 'cancelled')
  const isTrialing = computed(() => planStatus.value === 'trialing')
  const hasActiveSubscription = computed(() =>
    stripeCustomerId.value !== null && planStatus.value !== 'cancelled'
  )

  const daysUntilTrialEnds = computed(() => {
    if (!isTrialing.value || currentPeriodEnd.value === null) return null
    const ms = new Date(currentPeriodEnd.value).getTime() - Date.now()
    return ms > 0 ? Math.ceil(ms / 86_400_000) : 0
  })

  const pastDueDeadline = computed(() => {
    if (!isPastDue.value || currentPeriodEnd.value === null) return null
    return new Date(new Date(currentPeriodEnd.value).getTime() + 7 * 86_400_000).toISOString()
  })

  async function loadFromUser(): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user === null) {
        error.value = 'not_authenticated'
        return
      }
      const { data, error: dbErr } = await supabase
        .from('users')
        .select('plan, plan_status, current_period_end, cancel_at_period_end, stripe_customer_id')
        .eq('id', user.id)
        .maybeSingle()
      if (dbErr || data === null) {
        error.value = dbErr?.message ?? 'no_user_row'
        console.error(`[useBillingStore.loadFromUser] ${dbErr?.code ?? 'no_row'}: ${dbErr?.message ?? 'no user row'}`)
        toast.show('Couldn’t load billing.', 'error')
        return
      }
      plan.value = (data.plan ?? 'free') as PlanName
      planStatus.value = (data.plan_status ?? 'active') as PlanStatus
      currentPeriodEnd.value = data.current_period_end ?? null
      cancelAtPeriodEnd.value = data.cancel_at_period_end ?? false
      stripeCustomerId.value = data.stripe_customer_id ?? null
    } finally {
      isLoading.value = false
    }
  }

  async function fetchInvoices(): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession()
    if (session === null) return
    const res = await fetch('/api/stripe/invoices', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    if (!res.ok) {
      error.value = 'invoices_fetch_failed'
      console.error(`[useBillingStore.fetchInvoices] http_${res.status}`)
      toast.show('Couldn’t load invoices.', 'error')
      return
    }
    const body = await res.json() as { invoices: InvoiceItem[] }
    invoices.value = body.invoices
  }

  async function openCheckout(priceId: string, successUrl: string, cancelUrl: string): Promise<string | null> {
    const { data: { session } } = await supabase.auth.getSession()
    if (session === null) {
      error.value = 'not_authenticated'
      return null
    }
    const res = await fetch('/api/stripe/checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ price_id: priceId, success_url: successUrl, cancel_url: cancelUrl }),
    })
    if (!res.ok) {
      error.value = 'checkout_failed'
      console.error(`[useBillingStore.openCheckout] http_${res.status}`)
      toast.show('Couldn’t start checkout. Please try again.', 'error')
      return null
    }
    const body = await res.json() as { url: string }
    return body.url
  }

  async function openPortal(returnUrl: string): Promise<string | null> {
    const { data: { session } } = await supabase.auth.getSession()
    if (session === null) {
      error.value = 'not_authenticated'
      toast.show('Sign in required.', 'warning')
      return null
    }
    const res = await fetch('/api/stripe/portal-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ return_url: returnUrl }),
    })
    if (!res.ok) {
      error.value = 'portal_failed'
      console.error(`[useBillingStore.openPortal] http_${res.status}`)
      toast.show('Couldn’t open customer portal. Please try again.', 'error')
      return null
    }
    const body = await res.json() as { url: string }
    return body.url
  }

  function $reset(): void {
    plan.value = 'free'
    planStatus.value = 'active'
    currentPeriodEnd.value = null
    cancelAtPeriodEnd.value = false
    stripeCustomerId.value = null
    invoices.value = []
    isLoading.value = false
    error.value = null
  }

  return {
    plan,
    planStatus,
    currentPeriodEnd,
    cancelAtPeriodEnd,
    stripeCustomerId,
    invoices,
    isLoading,
    error,
    isPastDue,
    isCancelled,
    isTrialing,
    hasActiveSubscription,
    daysUntilTrialEnds,
    pastDueDeadline,
    loadFromUser,
    fetchInvoices,
    openCheckout,
    openPortal,
    $reset,
  }
})
