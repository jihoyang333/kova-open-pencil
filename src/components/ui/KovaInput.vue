<script setup lang="ts">
// Cluster 11 Plan Task 6.2 — KovaInput.
// State-aware text input. typed-confirm + confirmTarget supports the
// Cluster 11 ConfirmModal pattern: user types the target string and the
// `confirm:ready` event toggles the modal's confirm button.

import { watch } from 'vue'

interface Props {
  modelValue: string
  type?: 'text' | 'email' | 'search' | 'password'
  placeholder?: string
  disabled?: boolean
  state?: 'idle' | 'focus' | 'error' | 'locked' | 'typed-confirm'
  confirmTarget?: string
}

const props = withDefaults(defineProps<Props>(), { type: 'text', state: 'idle' })
const emit = defineEmits<{
  'update:modelValue': [value: string]
  'confirm:ready': [matches: boolean]
}>()

watch(
  () => props.modelValue,
  (next) => {
    if (props.state === 'typed-confirm' && props.confirmTarget) {
      emit('confirm:ready', next === props.confirmTarget)
    }
  },
)
</script>

<template>
  <input
    class="input w-full rounded-md border bg-input px-2 py-1.5 text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:ring-2"
    :class="[
      state,
      state === 'error' ? 'border-red-500 focus:ring-red-500' : 'border-line focus:ring-accent',
      (disabled || state === 'locked') && 'cursor-not-allowed opacity-60',
    ]"
    :type="type"
    :placeholder="placeholder"
    :disabled="disabled || state === 'locked'"
    :value="modelValue"
    @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
  />
</template>
