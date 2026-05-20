<script setup lang="ts">
// Cluster 11 Plan Task 6.3 — KovaSegmented.
// Radio-style segmented control. Active cell uses kova-hifi --fill-2.

import KovaIcon from './KovaIcon.vue'

interface Option {
  value: string
  label: string
  icon?: string
}

defineProps<{ modelValue: string; options: Option[] }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
</script>

<template>
  <div
    class="seg inline-flex items-center gap-0.5 rounded-md bg-input p-0.5"
    role="radiogroup"
  >
    <button
      v-for="opt in options"
      :key="opt.value"
      type="button"
      class="o flex items-center gap-1 rounded-sm px-2 py-1 text-xs text-ink-3 hover:text-ink"
      :class="{ 'active bg-input-hi text-ink': modelValue === opt.value }"
      role="radio"
      :aria-checked="modelValue === opt.value"
      @click="emit('update:modelValue', opt.value)"
    >
      <KovaIcon v-if="opt.icon" :name="opt.icon" />
      <span>{{ opt.label }}</span>
    </button>
  </div>
</template>
