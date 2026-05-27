<script setup lang="ts">
/**
 * RightPanel — Cluster 06 Task 15.
 *
 * Hi-fi source: Kova Canvas - Final.html `.kc .right` (lines 327-501).
 * 264px wide, rail bg, hairline left border, tab strip + frame-head + body.
 *
 * Two-tab framework (Design + AI). AI tab renders <RightPanelAiSlot>
 * (Cluster 10's ChatPanel). Design tab renders <FrameHead> + <InspectorRouter>
 * (Cluster 07b's sections).
 */
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { useRightPanelStore } from '@/stores/right-panel'
import RightPanelTabs from './RightPanelTabs.vue'
import FrameHead from './FrameHead.vue'
import InspectorRouter from './InspectorRouter.vue'
import RightPanelAiSlot from './RightPanelAiSlot.vue'

const editor = useEditorStore()
const rightPanel = useRightPanelStore()

const isAi = computed(() => rightPanel.activeTab === 'ai')

const zoomLabel = computed(() => `${Math.round(editor.state.zoom * 100)}%`)
</script>

<template>
  <aside
    class="w-[264px] bg-rail border-l border-line flex flex-col min-h-0 overflow-hidden"
    data-testid="right-panel"
  >
    <RightPanelTabs>
      <template #zoom>
        <span data-testid="right-panel-zoom">{{ zoomLabel }}</span>
      </template>
    </RightPanelTabs>
    <div v-if="isAi" class="flex-1 overflow-hidden" data-testid="right-panel-body-ai">
      <RightPanelAiSlot />
    </div>
    <div v-else class="flex-1 overflow-auto" data-testid="right-panel-body-design">
      <FrameHead />
      <InspectorRouter />
    </div>
  </aside>
</template>
