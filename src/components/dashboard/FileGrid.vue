<script setup lang="ts">
import FileCard from './FileCard.vue'

import type { Canvas } from '@/types/kova/database'

// PRD 02 §6.4.3 + Plan T29 — file grid host. 4-col grid by default; switches
// to single-column when viewMode === 'list'. Empty + loading orchestration
// via slots so the parent decides what to render in each state.

defineProps<{
  canvases: Canvas[]
  viewMode: 'grid' | 'list'
  isLoading: boolean
}>()
defineEmits<{
  open: [canvasId: string]
  'context-menu': [payload: { canvasId: string; position: { x: number; y: number } }]
}>()
</script>

<template>
  <div v-if="canvases.length" data-test-id="file-grid" class="file-grid" :class="{ list: viewMode === 'list' }">
    <FileCard
      v-for="c in canvases"
      :key="c.id"
      :canvas="c"
      @open="(id) => $emit('open', id)"
      @context-menu="(payload) => $emit('context-menu', payload)"
    />
  </div>
  <slot v-else-if="!isLoading" name="empty" />
  <slot v-else name="loading" />
</template>
