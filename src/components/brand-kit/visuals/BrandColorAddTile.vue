<script setup lang="ts">
// Cluster 05 — BrandColorAddTile.vue (A7.3.1)
// Dashed "+ Add color" tile. Emits open so parent controls popover.

const emit = defineEmits<{
  (e: 'open'): void
}>()
</script>

<template>
  <button type="button" class="sw-add" aria-label="Add brand color" @click="emit('open')">
    + Add color
  </button>
</template>
