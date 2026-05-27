<script setup lang="ts">
/**
 * LayersEmptyState — Cluster 06 Task 11.
 *
 * Hi-fi source: `10 Left Panel - Dark.html` scene 10.1 ("No layers yet").
 */
import KovaIcon from '@/components/ui/KovaIcon.vue'
</script>

<template>
  <div
    class="px-4 py-8 flex flex-col items-center justify-center gap-2 text-ink-3 text-[12.5px]"
    data-testid="layers-empty-state"
  >
    <KovaIcon name="frame" size="lg" />
    <span>No layers yet</span>
  </div>
</template>
