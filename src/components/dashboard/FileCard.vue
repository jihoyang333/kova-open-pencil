<script setup lang="ts">
import { computed } from 'vue'

import KovaIcon from '@/components/ui/KovaIcon.vue'
import { formatRelativeTime } from '@/utils/format-relative-time'

import FileThumbnail from './FileThumbnail.vue'

import type { Canvas } from '@/types/kova/database'

// PRD 02 §6.4.3 + Plan T28 — single file-card.
// Cluster 06 will populate `status` and `frame_count` fields on the canvas
// type; treat both as optional for Cluster 02.

const props = defineProps<{ canvas: Canvas }>()
const emit = defineEmits<{
  open: [canvasId: string]
  'context-menu': [payload: { canvasId: string; position: { x: number; y: number } }]
}>()

const status = computed(() => {
  const raw = (props.canvas as unknown as { status?: string }).status
  return raw && raw.length > 0 ? raw : null
})
const statusLabel = computed(() =>
  status.value ? status.value.charAt(0).toUpperCase() + status.value.slice(1) : ''
)
const frameCount = computed(() => {
  const raw = (props.canvas as unknown as { frame_count?: number }).frame_count
  return typeof raw === 'number' && raw > 0 ? raw : null
})

function onContext(e: MouseEvent): void {
  e.preventDefault()
  emit('context-menu', {
    canvasId: props.canvas.id,
    position: { x: e.clientX, y: e.clientY },
  })
}
</script>

<template>
  <button
    data-test-id="file-card"
    type="button"
    class="file-card"
    @click="emit('open', canvas.id)"
    @contextmenu="onContext"
  >
    <FileThumbnail :canvas="canvas" />
    <span v-if="status" data-test-id="file-status" class="status-tag">{{ statusLabel }}</span>
    <span v-if="frameCount" data-test-id="file-frame-count" class="frame-count">
      {{ frameCount }}
    </span>
    <div class="meta">
      <div data-test-id="file-title" class="title">{{ canvas.name }}</div>
      <div class="sub">
        <KovaIcon name="clock" size="sm" class="ic" />
        <span>{{ formatRelativeTime(canvas.updated_at) }}</span>
      </div>
    </div>
  </button>
</template>
