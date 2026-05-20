<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import KovaButton from '@/components/ui/KovaButton.vue'
import KovaField from '@/components/ui/KovaField.vue'
import KovaModal from '@/components/ui/KovaModal.vue'

import { useConfirmStore } from '@/stores/confirm'

import type { ConfirmRequest } from '@/stores/confirm'

/**
 * Global confirm modal — Plan 11 Task 5.2.
 * Mounted once in App.vue. Renders the innermost ConfirmRequest from the
 * stack (max 2 nested per KD-2; store enforces).
 */

const store = useConfirmStore()

const current = computed<ConfirmRequest | null>(() => {
  const s = store.stack
  return s.length > 0 ? s[s.length - 1] : null
})

const typed = ref('')

watch(current, (req) => {
  typed.value = ''
  if (!req) return
})

const canConfirm = computed(() => {
  const req = current.value
  if (!req) return false
  if (req.typedConfirmPhrase) return typed.value === req.typedConfirmPhrase
  return true
})

function answer(value: boolean): void {
  const req = current.value
  if (!req) return
  store.answer(req.id, value)
}
</script>

<template>
  <KovaModal
    v-if="current"
    :open="true"
    size="sm"
    :title="current.title"
    :description="current.body"
    @update:open="(v) => { if (!v) answer(false) }"
  >
    <div v-if="current.typedConfirmPhrase">
      <KovaField
        v-model="typed"
        label="Type the confirm phrase"
        :helper-text="`Type ${current.typedConfirmPhrase} to enable Confirm.`"
        :placeholder="current.typedConfirmPhrase"
      />
    </div>
    <template #foot>
      <KovaButton variant="ghost" @click="answer(false)">
        {{ current.cancelLabel ?? 'Cancel' }}
      </KovaButton>
      <KovaButton
        :variant="current.destructive ? 'danger' : 'accent'"
        :disabled="!canConfirm"
        @click="answer(true)"
      >
        {{ current.confirmLabel ?? 'Confirm' }}
      </KovaButton>
    </template>
  </KovaModal>
</template>
