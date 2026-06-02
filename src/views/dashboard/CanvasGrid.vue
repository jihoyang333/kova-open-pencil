<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import CanvasCard from '@/components/dashboard/CanvasCard.vue'
import EmptyState from '@/components/dashboard/EmptyState.vue'
import TrashConfirmModal from '@/components/trash/TrashConfirmModal.vue'
import { useCanvasesStore } from '@/stores/canvases'

import type { Canvas } from '@/types/kova/database'

const route = useRoute()
const router = useRouter()
const canvasesStore = useCanvasesStore()

const brandId = () => route.params.brandId as string

onMounted(() => {
  void canvasesStore.fetchCanvases(brandId())
})

watch(
  () => route.params.brandId,
  (newBrandId) => {
    if (typeof newBrandId === 'string') {
      void canvasesStore.fetchCanvases(newBrandId)
    }
  }
)

async function handleNewCanvas(): Promise<void> {
  try {
    const canvas = await canvasesStore.createCanvas(brandId())
    void router.push(`/editor/${canvas.id}`)
  } catch (error) {
    console.error('Failed to create canvas:', error)
  }
}

function handleOpenCanvas(canvas: Canvas): void {
  void router.push(`/editor/${canvas.id}`)
}

async function handleRename(id: string, name: string): Promise<void> {
  await canvasesStore.renameCanvas(id, name)
}

async function handleDuplicate(id: string): Promise<void> {
  await canvasesStore.duplicateCanvas(id)
}
</script>

<template>
  <div data-test-id="canvas-grid-view">
    <EmptyState
      v-if="!canvasesStore.isLoading && canvasesStore.canvases.length === 0"
      title="Create your first canvas"
      description="Design beautiful emails with AI-powered tools. Start by creating a new canvas."
      action-label="Create canvas"
      @action="handleNewCanvas"
    />

    <div v-else class="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
      <!-- New Canvas card -->
      <button
        data-test-id="canvas-new-card"
        class="flex h-48 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 text-gray-400 transition-colors hover:border-blue-400 hover:text-blue-500"
        @click="handleNewCanvas"
      >
        <icon-lucide-plus class="mb-2 size-8" />
        <span class="text-sm font-medium">New Canvas</span>
      </button>

      <!-- Existing canvas cards -->
      <CanvasCard
        v-for="canvas in canvasesStore.sortedCanvases"
        :key="canvas.id"
        :canvas="canvas"
        @open="handleOpenCanvas(canvas)"
        @rename="handleRename"
        @duplicate="handleDuplicate"
      />
    </div>

    <!-- Cluster 09 Task 22: hi-fi B13.1 trash-confirm, wired to the Cluster 02
         canvasToTrash flow. Replaces the pre-design-system MoveToTrashDialog. -->
    <TrashConfirmModal
      v-if="canvasesStore.canvasToTrash"
      :canvas-name="canvasesStore.canvasToTrash.name"
      @confirmed="canvasesStore.executeMoveToTrash()"
      @cancelled="canvasesStore.cancelMoveToTrash()"
    />
  </div>
</template>
