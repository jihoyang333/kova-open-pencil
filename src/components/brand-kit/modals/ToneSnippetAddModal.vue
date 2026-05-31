<script setup lang="ts">
// Cluster 05 — ToneSnippetAddModal.vue (B3.1)
// Add tone snippet: label + category + content. Save gated by label + content.

import { computed, ref } from 'vue'

import KovaButton from '@/components/ui/KovaButton.vue'
import KovaField from '@/components/ui/KovaField.vue'
import KovaModal from '@/components/ui/KovaModal.vue'

const props = defineProps<{
  open: boolean
  saving?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'save', label: string, category: string, content: string): void
}>()

const label = ref('')
const category = ref('')
const content = ref('')

const canSave = computed(() => label.value.trim().length > 0 && content.value.trim().length > 0)

function reset(): void {
  label.value = ''
  category.value = ''
  content.value = ''
}

function onClose(): void {
  reset()
  emit('update:open', false)
}

function onSave(): void {
  if (!canSave.value) return
  emit('save', label.value.trim(), category.value.trim(), content.value.trim())
}
</script>

<template>
  <KovaModal
    :open="props.open"
    title="Add tone snippet"
    description="A voice exemplar that guides the AI's tone."
    size="md"
    @update:open="(v) => { if (!v) onClose() }"
  >
    <div style="display: flex; flex-direction: column; gap: 14px">
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
        <label for="ts-add-content">Content</label>
        <textarea
          id="ts-add-content"
          v-model="content"
          class="input"
          rows="5"
          placeholder="Paste an example snippet of brand copy…"
          style="width: 100%; resize: vertical; font: inherit; font-size: 13px"
        />
      </div>
    </div>

    <template #foot>
      <KovaButton variant="ghost" :disabled="saving" @click="onClose">Cancel</KovaButton>
      <KovaButton
        variant="accent"
        :disabled="!canSave || saving"
        :loading="saving"
        @click="onSave"
      >
        Save snippet
      </KovaButton>
    </template>
  </KovaModal>
</template>
