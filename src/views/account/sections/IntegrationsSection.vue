<script setup lang="ts">
// PRD 04 §6.4.5 / Phase 11 — Integrations section (M9 refactor wrapper).
// Mounts the existing Shopify integration card adapted for the dark account
// theme. Full extraction (IntegrationCard / SyncHistoryAccordion) lands as
// Cluster 04 follow-up; for now reuse the M9 SettingsBrandIntegrationsView
// component scoped to the brand-picker selection.
//
// No top-level await (audit L-6, 2026-06-06): picker loads on mount; the
// template shows the empty-state stub while brands are still loading.

import { defineAsyncComponent, onMounted } from 'vue'

import AccountSectionHeader from '@/components/account/AccountSectionHeader.vue'
import BrandPicker from '@/components/account/BrandPicker.vue'
import { useBrandPicker } from '@/composables/account/use-brand-picker'

const ShopifyIntegrationsCard = defineAsyncComponent(() =>
  import('@/components/dashboard/IntegrationsCard.vue').catch(() => ({
    default: { render: () => null },
  }))
)

const picker = useBrandPicker()
onMounted(() => { void picker.load() })
</script>

<template>
  <section class="acc-section">
    <AccountSectionHeader title="Integrations" subtitle="Connect Shopify and other tools.">
      <template #trailing>
        <BrandPicker />
      </template>
    </AccountSectionHeader>

    <div v-if="picker.selectedBrandId.value === null" class="acc-stub">
      <p>Add a brand to manage integrations.</p>
    </div>
    <template v-else>
      <ShopifyIntegrationsCard :brand-id="picker.selectedBrandId.value" />
    </template>
  </section>
</template>
