<script setup lang="ts">
// Frame outlines (PRD 07b §B8.3). One 1px outline per FRAME node, drawn in canvas
// coordinates — CanvasOverlayLayer applies the camera transform once for all overlays.
//
// Adapted per R6: reads the real editor scene graph (no `figma.currentPage.children`
// singleton / mock.module of core, which poisons the editor store in tests).
import { computed } from 'vue'
import type { SceneNode } from '@open-pencil/core'
import { useEditorStore } from '@/stores/editor'
import { OVERLAY_Z, OVERLAY_COLOR } from '@/constants/overlays'

const editor = useEditorStore()

const frames = computed<SceneNode[]>(() => {
  void editor.state.sceneVersion // re-run when the scene changes
  return editor.graph.getChildren(editor.state.currentPageId).filter((n) => n.type === 'FRAME')
})

function frameStyle(f: SceneNode) {
  return {
    position: 'absolute' as const,
    left: `${f.x}px`,
    top: `${f.y}px`,
    width: `${f.width}px`,
    height: `${f.height}px`,
    border: `1px solid ${OVERLAY_COLOR.FRAME_OUTLINE}`,
    zIndex: OVERLAY_Z.FRAME_OUTLINES,
    pointerEvents: 'none' as const
  }
}
</script>

<template>
  <span
    v-for="f in frames"
    :key="f.id"
    data-test="frame-outline"
    :style="frameStyle(f)"
  />
</template>
