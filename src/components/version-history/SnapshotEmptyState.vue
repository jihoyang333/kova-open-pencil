<script setup lang="ts">
import EmptyState from '@/components/ui/EmptyState.vue'

/**
 * Version-history empty state (hi-fi 17.11). Reuses the canonical `.empty-pane`
 * (EmptyState, A11 lift). No CTA — the ⌘+⌥+S shortcut is the affordance.
 */
</script>

<template>
  <EmptyState icon="history" headline="No version history yet">
    <template #body>
      Press <span class="vh-kbd-hint">⌘+⌥+S</span> to save manually, or autosave will create one in
      the background.
    </template>
  </EmptyState>
</template>
