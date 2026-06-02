<script setup lang="ts">
import { computed, ref } from 'vue'

import KovaModal from '@/components/ui/KovaModal.vue'
import { useSnapshotsStore } from '@/stores/snapshots'

/**
 * Add-to-version-history modal (hi-fi 17.8 / 17.9). Supersedes the retired
 * A8.1 Snapshot dialog. Opened by the panel `+` button or the ⌘+⌥+S shortcut
 * (useVersionHistoryShortcut → store.openAddDialog). Save stays disabled until
 * a Title is entered, then flips to `.btn.primary`.
 */

const props = defineProps<{ canvasId: string }>()
const emit = defineEmits<{ saved: [id: string]; cancelled: [] }>()

const store = useSnapshotsStore()
const title = ref('')
const description = ref('')
const saveDisabled = computed(() => title.value.trim() === '')

function reset(): void {
  title.value = ''
  description.value = ''
}

async function onSave(): Promise<void> {
  if (saveDisabled.value) return
  const res = await store.create({
    canvasId: props.canvasId,
    kind: 'manual',
    label: title.value.trim(),
    description: description.value.trim() || null,
  })
  if (res.ok) emit('saved', res.id)
  reset()
  store.closeAddDialog()
}

function onCancel(): void {
  reset()
  emit('cancelled')
  store.closeAddDialog()
}
</script>

<template>
  <KovaModal
    :open="store.addDialogOpen"
    size="sm"
    title="Add to version history"
    @close="onCancel"
  >
    <div class="fld">
      <input
        data-testid="title-input"
        class="input"
        :value="title"
        placeholder="Title"
        aria-label="Title"
        autofocus
        @input="title = ($event.target as HTMLInputElement).value"
      />
    </div>
    <div class="fld">
      <textarea
        data-testid="desc-input"
        class="input"
        :value="description"
        placeholder="Describe what changed"
        aria-label="Description"
        @input="description = ($event.target as HTMLTextAreaElement).value"
      />
    </div>
    <template #foot>
      <button data-testid="cancel-button" class="btn" @click="onCancel">Cancel</button>
      <button
        data-testid="save-button"
        class="btn primary"
        :class="{ disabled: saveDisabled }"
        :aria-disabled="saveDisabled"
        @click="onSave"
      >
        Save
      </button>
    </template>
  </KovaModal>
</template>
