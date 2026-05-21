<script setup lang="ts">
import { computed } from 'vue'

import KovaInput from '@/components/ui/KovaInput.vue'

/**
 * Field composition — `<label>` + `<KovaInput>` + helper + error.
 *
 * Spec: PRD 11 §2.1 + canonical kova-hifi.css `.fld` (modal-form variant,
 * A6+A2a L88-110) — `.fld label / .help / input.input / textarea.input`.
 *
 * Uses the modal-form `.fld` class so it picks up the canonical
 * label-over-input layout, helper-text style, and ink-2 focus border.
 */

export interface KovaFieldProps {
  label: string
  modelValue?: string | number
  helperText?: string
  errorText?: string
  optional?: boolean
  type?: 'text' | 'email' | 'search' | 'number' | 'password' | 'tel' | 'url'
  placeholder?: string
  disabled?: boolean
  readonly?: boolean
  /** Auto-generated if omitted. */
  id?: string
}

const props = withDefaults(defineProps<KovaFieldProps>(), {
  modelValue: '',
  type: 'text',
  disabled: false,
  readonly: false,
  optional: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | number): void
  (e: 'focus', event: FocusEvent): void
  (e: 'blur', event: FocusEvent): void
}>()

let _autoId: string | undefined
const fieldId = computed<string>(() => {
  if (props.id) return props.id
  _autoId ??= `k-field-${crypto.randomUUID()}`
  return _autoId
})

const helpId = computed(() => `${fieldId.value}-help`)
const errorId = computed(() => `${fieldId.value}-error`)
const isError = computed(() => Boolean(props.errorText))
</script>

<template>
  <div class="fld">
    <label :for="fieldId">
      {{ label }}
      <span v-if="optional" class="opt">(optional)</span>
    </label>
    <KovaInput
      :id="fieldId"
      :model-value="modelValue"
      :type="type"
      :placeholder="placeholder"
      :disabled="disabled"
      :readonly="readonly"
      :error="isError"
      :aria-describedby="isError ? errorId : helperText ? helpId : undefined"
      @update:model-value="(v) => emit('update:modelValue', v)"
      @focus="(e) => emit('focus', e)"
      @blur="(e) => emit('blur', e)"
    />
    <div v-if="errorText" :id="errorId" class="help" role="alert">
      {{ errorText }}
    </div>
    <div v-else-if="helperText" :id="helpId" class="help">
      {{ helperText }}
    </div>
  </div>
</template>
