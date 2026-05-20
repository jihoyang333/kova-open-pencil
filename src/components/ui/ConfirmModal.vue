<script setup lang="ts">
// Cluster 11 Plan Task 5.2 — global ConfirmModal.
// Mounted once in App.vue. Reads the top of useConfirmStore.stack and renders
// inside KovaModal (size sm). Resolves the request when the user clicks
// confirm or cancel.
//
// Uses kova-hifi.css .btn / .btn.primary / .btn.ghost / .btn.danger /
// .input classes directly to avoid a Phase-6 wrapper dependency cycle.

import { ref, computed, watch } from 'vue'
import KovaModal from './KovaModal.vue'
import { useConfirmStore } from '@/stores/confirm'

const store = useConfirmStore()
const typedText = ref('')

watch(
  () => store.pending,
  () => {
    typedText.value = ''
  },
)

const open = computed({
  get: () => store.pending !== null,
  set: (value: boolean) => {
    if (!value) store.resolveTop(false)
  },
})

const canConfirm = computed(() => {
  const target = store.pending?.typedConfirm
  if (!target) return true
  return typedText.value === target
})
</script>

<template>
  <KovaModal
    :open="open"
    size="sm"
    :title="store.pending?.title ?? ''"
    :description="store.pending?.description"
    :destructive="store.pending?.destructive ?? false"
    @update:open="open = $event"
  >
    <div v-if="store.pending?.typedConfirm" class="field">
      <label
        class="label mb-1 block text-xs font-medium text-ink-2"
      >Type {{ store.pending.typedConfirm }} to confirm</label>
      <input
        v-model="typedText"
        class="input w-full rounded-md border border-line bg-input px-2 py-1.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent"
        type="text"
        autocomplete="off"
      />
    </div>

    <template #footer>
      <button
        class="btn ghost rounded-md px-3 py-1.5 text-sm text-ink-2 hover:bg-line-2 hover:text-ink"
        type="button"
        @click="store.resolveTop(false)"
      >
        {{ store.pending?.cancelLabel ?? 'Cancel' }}
      </button>
      <button
        class="btn rounded-md px-3 py-1.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        :class="
          store.pending?.destructive
            ? 'danger bg-red-500 hover:bg-red-400'
            : 'primary bg-accent hover:bg-accent/90'
        "
        type="button"
        :disabled="!canConfirm"
        @click="store.resolveTop(true)"
      >
        {{ store.pending?.confirmLabel ?? 'Confirm' }}
      </button>
    </template>
  </KovaModal>
</template>
