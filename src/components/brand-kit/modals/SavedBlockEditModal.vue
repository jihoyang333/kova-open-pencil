<script setup lang="ts">
// Cluster 05 — SavedBlockEditModal.vue (B3.4)
// Edit saved block: prefilled. Delete ghost-link foot-left.

import { computed, ref, watch } from 'vue'

import KovaButton from '@/components/ui/KovaButton.vue'
import KovaField from '@/components/ui/KovaField.vue'
import KovaModal from '@/components/ui/KovaModal.vue'
import KovaSegmented from '@/components/ui/KovaSegmented.vue'
import type { SavedBlock, SavedBlockType } from '@/types/brand-kit'

const TYPE_OPTIONS = [
  { value: 'text', label: 'Text' },
  { value: 'cta', label: 'CTA' },
  { value: 'footer', label: 'Footer' },
]

const props = defineProps<{
  open: boolean
  block: SavedBlock | null
  saving?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'save', id: string, label: string, category: string, content: string, type: SavedBlockType): void
  (e: 'delete', id: string): void
}>()

const label = ref('')
const category = ref('')
const content = ref('')
const blockType = ref<SavedBlockType>('text')

watch(
  () => props.block,
  (b) => {
    if (b) {
      label.value = b.label
      category.value = b.category
      content.value = b.content
      blockType.value = b.type
    }
  },
  { immediate: true },
)

const canSave = computed(() => label.value.trim().length > 0 && content.value.trim().length > 0)

function onClose(): void {
  emit('update:open', false)
}

function onSave(): void {
  if (!canSave.value || !props.block) return
  emit('save', props.block.id, label.value.trim(), category.value.trim(), content.value.trim(), blockType.value)
}

function onDelete(): void {
  if (!props.block) return
  emit('delete', props.block.id)
}
</script>

<template>
  <KovaModal
    :open="props.open"
    title="Edit saved block"
    size="md"
    @update:open="(v) => { if (!v) onClose() }"
  >
    <div style="display: flex; flex-direction: column; gap: 14px">
      <KovaField
        v-model="label"
        label="Label"
        placeholder="e.g. Summer sale CTA"
      />
      <KovaField
        v-model="category"
        label="Category"
        :optional="true"
      />
      <div class="fld">
        <label for="sb-edit-content">Content</label>
        <textarea
          id="sb-edit-content"
          v-model="content"
          class="input"
          rows="5"
          style="width: 100%; resize: vertical; font: inherit; font-size: 13px"
        />
      </div>
      <div class="fld">
        <label>Type</label>
        <KovaSegmented
          :model-value="blockType"
          :options="TYPE_OPTIONS"
          aria-label="Block type"
          @update:model-value="(v) => (blockType = v as SavedBlockType)"
        />
      </div>
    </div>

    <template #foot-left>
      <button
        type="button"
        class="btn ghost sm"
        style="color: var(--warn)"
        :disabled="saving"
        @click="onDelete"
      >
        Delete block
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
