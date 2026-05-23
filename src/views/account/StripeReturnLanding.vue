<script setup lang="ts">
// PRD 04 §6.4.4 / Phase 12.2 — Stripe return landing (B10.1 success + B10.2 cancel).

import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

import KovaIcon from '@/components/ui/KovaIcon.vue'
import { useStripeReturn } from '@/composables/account/use-stripe-return'

const router = useRouter()
const ret = useStripeReturn()

onMounted(async () => {
  await ret.hydrateAfterCheckout()
})

function goDashboard(): void {
  void router.push({ name: 'dashboard' }).catch(() => {
    void router.push('/')
  })
}

function goBilling(): void {
  void router.push({ name: 'account', params: { section: 'billing' } })
}

function tryAgain(): void {
  void router.push({ name: 'account', params: { section: 'billing' } })
}
</script>

<template>
  <div class="err-page">
    <article v-if="ret.state.value === 'success'" class="err-card">
      <div class="err-icon-tile is-ok">
        <KovaIcon name="check-circle" size="lg" />
      </div>
      <h1>You're on your new plan</h1>
      <p>Your subscription is active. Welcome aboard.</p>
      <div class="err-cta-stack">
        <button type="button" class="btn primary" @click="goDashboard">
          Go to dashboard
          <KovaIcon name="arrow-right" size="sm" />
        </button>
        <button type="button" class="btn ghost" @click="goBilling">View plan details</button>
      </div>
    </article>

    <article v-else-if="ret.state.value === 'cancelled'" class="err-card">
      <div class="err-icon-tile">
        <KovaIcon name="arrow-left" size="lg" />
      </div>
      <h1>Checkout cancelled</h1>
      <p>No charge was made. You can try again whenever you're ready.</p>
      <div class="err-cta-stack">
        <button type="button" class="btn primary" @click="tryAgain">
          Try again
          <KovaIcon name="arrow-right" size="sm" />
        </button>
        <button type="button" class="btn ghost" @click="goDashboard">Back to dashboard</button>
      </div>
    </article>

    <article v-else class="err-card">
      <h1>Unknown state</h1>
      <p>This page is reached from Stripe Checkout. Returning to the dashboard.</p>
      <button type="button" class="btn primary" @click="goDashboard">Dashboard</button>
    </article>
  </div>
</template>
