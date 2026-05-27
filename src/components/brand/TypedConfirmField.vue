<script setup lang="ts">
import { computed, ref, watch } from 'vue'

// W9b Cluster 03 — typed-confirm field used in Delete modal. Plan 03 Task 26.
// Compares user input byte-for-byte (case-sensitive) against `expected` and
// emits `matched` boolean. State classes: idle / partial / ok.
//
// Per PRD §12.2 the expected string is the BRAND NAME (not "DELETE"). This
// gives anti-muscle-memory friction while reading the brand name back to the
// user inside a destructive context.

interface Props {
  expected: string
  modelValue?: string
}
const props = withDefaults(defineProps<Props>(), { modelValue: '' })

const emit = defineEmits<{
  (e: 'update:modelValue', v: string): void
  (e: 'matched', isMatched: boolean): void
}>()

const local = ref<string>(props.modelValue)

watch(() => props.modelValue, (next) => {
  if (next !== local.value) local.value = next
})

const state = computed<'idle' | 'partial' | 'ok'>(() => {
  if (local.value.length === 0) return 'idle'
  if (local.value === props.expected) return 'ok'
  return 'partial'
})

const matched = computed<boolean>(() => state.value === 'ok')

watch(matched, (v) => emit('matched', v), { immediate: true })

function onInput(e: Event): void {
  const v = (e.target as HTMLInputElement).value
  local.value = v
  emit('update:modelValue', v)
}

defineExpose({ matched, state })
</script>

<template>
  <input
    :class="['input', 'confirm-typed', state]"
    type="text"
    autocomplete="off"
    autocorrect="off"
    autocapitalize="off"
    spellcheck="false"
    :value="local"
    :placeholder="expected"
    :aria-label="`Type the brand name to confirm: ${expected}`"
    @input="onInput"
  />
</template>
