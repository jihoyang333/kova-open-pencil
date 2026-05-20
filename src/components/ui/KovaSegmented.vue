<script setup lang="ts">
import { computed } from 'vue'

import KovaIcon from '@/components/ui/KovaIcon.vue'

/**
 * Segmented control — design.md §3.8.
 *   - Container: `--fill` bg, `--r-md` radius, 2 px padding, 1 px gap.
 *   - Cell: 26×26, `--r-sm`, `--ink-3` idle.
 *   - Active cell: `--fill-2` bg, `--ink` color.
 *   - Hover (idle): `--ink-2`.
 *   - Used for alignment, flow, flip in inspector (Cluster 07b).
 *
 * The canonical CSS doesn't ship a `.seg` block — Cluster 07b inspector
 * mockup defines it inline. Cluster 11 ships the Vue SFC with
 * scoped-utility classes that match the spec. Cross-cluster reference:
 * `design-system/hifi/canvas-engine/chunk-b4/Kova Hi-Fi 11 Inspector - Dark.html`.
 */

export interface SegmentedOption<T = string> {
  value: T
  /** Optional Lucide icon. */
  icon?: string
  /** Optional text label (if no icon). */
  label?: string
  /** ARIA — required if icon-only. */
  ariaLabel?: string
  disabled?: boolean
}

const props = defineProps<{
  modelValue: string
  options: SegmentedOption[]
  /** ARIA — describes the segmented control group. */
  ariaLabel?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const containerStyle = computed(() => ({
  background: 'var(--fill)',
  borderRadius: 'var(--r-md)',
  padding: '2px',
  display: 'inline-flex',
  gap: '1px',
}))

function cellStyle(opt: SegmentedOption, isActive: boolean) {
  return {
    width: 'var(--h-control-xs)',
    height: 'var(--h-control-xs)',
    borderRadius: 'var(--r-sm)',
    display: 'grid',
    placeItems: 'center',
    color: isActive ? 'var(--ink)' : 'var(--ink-3)',
    background: isActive ? 'var(--fill-2)' : 'transparent',
    cursor: opt.disabled ? 'not-allowed' : 'pointer',
    opacity: opt.disabled ? 0.5 : 1,
    border: '0',
    transition: 'color var(--motion-fast) var(--ease-out), background var(--motion-fast) var(--ease-out)',
    fontSize: 'var(--t-meta-fz)',
  }
}

function onSelect(opt: SegmentedOption): void {
  if (opt.disabled) return
  if (props.modelValue !== opt.value) emit('update:modelValue', String(opt.value))
}
</script>

<template>
  <div role="radiogroup" :aria-label="ariaLabel" :style="containerStyle">
    <button
      v-for="opt in options"
      :key="opt.value"
      type="button"
      role="radio"
      :aria-checked="String(modelValue === opt.value)"
      :aria-label="opt.ariaLabel"
      :aria-disabled="opt.disabled ? 'true' : undefined"
      :disabled="opt.disabled"
      :style="cellStyle(opt, modelValue === opt.value)"
      @click="onSelect(opt)"
    >
      <KovaIcon v-if="opt.icon" :name="opt.icon" size="xs" aria-hidden="true" />
      <span v-else>{{ opt.label }}</span>
    </button>
  </div>
</template>
