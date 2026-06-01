<script setup lang="ts">
// Cluster 05 — ToneSnippetEditModal.vue (B3.2)
// Edit tone snippet: prefilled fields. Delete ghost-link foot-left.

import { computed, ref, watch } from 'vue'

import KovaButton from '@/components/ui/KovaButton.vue'
import KovaField from '@/components/ui/KovaField.vue'
import KovaModal from '@/components/ui/KovaModal.vue'
import type { ToneSnippet } from '@/types/brand-kit'

const props = defineProps<{
  open: boolean
  snippet: ToneSnippet | null
  saving?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'save', id: string, label: string, category: string, content: string): void
  (e: 'delete', id: string): void
}>()

const label = ref('')
const category = ref('')
const content = ref('')

watch(
  () => props.snippet,
  (s) => {
    if (s) {
      label.value = s.label
      category.value = s.category
      content.value = s.content
    }
  },
  { immediate: true },
)

const canSave = computed(() => label.value.trim().length > 0 && content.value.trim().length > 0)

function onClose(): void {
  emit('update:open', false)
}

function onSave(): void {
  if (!canSave.value || !props.snippet) return
  emit('save', props.snippet.id, label.value.trim(), category.value.trim(), content.value.trim())
}

function onDelete(): void {
  if (!props.snippet) return
  emit('delete', props.snippet.id)
}
</script>

<template>
  <KovaModal
    :open="props.open"
    title="Edit tone snippet"
    size="md"
    @update:open="(v) => { if (!v) onClose() }"
  >
    <div class="bk-form-col">
      <KovaField
        v-model="label"
        label="Label"
        placeholder="e.g. Welcome email opener"
      />
      <KovaField
        v-model="category"
        label="Category"
        placeholder="e.g. WELCOME, PROMO, CART"
        :optional="true"
      />
      <div class="fld">
        <label for="ts-edit-content">Content</label>
        <textarea
          id="ts-edit-content"
          v-model="content"
          class="input bk-textarea"
          rows="5"
        />
      </div>
    </div>

    <template #foot-left>
      <button
        type="button"
        class="btn ghost sm bk-warn"
        :disabled="saving"
        @click="onDelete"
      >
        Delete snippet
      </button>
    </template>

    <template #foot>
      <KovaButton variant="ghost" :disabled="saving" @click="onClose">Discard</KovaButton>
      <KovaButton
        variant="accent"
        :disabled="!canSave || saving"
        :loading="saving"
        @click="onSave"
      >
        Save
      </KovaButton>
    </template>
  </KovaModal>
</template>
