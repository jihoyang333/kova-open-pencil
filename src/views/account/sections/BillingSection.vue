<script setup lang="ts">
// PRD 04 §6.4.1 / Phase 9 — Plan & billing section (A7.2).

import { onMounted } from 'vue'

import AccountSectionHeader from '@/components/account/AccountSectionHeader.vue'
import PlanCard from '@/components/account/PlanCard.vue'
import UsageBar from '@/components/account/UsageBar.vue'
import InvoiceTable from '@/components/account/InvoiceTable.vue'
import PastDueBanner from '@/components/account/PastDueBanner.vue'
import TrialBanner from '@/components/account/TrialBanner.vue'
import { useBillingStore } from '@/stores/billing'
import { toast } from '@/composables/use-toast'

const billing = useBillingStore()

onMounted(async () => {
  await billing.loadFromUser()
  await billing.fetchInvoices()
})

async function openCheckout(plan: 'solo' | 'agency'): Promise<void> {
  const successUrl = `${window.location.origin}/account/billing/success`
  const cancelUrl = `${window.location.origin}/account/billing/cancel`
  const url = await billing.openCheckout(`__PRICE_${plan.toUpperCase()}__`, successUrl, cancelUrl)
  if (url !== null) window.location.href = url
}

async function openPortal(): Promise<void> {
  const url = await billing.openPortal(`${window.location.origin}/account/billing`)
  if (url !== null) window.open(url, '_blank', 'noopener,noreferrer')
}

function comparePlans(): void {
  toast.show('Pricing coming soon.')
}
</script>

<template>
  <section class="acc-section">
    <AccountSectionHeader title="Plan & billing" subtitle="Manage your subscription, view invoices, and update billing details." />

    <TrialBanner :visible="billing.isTrialing" :days-left="billing.daysUntilTrialEnds" @upgrade="openCheckout('solo')" />

    <PastDueBanner v-if="billing.isPastDue" :deadline-iso="billing.pastDueDeadline" @update-payment="openPortal" />

    <PlanCard
      :plan="billing.plan"
      :status="billing.planStatus"
      :cancel-at-period-end="billing.cancelAtPeriodEnd"
      :current-period-end="billing.currentPeriodEnd"
      @manage="openPortal"
      @compare-plans="comparePlans"
    />

    <div class="acc-usage-grid">
      <UsageBar label="AI generations (this month)" :used="0" :cap="200" />
      <UsageBar label="Storage" :used="0" :cap="5 * 1024 * 1024 * 1024" unit="bytes" />
    </div>

    <InvoiceTable :invoices="billing.invoices" />

    <div v-if="billing.plan === 'free'" class="acc-upgrade-cta">
      <button type="button" class="btn primary" @click="openCheckout('solo')">Upgrade to Solo</button>
      <button type="button" class="btn" @click="openCheckout('agency')">Upgrade to Agency</button>
    </div>
  </section>
</template>
