<script setup lang="ts">
import { computed } from 'vue'

import type { Canvas } from '@/types/kova/database'

// PRD 02 §6.4.3 + Plan T27 — file-card thumbnail. Renders thumbnail_url if
// present, otherwise picks a deterministic abstraction (frame / flow / ab)
// from the canvas id hash so the placeholder stays stable across re-renders.

const props = defineProps<{ canvas: Canvas }>()

function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i)
  }
  return Math.abs(h)
}

const abstraction = computed<'frame' | 'flow' | 'ab'>(() => {
  const kinds = ['frame', 'flow', 'ab'] as const
  return kinds[hashStr(props.canvas.id) % kinds.length]!
})
</script>

<template>
  <div data-test-id="file-thumbnail" class="thumb">
    <img v-if="canvas.thumbnail_url" :src="canvas.thumbnail_url" :alt="canvas.name" />
    <div v-else-if="abstraction === 'frame'" class="thumb-frame">
      <div class="tb hero" />
      <div class="tb md" />
      <div class="tb sm" />
      <div class="tb cta" />
    </div>
    <div v-else-if="abstraction === 'flow'" class="thumb-flow">
      <div class="mini"><i /><u /><s /></div>
      <div class="arrow">→</div>
      <div class="mini"><i /><u /><s /></div>
      <div class="arrow">→</div>
      <div class="mini"><i /><u /><s /></div>
    </div>
    <div v-else class="thumb-ab">
      <div class="half" data-l="A"><i /><u /></div>
      <div class="half" data-l="B"><i /><u /></div>
    </div>
  </div>
</template>
