<script setup lang="ts">
// Mask outlines (PRD 07b §B8.4). 1.5px green outline + corner glyph for every node with
// `isMask === true`. Drawn in canvas coords (camera transform applied by the wrapper).
import { computed } from 'vue'
import type { SceneNode } from '@open-pencil/core'
import { useEditorStore } from '@/stores/editor'
import { OVERLAY_Z, OVERLAY_COLOR } from '@/constants/overlays'

const editor = useEditorStore()

const masks = computed<SceneNode[]>(() => {
  void editor.state.sceneVersion
  return editor.graph.getChildren(editor.state.currentPageId).filter((n) => n.isMask)
})

function maskStyle(m: SceneNode) {
  return {
    position: 'absolute' as const,
    left: `${m.x}px`,
    top: `${m.y}px`,
    width: `${m.width}px`,
    height: `${m.height}px`,
    border: `1.5px solid ${OVERLAY_COLOR.MASK_GREEN}`,
    borderRadius: m.type === 'ELLIPSE' ? '50%' : '0',
    zIndex: OVERLAY_Z.MASK_OUTLINES,
    pointerEvents: 'none' as const
  }
}

function glyphStyle(m: SceneNode) {
  return {
    position: 'absolute' as const,
    left: `${m.x + m.width - 14}px`,
    top: `${m.y - 14}px`,
    width: '14px',
    height: '14px',
    background: OVERLAY_COLOR.MASK_GLYPH_BG,
    border: `1px solid ${OVERLAY_COLOR.MASK_GREEN}`,
    color: OVERLAY_COLOR.MASK_GREEN,
    textAlign: 'center' as const,
    lineHeight: '12px',
    zIndex: OVERLAY_Z.MASK_OUTLINES,
    pointerEvents: 'none' as const
  }
}

function glyphSymbol(m: SceneNode): string {
  if (m.type === 'ELLIPSE') return '○'
  if (m.type === 'VECTOR') return '∿'
  return '□'
}
</script>

<template>
  <template v-for="m in masks" :key="m.id">
    <span data-test="mask-outline" :style="maskStyle(m)" />
    <span data-test="mask-glyph" class="text-[9px]" :style="glyphStyle(m)">{{
      glyphSymbol(m)
    }}</span>
  </template>
</template>
