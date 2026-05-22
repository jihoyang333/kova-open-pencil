<script setup lang="ts">
import { computed } from 'vue'

import KovaIcon from '@/components/ui/KovaIcon.vue'

/**
 * Checkbox row — design.md §3.10 + canonical `.checkbox-row` / `.checkbox`
 * (kova-hifi.css 2026-05-20 Phase 5b lift).
 *
 * Box: 14×14 (`--checkbox-size`), 1 px `--line` border, `--r-xs` radius,
 *      `--bg` fill.
 * Checked: `--accent` bg + border, `--ink-on-primary` glyph.
 */

export interface KovaCheckboxProps {
  modelValue: boolean
  label?: string
  disabled?: boolean
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

function toggle(): void {
  if (props.disabled) return
  emit('update:modelValue', !props.modelValue)
}
</script>

<template>
  <label
    :for="fieldId"
    :class="['checkbox-row', { disabled }]"
  >
    <input
      :id="fieldId"
      type="checkbox"
      :checked="modelValue"
      :disabled="disabled"
      @change="toggle"
    />
    <span :class="['checkbox', { checked: modelValue }]" aria-hidden="true">
      <KovaIcon name="check" size="xs" class="ic" />
    </span>
    <span v-if="label">{{ label }}</span>
    <slot v-else />
  </label>
</template>
