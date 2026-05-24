<script setup lang="ts">
// PRD 04 §6.4.1 — Brands section (B12 reversal 2026-05-17).
// Route + sidebar entry owned by Cluster 04; content owned by Cluster 03.
// Until Cluster 03 BrandsArchiveView ships, render stub with a link.

import { defineAsyncComponent } from 'vue'

import AccountSectionHeader from '@/components/account/AccountSectionHeader.vue'

// Cluster 03 sibling: BrandsArchiveView may not yet exist in this worktree
// (parallel wave). Fall back to inline stub via async import + error boundary.
const BrandsArchiveView = defineAsyncComponent({
  loader: () => import('@/views/dashboard/BrandsArchiveView.vue').catch(() => ({
    default: { render: () => null },
  })),
})
</script>

<template>
  <section class="acc-section">
    <AccountSectionHeader title="Brands" subtitle="All your brands — active and archived." />
    <Suspense>
      <BrandsArchiveView />
      <template #fallback>
        <div class="acc-stub" role="status">
          <p>Brands archive ships with Cluster 03.</p>
          <p class="mono">/dashboard/brands</p>
        </div>
      </template>
    </Suspense>
  </section>
</template>
