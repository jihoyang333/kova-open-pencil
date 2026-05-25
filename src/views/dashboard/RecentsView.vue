<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import CanvasCreationTransition from '@/components/dashboard/CanvasCreationTransition.vue'
import Composer from '@/components/dashboard/Composer.vue'
import DashboardSkeleton from '@/components/dashboard/DashboardSkeleton.vue'
import FileGrid from '@/components/dashboard/FileGrid.vue'
import KovaIcon from '@/components/ui/KovaIcon.vue'
import SortDropdown from '@/components/dashboard/SortDropdown.vue'
import ViewToggle from '@/components/dashboard/ViewToggle.vue'
import { useFileGrid } from '@/composables/use-file-grid'
import { useGreeting } from '@/composables/use-greeting'
import { useCanvasesStore } from '@/stores/canvases'
import { useDashboardStore } from '@/stores/dashboard'
import { useUIStateStore } from '@/stores/ui-state'

// PRD 02 §3.2 + Plan T33 — recents (default child of /brand/:brandId).
// Composes greeting + composer + file-grid + B11 canvas-creation transition.

const route = useRoute()
const router = useRouter()
const canvasesStore = useCanvasesStore()
const dashboard = useDashboardStore()
const uiState = useUIStateStore()

const brandIdRef = computed(() => {
  const raw = route.params.brandId
  return typeof raw === 'string' ? raw : ''
})
const grid = useFileGrid(brandIdRef)
const greeting = useGreeting()

const sortMode = computed(() => dashboard.sortMode)
const fileGridViewMode = computed(() => uiState.fileGridViewMode)

const transitionState = ref<'idle' | 'submitting' | 'review' | 'splash'>('idle')
const transitionPrompt = ref('')

async function onSubmit(prompt: string): Promise<void> {
  if (!brandIdRef.value) return
  transitionState.value = 'submitting'
  transitionPrompt.value = prompt
  try {
    const canvas = await canvasesStore.createCanvas(brandIdRef.value, prompt || undefined)
    transitionState.value = 'review'
    await new Promise((r) => setTimeout(r, 120))
    transitionState.value = 'splash'
    await new Promise((r) => setTimeout(r, 100))
    await router.push(`/editor/${canvas.id}`)
  } catch {
    transitionState.value = 'idle'
  }
}

async function onNewCanvas(): Promise<void> {
  return onSubmit('')
}

function onOpen(canvasId: string): void {
  void router.push(`/editor/${canvasId}`)
}

defineExpose({ onNewCanvas })
</script>

<template>
  <DashboardSkeleton v-if="grid.isLoading.value" />
  <div v-else data-test-id="recents-view" class="dash-content">
    <div class="greeting">
      <div class="hello">{{ greeting }}</div>
    </div>

    <CanvasCreationTransition
      v-if="transitionState !== 'idle'"
      :state="transitionState"
      :prompt="transitionPrompt"
    />
    <Composer v-else @submit="onSubmit" />

    <div class="recents-section">
      <div class="sec-head">
        <div class="l">
          <h4>Recent files</h4>
          <span class="count">{{ grid.canvases.value.length }} canvases</span>
        </div>
        <div class="r">
          <SortDropdown :model-value="sortMode" @update:model-value="grid.setSort" />
          <ViewToggle :model-value="fileGridViewMode" @update:model-value="grid.setView" />
        </div>
      </div>

      <FileGrid
        :canvases="grid.canvases.value"
        :view-mode="fileGridViewMode"
        :is-loading="grid.isLoading.value"
        @open="onOpen"
      >
        <template #empty>
          <div
            v-if="grid.hasSearchQuery.value"
            data-test-id="empty-search"
            class="empty-pane small p-8 text-center text-[var(--ink-3)]"
          >
            <KovaIcon name="search-x" size="md" />
            <h5 class="text-[var(--ink)] font-semibold mt-3">Nothing matches here</h5>
            <button class="btn mt-3" @click="grid.search('')">Clear search</button>
          </div>
          <div
            v-else
            data-test-id="empty-canvases"
            class="empty-pane p-10 text-center text-[var(--ink-3)]"
          >
            <KovaIcon name="layout-grid" size="md" />
            <h5 class="text-[var(--ink)] font-semibold text-base mt-3">No canvases yet</h5>
            <p class="mt-2 text-sm">
              Start a canvas to design emails, landings, or product pages with Kova.
            </p>
            <div class="cta-row mt-4 flex justify-center gap-2">
              <button class="btn primary" @click="onNewCanvas">
                <KovaIcon name="plus" size="sm" class="ic" />
                New canvas
              </button>
            </div>
          </div>
        </template>
      </FileGrid>
    </div>
  </div>
</template>
