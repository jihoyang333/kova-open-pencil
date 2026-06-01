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

// Walk the whole page subtree (audit M1): nested frames must outline too, and at
// their absolute canvas position — not the parent-local x/y, which mispositions
// any frame that is not a direct page child.
const frames = computed<SceneNode[]>(() => {
  void editor.state.sceneVersion // re-run when the scene changes
  return editor.graph
    .flattenTree(editor.state.currentPageId)
    .map((e) => e.node)
    .filter((n) => n.type === 'FRAME')
})

function frameStyle(f: SceneNode) {
  const abs = editor.graph.getAbsolutePosition(f.id)
  return {
    position: 'absolute' as const,
    left: `${abs.x}px`,
    top: `${abs.y}px`,
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
