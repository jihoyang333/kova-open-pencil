<script setup lang="ts">
// Layout guides (PRD 07b §Q24 — default ON, red 10%). One overlay band per layout grid
// on each FRAME. Drawn in canvas coords (camera transform applied by the wrapper).
//
// Adapted: core `SceneNode` has no `layoutGrids` field yet (packages/core is locked), so
// the field is read defensively — frames without it render nothing. Forward-compatible
// with the engine adding grid support; the UI consumer is ready.
import { computed } from 'vue'
import type { SceneNode } from '@open-pencil/core'
import { useEditorStore } from '@/stores/editor'
import { OVERLAY_Z, OVERLAY_COLOR } from '@/constants/overlays'

interface LayoutGrid {
  pattern: 'GRID' | 'COLUMNS' | 'ROWS'
  sectionSize?: number
  count?: number
  gutterSize?: number
  offset?: number
}

const editor = useEditorStore()

// Whole-subtree walk + absolute position (audit M1): nested frames carry guides too.
const frames = computed<SceneNode[]>(() => {
  void editor.state.sceneVersion
  return editor.graph
    .flattenTree(editor.state.currentPageId)
    .map((e) => e.node)
    .filter((n) => n.type === 'FRAME')
})

function gridsOf(frame: SceneNode): LayoutGrid[] {
  return (frame as SceneNode & { layoutGrids?: LayoutGrid[] }).layoutGrids ?? []
}

function bandStyle(frame: SceneNode) {
  const abs = editor.graph.getAbsolutePosition(frame.id)
  return {
    position: 'absolute' as const,
    left: `${abs.x}px`,
    top: `${abs.y}px`,
    width: `${frame.width}px`,
    height: `${frame.height}px`,
    background: OVERLAY_COLOR.LAYOUT_GUIDE_RED,
    zIndex: OVERLAY_Z.LAYOUT_GUIDES,
    pointerEvents: 'none' as const
  }
}
</script>

<template>
  <template v-for="frame in frames" :key="frame.id">
    <span
      v-for="(grid, gi) in gridsOf(frame)"
      :key="`${frame.id}-${gi}`"
      data-test="layout-guide"
      :data-pattern="grid.pattern"
      :style="bandStyle(frame)"
    />
  </template>
</template>
