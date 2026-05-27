<script setup lang="ts">
// PRD 04 §6.4.1 — Brands section (B12 reversal 2026-05-17).
// Route + sidebar entry owned by Cluster 04; content owned by Cluster 03.
// W9b Cluster 03 — replaced async-with-fallback shim with direct import of
// BrandsAccountView (Plan 03 Task 33.7).

import AccountSectionHeader from '@/components/account/AccountSectionHeader.vue'
import BrandsAccountView from '@/views/account/BrandsAccountView.vue'
</script>

<template>
  <section class="acc-section">
    <AccountSectionHeader title="Brands" subtitle="All your brands — active and archived." />
    <BrandsAccountView />
  </section>
</template>
