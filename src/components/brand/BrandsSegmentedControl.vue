<script setup lang="ts">
import { computed } from 'vue'

import { useBrandsStore } from '@/stores/brands'

// W9b Cluster 03 — B12.1 segmented control All / Active / Archived
// (Plan 03 Task 33.6). v-model bound to URL ?filter= by parent.

export type SegmentFilter = 'all' | 'active' | 'archived'

interface Props {
  modelValue: SegmentFilter
}
const props = defineProps<Props>()
const emit = defineEmits<{ (e: 'update:modelValue', v: SegmentFilter): void }>()

const store = useBrandsStore()

const SEGMENTS: { value: SegmentFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
]

async function select(v: SegmentFilter): Promise<void> {
  emit('update:modelValue', v)
  if (v === 'all' || v === 'archived') {
    await store.fetchArchivedBrands()
  }
}

function onKey(e: KeyboardEvent, idx: number): void {
  if (e.code !== 'ArrowLeft' && e.code !== 'ArrowRight') return
  e.preventDefault()
  const next = e.code === 'ArrowLeft' ? (idx + SEGMENTS.length - 1) % SEGMENTS.length : (idx + 1) % SEGMENTS.length
  void select(SEGMENTS[next].value)
}

const activeIdx = computed(() => SEGMENTS.findIndex((s) => s.value === props.modelValue))
</script>

<template>
  <div role="tablist" aria-label="Brand filter" class="seg seg--brands">
    <button
      v-for="(s, i) in SEGMENTS"
      :key="s.value"
      role="tab"
      type="button"
      :aria-selected="s.value === modelValue"
      :tabindex="i === activeIdx ? 0 : -1"
      :class="['seg__o', s.value === modelValue ? 'seg__o--active' : null]"
      @click="select(s.value)"
      @keydown="onKey($event, i)"
    >
      {{ s.label }}
    </button>
  </div>
</template>
