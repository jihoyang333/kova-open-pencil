<script setup lang="ts">
import { onMounted } from 'vue'

import EmptyState from '@/components/dashboard/EmptyState.vue'
import TrashCard from '@/components/dashboard/TrashCard.vue'
import { useCanvasesStore } from '@/stores/canvases'

const canvasesStore = useCanvasesStore()

onMounted(() => {
  void canvasesStore.fetchTrashed()
})

async function handleRestore(id: string): Promise<void> {
  await canvasesStore.restoreCanvas(id)
}

async function handlePermanentlyDelete(id: string): Promise<void> {
  await canvasesStore.permanentlyDelete(id)
}
</script>

<template>
  <div data-test-id="trash-view">
    <EmptyState
      v-if="!canvasesStore.isLoading && canvasesStore.trashedCanvases.length === 0"
      title="Trash is empty"
      description="Files you move to trash will appear here."
    />

    <div
      v-else
      class="grid gap-4"
      style="grid-template-columns: repeat(auto-fill, minmax(240px, 1fr))"
    >
      <TrashCard
        v-for="canvas in canvasesStore.sortedTrashed"
        :key="canvas.id"
        :canvas="canvas"
        @restore="handleRestore"
        @permanently-delete="handlePermanentlyDelete"
      />
    </div>
  </div>
</template>
