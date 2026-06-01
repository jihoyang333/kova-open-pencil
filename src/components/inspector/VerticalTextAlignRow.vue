<script setup lang="ts">
// Vertical text-align segmented control (PRD 07b §11.7 / Q3 #1).
// Mirrors the existing horizontal-align segmented pattern in TypographySection.vue
// (active = border-accent/bg-accent/text-white; inactive = bordered input with hover).
type Vertical = 'TOP' | 'CENTER' | 'BOTTOM'

const { modelValue } = defineProps<{ modelValue: Vertical }>()
const emit = defineEmits<{ 'update:modelValue': [value: Vertical] }>()

const OPTIONS: ReadonlyArray<{ value: Vertical; label: string }> = [
  { value: 'TOP', label: 'Top' },
  { value: 'CENTER', label: 'Middle' },
  { value: 'BOTTOM', label: 'Bottom' }
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
