<script setup lang="ts">
// Dim layer (PRD §12.12 find focus primitive). Renders a translucent backdrop rect over
// each dimmed node's bbox. Pointer-events off by default; FindOverlay flips `interactive`
// to make the dim rects clickable (clickthrough handling). Drawn in canvas coords.
//
// Adapted per R6/R-find: bboxes come from the real editor graph, not figma.getNodeById.
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { OVERLAY_Z, OVERLAY_COLOR } from '@/constants/overlays'

const { dimmedNodeIds, interactive = false } = defineProps<{
  dimmedNodeIds: string[]
  interactive?: boolean
}>()
const emit = defineEmits<{ 'dim-click': [nodeId: string] }>()

interface DimRect {
  id: string
  left: number
  top: number
  width: number
  height: number
}

const rects = computed<DimRect[]>(() => {
  const editor = useEditorStore()
  void editor.state.sceneVersion
  const out: DimRect[] = []
  for (const id of dimmedNodeIds) {
    const node = editor.graph.getNode(id)
    if (!node) continue
    const abs = editor.graph.getAbsolutePosition(id)
    out.push({ id, left: abs.x, top: abs.y, width: node.width, height: node.height })
  }
  return out
})

function rectStyle(r: DimRect) {
  return {
    position: 'absolute' as const,
    left: `${r.left}px`,
    top: `${r.top}px`,
    width: `${r.width}px`,
    height: `${r.height}px`,
    background: OVERLAY_COLOR.FIND_DIM,
    zIndex: OVERLAY_Z.DIM_LAYER,
    pointerEvents: interactive ? ('auto' as const) : ('none' as const),
    cursor: interactive ? ('pointer' as const) : undefined
  }
}
</script>

<template>
  <span
    v-for="r in rects"
    :key="r.id"
    data-test="dim-rect"
    :style="rectStyle(r)"
    @click="interactive && emit('dim-click', r.id)"
  />
</template>
