<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import KovaIcon from '@/components/ui/KovaIcon.vue'

// PRD 02 §6.4.3 + Plan T24 — composer input wrap with idle/submitting/review
// state machine + ⌘↵ submit shortcut.

const props = defineProps<{
  modelValue: string
  state: 'idle' | 'submitting' | 'review'
}>()
const emit = defineEmits<{
  'update:modelValue': [value: string]
  submit: []
}>()

const editable = ref<HTMLDivElement | null>(null)
const isReadonly = computed(() => props.state !== 'idle')
const canSubmit = computed(() => props.modelValue.trim().length > 0 && props.state === 'idle')

// Keep DOM contenteditable in sync when parent resets the model.
watch(
  () => props.modelValue,
  (next) => {
    if (editable.value && editable.value.textContent !== next) {
      editable.value.textContent = next
    }
  }
)

function onInput(e: Event): void {
  const target = e.target instanceof HTMLElement ? e.target : null
  // B-MED6 — textContent (no <br> artifacts) instead of innerText.
  emit('update:modelValue', target?.textContent ?? '')
}

function onKey(e: KeyboardEvent): void {
  // Founder lock #9 — e.code, not e.key (Option transforms characters on Mac).
  if (e.code === 'Enter' && (e.metaKey || e.ctrlKey)) {
    e.preventDefault()
    if (canSubmit.value) emit('submit')
  }
}
</script>

<template>
  <div data-test-id="composer-input-wrap" class="composer-input-wrap">
    <div
      ref="editable"
      data-test-id="composer-input"
      class="composer-input"
      :class="{ submitting: state === 'submitting', review: state === 'review' }"
      :contenteditable="!isReadonly"
      :aria-readonly="isReadonly"
      data-placeholder="How can I help you today?"
      role="textbox"
      :aria-multiline="true"
      @input="onInput"
      @keydown="onKey"
    />
    <div class="composer-input-tools">
      <div class="grow" />
      <span class="hint"><kbd>⌘</kbd> <kbd>↵</kbd></span>
      <button
        data-test-id="composer-submit"
        type="button"
        class="btn accent go"
        :disabled="!canSubmit"
        @click="emit('submit')"
      >
        <span v-if="state === 'review'" class="composer-status ready">Ready</span>
        <span v-else-if="state === 'submitting'">Creating canvas…</span>
        <span v-else>Generate on canvas</span>
        <KovaIcon
          v-if="state === 'submitting'"
          name="loader-2"
          size="sm"
          class="ic animate-spin"
        />
        <KovaIcon v-else name="arrow-right" size="sm" class="ic" />
      </button>
    </div>
  </div>
</template>
