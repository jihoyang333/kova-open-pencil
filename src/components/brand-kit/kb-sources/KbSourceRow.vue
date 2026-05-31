<script setup lang="ts">
// Cluster 05 — KbSourceRow.vue (A7.3.7, B8.7)
// Multi-state KB source list row: success / in-progress / error / queued.

import KovaIcon from '@/components/ui/KovaIcon.vue'
import type { BrandKbSource } from '@/types/brand-kit'

type RowState = 'success' | 'in-progress' | 'error' | 'queued'

const props = defineProps<{
  source: BrandKbSource
  state?: RowState
  progress?: number
  errorMsg?: string
}>()

const emit = defineEmits<{
  (e: 'delete', id: string): void
  (e: 'retry', id: string): void
}>()

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

function stateIcon(state: RowState | undefined): string {
  switch (state) {
    case 'success': return 'check-circle'
    case 'in-progress': return 'loader-2'
    case 'error': return 'alert-circle'
    case 'queued': return 'clock'
    default: return 'check-circle'
  }
}

function stateLabel(state: RowState | undefined): string {
  switch (state) {
    case 'success': return 'Uploaded'
    case 'in-progress': return 'Uploading'
    case 'error': return 'Failed'
    case 'queued': return 'Queued'
    default: return 'Uploaded'
  }
}

const resolvedState = (props.state ?? 'success') as RowState
</script>

<template>
  <div class="upl-list-row" :class="{ 'has-prog': resolvedState === 'in-progress' }">
    <div class="file-ic">
      <KovaIcon name="file-text" size="xs" aria-hidden="true" />
    </div>
    <div class="nm">{{ source.file_name }}</div>
    <div class="sz">{{ formatBytes(source.file_size_bytes) }}</div>
    <div class="status" :class="resolvedState">
      <KovaIcon :name="stateIcon(resolvedState)" size="xs" class="st-ic" aria-hidden="true" />
      {{ stateLabel(resolvedState) }}
    </div>
    <button
      type="button"
      class="remove"
      :aria-label="`Remove ${source.file_name}`"
      @click="resolvedState === 'error' ? emit('retry', source.id) : emit('delete', source.id)"
    >
      <KovaIcon :name="resolvedState === 'error' ? 'refresh-cw' : 'x'" size="xs" aria-hidden="true" />
    </button>
    <div v-if="resolvedState === 'in-progress'" class="row-prog">
      <i :style="{ width: `${progress ?? 0}%` }" />
    </div>
  </div>
</template>
