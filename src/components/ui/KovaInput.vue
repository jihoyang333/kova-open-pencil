<script setup lang="ts">
import { computed, useAttrs } from 'vue'

/**
 * Canonical Kova text input — consumes `.input` class from kova-hifi.css.
 *
 * Spec: design.md §3.7 + kova-hifi.css L423-437.
 *   - 30 px height (default), 13 px text, --r-lg radius, --line border.
 *   - Focus → border-color --accent, no box-shadow ring on canonical input.
 *   - Modal-form variant uses `.fld .input` (see KovaField — different focus).
 *
 * Two-way binding via v-model.
 */

export interface KovaInputProps {
  modelValue?: string | number
  type?: 'text' | 'email' | 'search' | 'number' | 'password' | 'tel' | 'url'
  placeholder?: string
  disabled?: boolean
  readonly?: boolean
  /** Optional id used to wire <label for=...>. KovaField sets this. */
  id?: string
  /** ARIA — set when no visible label (e.g. search inputs in popover). */
  ariaLabel?: string
  /** ARIA — set when label exists elsewhere. */
  ariaLabelledby?: string
  /** Error state — adds [data-error] for downstream KovaField styling. */
  error?: boolean
}

const props = withDefaults(defineProps<KovaInputProps>(), {
  modelValue: '',
  type: 'text',
  disabled: false,
  readonly: false,
  error: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | number): void
  (e: 'input', event: Event): void
  (e: 'change', event: Event): void
  (e: 'focus', event: FocusEvent): void
  (e: 'blur', event: FocusEvent): void
}>()

const attrs = useAttrs()
const inputClass = computed(() => {
  const c = ['input']
  if (attrs.class && typeof attrs.class === 'string') c.push(attrs.class)
  return c.join(' ')
})

function onInput(event: Event): void {
  const target = event.target as HTMLInputElement
  const next = props.type === 'number' ? target.valueAsNumber : target.value
  emit('update:modelValue', next)
  emit('input', event)
}
</script>

<template>
  <input
    :id="id"
    :type="type"
    :value="modelValue"
    :placeholder="placeholder"
    :disabled="disabled"
    :readonly="readonly"
    :aria-label="ariaLabel"
    :aria-labelledby="ariaLabelledby"
    :aria-invalid="error ? 'true' : undefined"
    :data-error="error || undefined"
    :class="inputClass"
    @input="onInput"
    @change="$emit('change', $event)"
    @focus="$emit('focus', $event)"
    @blur="$emit('blur', $event)"
  />
</template>
