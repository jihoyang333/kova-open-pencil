<script setup lang="ts">
// Slice regions (PRD 07b §B8 slice export). Dashed region + name tag per SLICE node.
// Always shown (slices are export targets). Drawn in canvas coords (wrapper transforms).
import { computed } from 'vue'
import type { SceneNode } from '@open-pencil/core'
import { useEditorStore } from '@/stores/editor'
import { OVERLAY_Z, OVERLAY_COLOR } from '@/constants/overlays'

const editor = useEditorStore()

const slices = computed<SceneNode[]>(() => {
  void editor.state.sceneVersion
  return editor.graph.getChildren(editor.state.currentPageId).filter((n) => n.type === 'SLICE')
})

function regionStyle(s: SceneNode) {
  return {
    position: 'absolute' as const,
    left: `${s.x}px`,
    top: `${s.y}px`,
    width: `${s.width}px`,
    height: `${s.height}px`,
    border: `1px dashed ${OVERLAY_COLOR.SLICE_DASH}`,
    zIndex: OVERLAY_Z.SLICE_REGION,
    pointerEvents: 'none' as const
  }
}

function labelStyle(s: SceneNode) {
  return {
    position: 'absolute' as const,
    left: `${s.x}px`,
    top: `${s.y - 18}px`,
    background: OVERLAY_COLOR.SLICE_LABEL_BG,
    zIndex: OVERLAY_Z.FRAME_LABEL,
    pointerEvents: 'none' as const
  }
}
</script>

<template>
  <template v-for="s in slices" :key="s.id">
    <span data-test="slice-region" :style="regionStyle(s)" />
    <span
      data-test="slice-label"
      class="rounded-sm px-1.5 py-px text-[11px] text-white"
      :style="labelStyle(s)"
      >{{ s.name }}</span
    >
  </template>
</template>
