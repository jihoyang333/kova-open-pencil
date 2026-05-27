<script setup lang="ts">
import KovaIcon from '@/components/ui/KovaIcon.vue'

// W9b Cluster 03 — `.bp-newcard` dashed "+ New brand" tile (Plan 03 Task 29).
const emit = defineEmits<{ (e: 'click'): void }>()
</script>

<template>
  <button type="button" class="bp-newcard" @click="emit('click')">
    <KovaIcon name="plus" size="md" aria-hidden="true" />
    <span>New brand</span>
  </button>
</template>
