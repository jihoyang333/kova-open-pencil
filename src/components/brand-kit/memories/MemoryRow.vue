<script setup lang="ts">
// Cluster 05 — MemoryRow.vue (A7.3.6)
// Single memory row: type badge + content + delete action.
// Cluster 10 owns brand memories — this is a consumer view (read + delete only).

import KovaIcon from '@/components/ui/KovaIcon.vue'
import type { BrandMemory } from '@/types/kova/brand-memory'

const props = defineProps<{
  memory: BrandMemory
}>()

const emit = defineEmits<{
  (e: 'delete', id: string): void
}>()

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch {
    return iso
  }
}
</script>

<template>
  <div class="mem-row">
    <div class="type">
      {{ memory.source === 'auto' ? 'Auto-captured' : 'User' }}
    </div>
    <div class="body">
      {{ memory.content }}
      <div class="src">{{ formatDate(memory.created_at) }}</div>
    </div>
    <button
      type="button"
      class="ac"
      :aria-label="`Delete memory: ${memory.content.slice(0, 30)}`"
      @click="emit('delete', memory.id)"
    >
      <KovaIcon name="trash-2" size="xs" aria-hidden="true" />
    </button>
  </div>
</template>
