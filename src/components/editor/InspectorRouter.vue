<script setup lang="ts">
/**
 * InspectorRouter — Cluster 06 Task 15.
 *
 * Mounts Cluster 07b's inspector section components based on
 * `useInspectorRouter().activeSections` (priority-sorted, selection-filtered).
 *
 * §12.15 RATIFIED: Cluster 06 ships the registry; Cluster 07b registers
 * Position/Layout/Appearance/Fill/Stroke/Typography/Effects/Export/Variables
 * at priorities 20-100 at app boot.
 *
 * Until 07b ships, the router renders the page-section placeholder (priority 10)
 * or an empty-state slot when no sections match.
 */
import { useInspectorRouter } from '@/composables/use-inspector-router'

const { activeSections } = useInspectorRouter()
</script>

<template>
  <div
    class="flex flex-col"
    data-testid="inspector-router"
    role="region"
    aria-label="Layer properties"
  >
    <template v-if="activeSections.length === 0">
      <slot name="empty">
        <div class="px-[14px] py-4 text-ink-3 text-[12px]">
          Inspector sections register at app boot (Cluster 07b).
        </div>
      </slot>
    </template>
    <template v-else>
      <component
        :is="section.component"
        v-for="section in activeSections"
        :key="section.id"
        :data-section-id="section.id"
      />
    </template>
  </div>
</template>
