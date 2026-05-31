<script setup lang="ts">
// Cluster 05 — ToneSnippetsTab.vue (PRD §3.4, A7.3.3)
// CRUD list of tone snippets. Drag-reorder. Add / Edit / Delete modals.

import { ref } from 'vue'

import EmptyState from '@/components/ui/EmptyState.vue'
import BrandKitListRow from './shared/BrandKitListRow.vue'
import ToneSnippetAddModal from './modals/ToneSnippetAddModal.vue'
import ToneSnippetEditModal from './modals/ToneSnippetEditModal.vue'
import { useBrandKitStore } from '@/stores/brand-kit'
import { useConfirm } from '@/composables/use-confirm'
import { toast } from '@/composables/use-toast'
import { useBrandKitDrag } from '@/composables/brand-kit/use-brand-kit-drag'
import type { ToneSnippet } from '@/types/brand-kit'

const store = useBrandKitStore()
const confirm = useConfirm()
const { onSavedBlockDragStart: _unused } = useBrandKitDrag()

const showAdd = ref(false)
const editTarget = ref<ToneSnippet | null>(null)
const saving = ref(false)

function excerpt(content: string): string {
  return content.length > 120 ? content.slice(0, 120) + '…' : content
}

async function onAdd(label: string, category: string, content: string): Promise<void> {
  saving.value = true
  try {
    await store.addToneSnippet(label, category, content)
    showAdd.value = false
    toast.show('Tone snippet added.')
  } catch (e) {
    toast.show(e instanceof Error ? e.message : 'Failed to add', 'error')
  } finally {
    saving.value = false
  }
}

async function onEdit(id: string, label: string, category: string, content: string): Promise<void> {
  saving.value = true
  try {
    await store.updateToneSnippet(id, label, category, content)
    editTarget.value = null
    toast.show('Tone snippet updated.')
  } catch (e) {
    toast.show(e instanceof Error ? e.message : 'Failed to update', 'error')
  } finally {
    saving.value = false
  }
}

async function onDelete(id: string): Promise<void> {
  const snippet = store.toneSnippets.find((s) => s.id === id)
  editTarget.value = null
  const ok = await confirm({
    title: 'Delete tone snippet?',
    body: snippet ? `"${snippet.label}" will be removed permanently.` : undefined,
    confirmLabel: 'Delete',
    destructive: true,
  })
  if (!ok) return
  try {
    await store.deleteToneSnippet(id)
    toast.show('Tone snippet deleted.')
  } catch (e) {
    toast.show(e instanceof Error ? e.message : 'Failed to delete', 'error')
  }
}

// Drag reorder: minimal HTML5 drag tracking
const draggedId = ref<string | null>(null)

function onRowDragStart(_event: DragEvent, id: string): void {
  draggedId.value = id
}

function onRowDragOver(event: DragEvent, targetId: string): void {
  event.preventDefault()
  if (draggedId.value && draggedId.value !== targetId) {
    const ids = store.toneSnippets.map((s) => s.id)
    const fromIdx = ids.indexOf(draggedId.value)
    const toIdx = ids.indexOf(targetId)
    if (fromIdx === -1 || toIdx === -1) return
    const reordered = [...ids]
    const [moved] = reordered.splice(fromIdx, 1)
    reordered.splice(toIdx, 0, moved)
    void store.reorderToneSnippets(reordered)
  }
}
</script>

<template>
  <div class="bk-pane">
    <div v-if="store.toneSnippets.length > 0" class="list-stack">
      <BrandKitListRow
        v-for="s in store.toneSnippets"
        :key="s.id"
        :row-id="s.id"
        :label="s.label"
        :category="s.category"
        :content-excerpt="excerpt(s.content)"
        :draggable="true"
        @edit="(id) => (editTarget = store.toneSnippets.find((x) => x.id === id) ?? null)"
        @delete="onDelete"
        @dragstart="onRowDragStart"
        @dragover.native="(e: DragEvent) => onRowDragOver(e, s.id)"
      />
      <button type="button" class="list-add" @click="showAdd = true">
        + Add tone snippet
      </button>
    </div>

    <EmptyState
      v-else
      icon="sparkles"
      headline="No tone snippets yet"
      body="Add voice exemplars to guide the AI's tone."
    >
      <template #cta>
        <button type="button" class="btn accent sm" @click="showAdd = true">
          Add tone snippet
        </button>
      </template>
    </EmptyState>

    <ToneSnippetAddModal
      :open="showAdd"
      :saving="saving"
      @update:open="(v) => (showAdd = v)"
      @save="onAdd"
    />
    <ToneSnippetEditModal
      :open="editTarget !== null"
      :snippet="editTarget"
      :saving="saving"
      @update:open="(v) => { if (!v) editTarget = null }"
      @save="onEdit"
      @delete="onDelete"
    />
  </div>
</template>
