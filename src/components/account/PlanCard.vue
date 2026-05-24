<script setup lang="ts">
// PRD 04 §6.4.2 — Plan card with 5 status pill variants (incl. Trial).

import { computed } from 'vue'

import KovaIcon from '@/components/ui/KovaIcon.vue'
import { PLAN_INFO, type PlanName, type PlanStatus } from '@/constants/billing-plans'

interface Props {
  plan: PlanName
  status: PlanStatus
  cancelAtPeriodEnd: boolean
  currentPeriodEnd: string | null
}
const { plan, status, cancelAtPeriodEnd, currentPeriodEnd } = defineProps<Props>()
defineEmits<{ manage: []; comparePlans: [] }>()

const info = computed(() => PLAN_INFO[plan])

const statusLabel = computed(() => {
  switch (status) {
    case 'active': return cancelAtPeriodEnd ? 'Cancels soon' : 'Active'
    case 'past_due': return 'Past due'
    case 'cancelled': return 'Cancelled'
    case 'incomplete': return 'Incomplete'
    case 'trialing': return 'Trial'
  }
})

const statusVariant = computed(() => {
  switch (status) {
    case 'active': return cancelAtPeriodEnd ? 'warn' : 'ok'
    case 'past_due': return 'warn'
    case 'cancelled': return 'outline'
    case 'incomplete': return 'warn'
    case 'trialing': return 'accent'
  }
})

const periodEndDisplay = computed(() => {
  if (currentPeriodEnd === null) return ''
  return new Date(currentPeriodEnd).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
})
</script>

<template>
  <article class="plan-card">
    <header class="plan-card-head">
      <div>
        <h2 class="plan-card-name">{{ info.displayName }}</h2>
        <p class="plan-card-price">${{ info.monthlyUsd }} / month</p>
      </div>
      <span class="pill" :class="`pill-${statusVariant}`">
        <span class="pill-dot" aria-hidden="true" />
        {{ statusLabel }}
      </span>
    </header>
    <ul class="plan-card-features">
      <li v-for="feat in info.features" :key="feat">
        <KovaIcon name="check" size="sm" class="plan-card-check" />
        {{ feat }}
      </li>
    </ul>
    <footer class="plan-card-foot">
      <button type="button" class="btn primary" @click="$emit('manage')">
        Manage billing
      </button>
      <button type="button" class="btn ghost" @click="$emit('comparePlans')">
        Compare plans
      </button>
      <span v-if="periodEndDisplay !== ''" class="plan-card-renew">Renews {{ periodEndDisplay }}</span>
    </footer>
  </article>
</template>
