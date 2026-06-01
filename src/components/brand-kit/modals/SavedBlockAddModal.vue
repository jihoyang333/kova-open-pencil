<script setup lang="ts">
// Cluster 05 — SavedBlockAddModal.vue (B3.3)
// Add saved block: label + category + content + TYPE segmented control.

import { computed, ref } from 'vue'

import KovaButton from '@/components/ui/KovaButton.vue'
import KovaField from '@/components/ui/KovaField.vue'
import KovaModal from '@/components/ui/KovaModal.vue'
import KovaSegmented from '@/components/ui/KovaSegmented.vue'
import type { SavedBlockType } from '@/types/brand-kit'

const TYPE_OPTIONS = [
  { value: 'text', label: 'Text' },
  { value: 'cta', label: 'CTA' },
  { value: 'footer', label: 'Footer' },
]

const TYPE_HELP: Record<SavedBlockType, string> = {
  text: 'Any TEXT node in canvas',
  cta: 'Button-style nodes',
  footer: 'Bottom-of-canvas section',
}

const props = defineProps<{
  open: boolean
  saving?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'save', label: string, category: string, content: string, type: SavedBlockType): void
}>()

const label = ref('')
const category = ref('')
const content = ref('')
const blockType = ref<SavedBlockType>('text')

const canSave = computed(() => label.value.trim().length > 0 && content.value.trim().length > 0)

function reset(): void {
  label.value = ''
  category.value = ''
  content.value = ''
  blockType.value = 'text'
}

function onClose(): void {
  reset()
  emit('update:open', false)
}

function onSave(): void {
  if (!canSave.value) return
  emit('save', label.value.trim(), category.value.trim(), content.value.trim(), blockType.value)
}
</script>

<template>
  <KovaModal
    :open="props.open"
    title="Add saved block"
    description="Reusable copy block that can be dragged onto the canvas."
    size="md"
    @update:open="(v) => { if (!v) onClose() }"
  >
    <div class="bk-form-col">
      <KovaField
        v-model="label"
        label="Label"
        placeholder="e.g. Summer sale CTA"
      />
      <KovaField
        v-model="category"
        label="Category"
        placeholder="e.g. FOOTER, CTA, TEXT"
        :optional="true"
      />
      <div class="fld">
        <label for="sb-add-content">Content</label>
        <textarea
          id="sb-add-content"
          v-model="content"
          class="input bk-textarea"
          rows="5"
          placeholder="Paste the copy block…"
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
        <div class="help">{{ TYPE_HELP[blockType] }}</div>
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
        Save block
      </KovaButton>
    </template>
  </KovaModal>
</template>
