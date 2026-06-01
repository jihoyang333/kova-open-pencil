<script setup lang="ts">
// Find focus orchestrator (PRD §12.12, CT-022 — 07b owns find end-to-end). Active only
// while the find store is active. Dims every page node that is NOT a match; clicking a
// dimmed node exits find and selects that node. Matched nodes have no dim rect, so their
// clicks pass through to the canvas for normal selection.
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { useFindStore } from '@/stores/find'
import DimLayerOverlay from './DimLayerOverlay.vue'

const editor = useEditorStore()
const findStore = useFindStore()

const dimmedNodeIds = computed<string[]>(() => {
  void editor.state.sceneVersion
  const matched = new Set(findStore.matchedNodeIds)
  return editor.graph
    .getChildren(editor.state.currentPageId)
    .filter((n) => !matched.has(n.id))
    .map((n) => n.id)
})

function onDimClick(nodeId: string): void {
  findStore.exitOnDimClick(nodeId)
  editor.select([nodeId])
}
</script>

<template>
  <div data-test="find-overlay" class="pointer-events-none absolute inset-0">
    <DimLayerOverlay :dimmed-node-ids="dimmedNodeIds" interactive @dim-click="onDimClick" />
  </div>
</template>
