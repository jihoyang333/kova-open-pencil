<script setup lang="ts">
// PRD 04 §6.4.2 — Trial banner. Founder lock D-18 2026-05-17: ships hidden;
// lights up automatically when plan_status === 'trialing'.

import KovaIcon from '@/components/ui/KovaIcon.vue'

interface Props {
  visible: boolean
  daysLeft: number | null
}
const { visible, daysLeft } = defineProps<Props>()
defineEmits<{ upgrade: [] }>()
</script>

<template>
  <aside v-if="visible === true" class="trial-banner" role="status">
    <KovaIcon name="sparkles" size="md" class="trial-banner-ic" />
    <div class="trial-banner-body">
      <p><strong>Trial — {{ daysLeft }} {{ daysLeft === 1 ? 'day' : 'days' }} left</strong></p>
      <p>Upgrade anytime to keep your plan after the trial ends.</p>
    </div>
    <button type="button" class="btn primary" @click="$emit('upgrade')">
      Upgrade
    </button>
  </aside>
</template>
