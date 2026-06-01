<script setup lang="ts">
// Stroke-align segmented control (PRD 07b §11.17 / Q3 #5). Same segmented pattern as
// VerticalTextAlignRow; align values match the core Stroke['align'] union.
type Align = 'INSIDE' | 'CENTER' | 'OUTSIDE'

const { modelValue } = defineProps<{ modelValue: Align }>()
const emit = defineEmits<{ 'update:modelValue': [value: Align] }>()

const OPTIONS: ReadonlyArray<{ value: Align; label: string }> = [
  { value: 'INSIDE', label: 'Inside' },
  { value: 'CENTER', label: 'Center' },
  { value: 'OUTSIDE', label: 'Outside' }
]
</script>

<template>
  <div class="flex gap-0.5">
    <button
      v-for="opt in OPTIONS"
      :key="opt.value"
      type="button"
      :aria-pressed="modelValue === opt.value"
      :title="opt.label"
      class="flex flex-1 cursor-pointer items-center justify-center rounded border px-2 py-1 text-xs"
      :class="
        modelValue === opt.value
          ? 'border-accent bg-accent text-white'
          : 'border-border bg-input text-muted hover:bg-hover hover:text-surface'
      "
      @click="emit('update:modelValue', opt.value)"
    >
      {{ opt.label }}
    </button>
  </div>
</template>
