<script setup lang="ts">
import KovaIcon from '@/components/ui/KovaIcon.vue'
import type { SortMode } from '@/stores/dashboard'

// PRD 02 §6.4.3 + Plan T28 — sort-mode dropdown for the file-grid section
// head. Native <select> styled as .filter for hi-fi parity; can promote to
// Reka Select later if needed.

defineProps<{ modelValue: SortMode }>()
defineEmits<{ 'update:modelValue': [value: SortMode] }>()
</script>

<template>
  <label data-test-id="sort-dropdown" class="filter">
    <KovaIcon name="arrow-down-up" size="sm" class="ic" />
    <select
      :value="modelValue"
      class="bg-transparent text-[var(--ink-2)] outline-0 border-0 font-inherit text-xs"
      @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value as SortMode)"
    >
      <option value="recent">Recent</option>
      <option value="name">Name</option>
      <option value="created">Created</option>
    </select>
  </label>
</template>
