<script setup lang="ts">
import KovaIcon from '@/components/ui/KovaIcon.vue'

/**
 * Segmented control — design.md §3.8 + canonical `.seg` (Cluster 07b
 * inspector lift, kova-hifi.css 2026-05-20 Phase 5b).
 *
 * Container: `--fill` bg, `--r-md` radius, 2 px padding, 1 px gap.
 * Cell: 26×26 (`--h-control-xs`), `--r-sm`, `--ink-3` idle, hover `--ink-2`,
 *       active `--fill-2` + `--ink`, disabled `--ink-4`.
 */

export interface SegmentedOption<T = string> {
  value: T
  icon?: string
  label?: string
  /** ARIA — required if icon-only. */
  ariaLabel?: string
  disabled?: boolean
}

defineProps<{
  modelValue: string
  options: SegmentedOption[]
  ariaLabel?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

function onSelect(opt: SegmentedOption): void {
  if (opt.disabled) return
  emit('update:modelValue', String(opt.value))
}
</script>

<template>
  <div class="seg" role="radiogroup" :aria-label="ariaLabel">
    <button
      v-for="opt in options"
      :key="opt.value"
      type="button"
      role="radio"
      :class="['s', { active: modelValue === opt.value, disabled: opt.disabled }]"
      :aria-checked="String(modelValue === opt.value)"
      :aria-label="opt.ariaLabel"
      :aria-disabled="opt.disabled ? 'true' : undefined"
      :disabled="opt.disabled"
      @click="onSelect(opt)"
    >
      <KovaIcon v-if="opt.icon" :name="opt.icon" size="xs" aria-hidden="true" />
      <span v-else>{{ opt.label }}</span>
    </button>
  </div>
</template>
