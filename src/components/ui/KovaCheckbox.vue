<script setup lang="ts">
import { computed } from 'vue'

import KovaIcon from '@/components/ui/KovaIcon.vue'

/**
 * Checkbox row — design.md §3.10.
 *   - Inline, 8 px gap.
 *   - Box: 14×14, 1 px solid --line, --r-xs, --bg fill.
 *   - Checked: --accent bg + --accent border, white glyph.
 *   - Label: --t-body in --ink-2.
 */

export interface KovaCheckboxProps {
  modelValue: boolean
  label?: string
  disabled?: boolean
  /** Auto-generated if omitted. */
  id?: string
}

const props = defineProps<KovaCheckboxProps>()
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

let _autoId: string | undefined
const fieldId = computed<string>(() => {
  if (props.id) return props.id
  _autoId ??= `k-check-${crypto.randomUUID()}`
  return _autoId
})

const boxStyle = computed(() => ({
  width: '14px',
  height: '14px',
  borderRadius: 'var(--r-xs)',
  border: '1px solid var(--line)',
  background: props.modelValue ? 'var(--accent)' : 'var(--bg)',
  borderColor: props.modelValue ? 'var(--accent)' : 'var(--line)',
  display: 'grid',
  placeItems: 'center',
  cursor: props.disabled ? 'not-allowed' : 'pointer',
  opacity: props.disabled ? 0.5 : 1,
  flexShrink: 0,
  transition: 'background var(--motion-fast) var(--ease-out), border-color var(--motion-fast) var(--ease-out)',
}))

const rowStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  color: 'var(--ink-2)',
  fontSize: 'var(--t-body-fz)',
  cursor: props.disabled ? 'not-allowed' : 'pointer',
  userSelect: 'none' as const,
}

function toggle(): void {
  if (props.disabled) return
  emit('update:modelValue', !props.modelValue)
}
</script>

<template>
  <label :for="fieldId" :style="rowStyle">
    <input
      :id="fieldId"
      type="checkbox"
      :checked="modelValue"
      :disabled="disabled"
      :style="{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: '1px', height: '1px' }"
      @change="toggle"
    />
    <span :style="boxStyle" aria-hidden="true">
      <KovaIcon v-if="modelValue" name="check" size="xs" :style="{ color: 'var(--ink-on-primary)' }" />
    </span>
    <span v-if="label">{{ label }}</span>
    <slot v-else />
  </label>
</template>
