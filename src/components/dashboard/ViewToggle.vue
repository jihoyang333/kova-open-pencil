<script setup lang="ts">
import KovaIcon from '@/components/ui/KovaIcon.vue'
import type { ViewMode } from '@/stores/dashboard'

// PRD 02 §6.4.3 + Plan T28 — grid/list toggle. View choice persists per-device
// via useUIStateStore (handled by useFileGrid composable).

defineProps<{ modelValue: ViewMode }>()
defineEmits<{ 'update:modelValue': [value: ViewMode] }>()
</script>

<template>
  <div data-test-id="view-toggle" class="view-toggle">
    <button
      type="button"
      :class="['v', { on: modelValue === 'grid' }]"
      aria-label="Grid view"
      @click="$emit('update:modelValue', 'grid')"
    >
      <KovaIcon name="layout-grid" size="sm" class="ic" />
    </button>
    <button
      type="button"
      :class="['v', { on: modelValue === 'list' }]"
      aria-label="List view"
      @click="$emit('update:modelValue', 'list')"
    >
      <KovaIcon name="list" size="sm" class="ic" />
    </button>
  </div>
</template>
