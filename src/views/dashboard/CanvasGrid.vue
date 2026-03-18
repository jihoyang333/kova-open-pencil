<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import CanvasCard from '@/components/dashboard/CanvasCard.vue'
import EmptyState from '@/components/dashboard/EmptyState.vue'
import MoveToTrashDialog from '@/components/dashboard/MoveToTrashDialog.vue'
import { useCanvasesStore } from '@/stores/canvases'

import type { Canvas } from '@/types/kova/database'

const route = useRoute()
const router = useRouter()
const canvasesStore = useCanvasesStore()

const brandId = () => route.params.brandId as string

onMounted(() => {
  void canvasesStore.fetchCanvases(brandId())
})

watch(() => route.params.brandId, (newBrandId) => {
  if (typeof newBrandId === 'string') {
    void canvasesStore.fetchCanvases(newBrandId)
  }
})

async function handleNewCanvas(): Promise<void> {
  const canvas = await canvasesStore.createCanvas(brandId())
  void router.push(`/editor/${canvas.id}`)
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

    <div
      v-else
      class="grid gap-4"
      style="grid-template-columns: repeat(auto-fill, minmax(240px, 1fr))"
    >
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

    <MoveToTrashDialog />
  </div>
</template>
