<script setup lang="ts">
// PRD 04 §6.4.1 / Phase 12.1 — Danger zone section (A7.6).
// Mounts Cluster 01's DangerZoneCard when present; falls back to stub.

import { defineAsyncComponent } from 'vue'

import KovaIcon from '@/components/ui/KovaIcon.vue'
import AccountSectionHeader from '@/components/account/AccountSectionHeader.vue'

const DangerZoneCard = defineAsyncComponent({
  loader: () => import('@/components/account/DangerZoneCard.vue').catch(() => ({
    default: { render: () => null },
  })),
})
</script>

<template>
  <section class="acc-section">
    <AccountSectionHeader title="Danger zone" subtitle="Irreversible actions." />
    <Suspense>
      <DangerZoneCard />
      <template #fallback>
        <div class="acc-danger-stub">
          <KovaIcon name="alert-triangle" size="lg" class="acc-danger-stub-ic" />
          <p>Account deletion flow ships with Cluster 01.</p>
          <p class="mono">DangerZoneCard pending</p>
        </div>
      </template>
    </Suspense>
  </section>
</template>
