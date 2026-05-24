<script setup lang="ts">
// Cross-cluster stub — Cluster 01 owns the full DangerZoneCard + delete-
// account flow per PRD 01 §Task 16. Cluster 04 mounts this in Account
// Danger zone section per PRD 04 §6.4.1. Stub renders the affordance
// without the modal flow; Cluster 01 merge replaces this file.

import KovaIcon from '@/components/ui/KovaIcon.vue'
</script>

<template>
  <div class="acc-danger-card">
    <div class="acc-danger-card-head">
      <KovaIcon name="alert-triangle" size="md" class="acc-danger-card-ic" />
      <h2 class="acc-danger-card-title">Delete account</h2>
    </div>
    <p class="acc-danger-card-body">
      Deleting your account is permanent. All canvases, brands, Stripe
      subscription, Shopify connections, and uploaded assets will be removed
      after a 30-day grace period.
    </p>
    <button type="button" class="btn danger" disabled aria-disabled="true">
      Delete account (Cluster 01 flow pending)
    </button>
  </div>
</template>
