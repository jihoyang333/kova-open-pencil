<script setup lang="ts">
/**
 * LayersChromePanel — Cluster 06 Task 11.
 *
 * Hi-fi source: Kova Canvas - Final.html `.kc .left .layers` (lines 187-216).
 * Consumes useLayerTree composable (shipped in Task 5). Per-row hover sets
 * editor.hoveredNodeId; click selects via editor.select.
 *
 * NOTE: named `LayersChromePanel` to disambiguate from the M5-era
 * `src/components/LayersPanel.vue` which the EditorView refactor (T14)
 * will replace.
 */
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { useLayerTree, type LayerRow as LayerRowType } from '@/composables/use-layer-tree'
import LayerRow from './LayerRow.vue'
import LayersEmptyState from './LayersEmptyState.vue'

const editor = useEditorStore()
const tree = useLayerTree()

const rows = computed(() => tree.flatRows.value)

function isSelected(id: string): boolean {
  return editor.state.selectedIds.has(id)
}

function onRowClick(row: LayerRowType, ev: MouseEvent): void {
  const additive = ev.shiftKey || ev.metaKey || ev.ctrlKey
  editor.select([row.id], additive)
}

function onToggleExpand(row: LayerRowType): void {
  tree.toggleExpand(row.id)
}

function onToggleVisibility(row: LayerRowType): void {
  editor.select([row.id])
  editor.toggleVisibility()
}

function onToggleLock(row: LayerRowType): void {
  editor.select([row.id])
  editor.toggleLock()
}

function onHover(row: LayerRowType | null): void {
  editor.setHoveredNode(row?.id ?? null)
}
</script>

<template>
  <div
    class="flex-1 overflow-auto px-1.5 pb-4"
    role="tree"
    aria-label="Layers"
    data-testid="layers-chrome-panel"
  >
    <LayersEmptyState v-if="rows.length === 0" />
    <template v-else>
      <LayerRow
        v-for="row in rows"
        :key="row.id"
        :row="row"
        :selected="isSelected(row.id)"
        @click="onRowClick"
        @toggle-expand="onToggleExpand"
        @toggle-visibility="onToggleVisibility"
        @toggle-lock="onToggleLock"
        @hover="onHover"
      />
    </template>
  </div>
</template>
