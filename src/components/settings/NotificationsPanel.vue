<script setup lang="ts">
import { usePreferencePath } from '@/composables/use-preferences'
import KovaToggle from '@/components/ui/KovaToggle.vue'

const productUpdates = usePreferencePath<boolean>(['notifications', 'productUpdates'])
const syncAlerts = usePreferencePath<boolean>(['notifications', 'syncAlerts'])
</script>

<template>
  <div class="row-stack">
    <div class="row">
      <div class="lbl">
        Product updates
        <span class="sub">New features and changelog highlights.</span>
      </div>
      <div class="val flex items-center gap-3">
        <span class="text-meta">Email · monthly</span>
        <KovaToggle v-model="productUpdates" aria-label="Product updates" />
      </div>
    </div>

    <div class="row">
      <div class="lbl">
        Sync alerts
        <span class="sub">Shopify or generation failures that need attention.</span>
      </div>
      <div class="val flex items-center gap-3">
        <span class="text-meta">Email · immediate</span>
        <KovaToggle v-model="syncAlerts" aria-label="Sync alerts" />
      </div>
    </div>
  </div>
</template>
