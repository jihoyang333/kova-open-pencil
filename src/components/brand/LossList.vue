<script setup lang="ts">
import KovaIcon from '@/components/ui/KovaIcon.vue'

// W9b Cluster 03 — `.loss-list` destructive-action summary used in Delete
// modal. Plan 03 Task 23. Counts render as `—` when undefined (per PRD
// §12.5 — store not yet wired at runtime).

export interface LossListItem {
  icon: string
  label: string
  count: number | null
}

interface Props {
  items: readonly LossListItem[]
  /** Header text above the list. */
  heading?: string
}
withDefaults(defineProps<Props>(), { heading: 'This will permanently delete:' })
</script>

<template>
  <div class="loss-list">
    <div class="loss-list__heading">{{ heading }}</div>
    <ul class="loss-list__items">
      <li v-for="item in items" :key="item.label" class="loss-list__row">
        <KovaIcon :name="item.icon" size="sm" aria-hidden="true" />
        <span class="loss-list__label">{{ item.label }}</span>
        <span class="loss-list__count">{{ item.count == null ? '—' : item.count }}</span>
      </li>
    </ul>
  </div>
</template>
