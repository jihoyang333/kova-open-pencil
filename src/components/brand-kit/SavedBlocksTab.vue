<script setup lang="ts">
// Cluster 05 — SavedBlocksTab.vue (PRD §3.5, A7.3.4)
// CRUD list of saved blocks. Grip handle is canvas-drag source (MIME: saved-block).

import { ref } from 'vue'

import EmptyState from '@/components/ui/EmptyState.vue'
import BrandKitListRow from './shared/BrandKitListRow.vue'
import SavedBlockAddModal from './modals/SavedBlockAddModal.vue'
import SavedBlockEditModal from './modals/SavedBlockEditModal.vue'
import { useBrandKitStore } from '@/stores/brand-kit'
import { useBrandKitDrag } from '@/composables/brand-kit/use-brand-kit-drag'
import { useConfirm } from '@/composables/use-confirm'
import { toast } from '@/composables/use-toast'
import type { SavedBlock, SavedBlockType } from '@/types/brand-kit'

const store = useBrandKitStore()
const confirm = useConfirm()
const { onSavedBlockDragStart } = useBrandKitDrag()

const showAdd = ref(false)
const editTarget = ref<SavedBlock | null>(null)
const saving = ref(false)
const draggedId = ref<string | null>(null)

function excerpt(content: string): string {
  return content.length > 120 ? content.slice(0, 120) + '…' : content
}

async function onAdd(label: string, category: string, content: string, type: SavedBlockType): Promise<void> {
  saving.value = true
  try {
    await store.addSavedBlock(label, category, content, type)
    showAdd.value = false
    toast.show('Saved block added.')
  } catch (e) {
    toast.show(e instanceof Error ? e.message : 'Failed to add', 'error')
  } finally {
    saving.value = false
  }
}

async function onEdit(id: string, label: string, category: string, content: string, type: SavedBlockType): Promise<void> {
  saving.value = true
  try {
    await store.updateSavedBlock(id, label, category, content, type)
    editTarget.value = null
    toast.show('Saved block updated.')
  } catch (e) {
    toast.show(e instanceof Error ? e.message : 'Failed to update', 'error')
  } finally {
    saving.value = false
  }
}

async function onDelete(id: string): Promise<void> {
  const block = store.savedBlocks.find((b) => b.id === id)
  editTarget.value = null
  const ok = await confirm({
    title: 'Delete this saved block?',
    body: block ? `"${block.label}" will be removed permanently.` : undefined,
    confirmLabel: 'Delete',
    destructive: true,
  })
  if (!ok) return
  try {
    await store.deleteSavedBlock(id)
    toast.show('Saved block deleted.')
  } catch (e) {
    toast.show(e instanceof Error ? e.message : 'Failed to delete', 'error')
  }
}

function onRowDragStart(event: DragEvent, id: string): void {
  draggedId.value = id
  const block = store.savedBlocks.find((b) => b.id === id)
  if (block) onSavedBlockDragStart(block, event)
}

function onRowDragOver(event: DragEvent, targetId: string): void {
  event.preventDefault()
  if (draggedId.value && draggedId.value !== targetId) {
    const ids = store.savedBlocks.map((b) => b.id)
    const fromIdx = ids.indexOf(draggedId.value)
    const toIdx = ids.indexOf(targetId)
    if (fromIdx === -1 || toIdx === -1) return
    const reordered = [...ids]
    const [moved] = reordered.splice(fromIdx, 1)
    reordered.splice(toIdx, 0, moved)
    void store.reorderSavedBlocks(reordered)
  }
}
</script>

<template>
  <div class="bk-pane">
    <div v-if="store.savedBlocks.length > 0" class="list-stack">
      <BrandKitListRow
        v-for="b in store.savedBlocks"
        :key="b.id"
        :row-id="b.id"
        :label="b.label"
        :category="b.category"
        :content-excerpt="excerpt(b.content)"
        :type-badge="b.type.toUpperCase()"
        :draggable="true"
        @edit="(id) => (editTarget = store.savedBlocks.find((x) => x.id === id) ?? null)"
        @delete="onDelete"
        @dragstart="onRowDragStart"
        @dragover.native="(e: DragEvent) => onRowDragOver(e, b.id)"
      />
      <button type="button" class="list-add" @click="showAdd = true">
        + Add saved block
      </button>
    </div>

    <EmptyState
      v-else
      icon="book-open"
      headline="No saved blocks yet"
      body="Add reusable copy blocks to drag into the canvas."
    >
      <template #cta>
        <button type="button" class="btn accent sm" @click="showAdd = true">
          Add saved block
        </button>
      </template>
    </EmptyState>

    <SavedBlockAddModal
      :open="showAdd"
      :saving="saving"
      @update:open="(v) => (showAdd = v)"
      @save="onAdd"
    />
    <SavedBlockEditModal
      :open="editTarget !== null"
      :block="editTarget"
      :saving="saving"
      @update:open="(v) => { if (!v) editTarget = null }"
      @save="onEdit"
      @delete="onDelete"
    />
  </div>
</template>
