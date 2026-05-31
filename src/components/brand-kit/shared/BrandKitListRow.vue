<script setup lang="ts">
// Cluster 05 — BrandKitListRow.vue (A7.3.3/4, B3)
// Generic draggable list row: grip + label-col + content-col + actions-col.
// Used by both ToneSnippetsTab and SavedBlocksTab rows.

import KovaIcon from '@/components/ui/KovaIcon.vue'

const props = defineProps<{
  rowId: string
  label: string
  category: string
  contentExcerpt: string
  /** Optional type tag (saved blocks) */
  typeBadge?: string
  draggable?: boolean
}>()

const emit = defineEmits<{
  (e: 'edit', id: string): void
  (e: 'delete', id: string): void
  (e: 'dragstart', event: DragEvent, id: string): void
}>()

function onDragStart(event: DragEvent): void {
  emit('dragstart', event, props.rowId)
}
</script>

<template>
  <div class="list-row" :draggable="draggable" @dragstart="onDragStart">
    <div class="drag-handle grip" aria-hidden="true">
      <KovaIcon name="grip-vertical" size="xs" />
    </div>

    <div class="lbl-col">
      {{ label }}
      <span v-if="category" class="tag-mono">{{ category }}</span>
      <span v-if="typeBadge" class="tag-mono" style="margin-left: 4px">{{ typeBadge }}</span>
    </div>

    <div class="content-col">{{ contentExcerpt }}</div>

    <div class="actions-col">
      <button
        type="button"
        class="ac"
        :aria-label="`Edit ${label}`"
        @click="emit('edit', rowId)"
      >
        <KovaIcon name="pencil" size="xs" aria-hidden="true" />
      </button>
      <button
        type="button"
        class="ac"
        :aria-label="`Delete ${label}`"
        @click="emit('delete', rowId)"
      >
        <KovaIcon name="trash-2" size="xs" aria-hidden="true" />
      </button>
    </div>
  </div>
</template>
