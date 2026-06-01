<script setup lang="ts">
// Hover contour (PRD 07b §B8). 1.5px accent outline around the hovered node. Hidden when
// nothing is hovered. Drawn in canvas coords (camera transform applied by the wrapper).
import { computed } from 'vue'
import type { SceneNode } from '@open-pencil/core'
import { useEditorStore } from '@/stores/editor'
import { OVERLAY_Z } from '@/constants/overlays'

const editor = useEditorStore()

const hovered = computed<SceneNode | null>(() => {
  void editor.state.sceneVersion
  const id = editor.state.hoveredNodeId
  return id ? (editor.graph.getNode(id) ?? null) : null
})

const contourStyle = computed(() => {
  const n = hovered.value
  if (!n) return undefined
  const abs = editor.graph.getAbsolutePosition(n.id)
  return {
    position: 'absolute' as const,
    left: `${abs.x}px`,
    top: `${abs.y}px`,
    width: `${n.width}px`,
    height: `${n.height}px`,
    border: '1.5px solid var(--color-accent)',
    zIndex: OVERLAY_Z.HOVER_CONTOUR,
    pointerEvents: 'none' as const
  }
})
</script>

<template>
  <span v-if="contourStyle" data-test="hover-contour" :style="contourStyle" />
</template>
