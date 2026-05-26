<script setup lang="ts">
import KovaIcon from '@/components/ui/KovaIcon.vue'

// W9b Cluster 03 — `.info-card` neutral explainer card used in Archive modal.
// Plan 03 Task 23. Bullets render as plain-text (Vue auto-escapes; no v-html).

interface Props {
  bullets: readonly string[]
  /** Optional Lucide icon name in the leading position. Defaults to 'info'. */
  icon?: string
}
withDefaults(defineProps<Props>(), { icon: 'info' })
</script>

<template>
  <div class="info-card">
    <ul class="info-card__list">
      <li v-for="(b, i) in bullets" :key="i" class="info-card__bullet">
        <KovaIcon :name="icon" size="xs" aria-hidden="true" />
        <span>{{ b }}</span>
      </li>
    </ul>
  </div>
</template>
