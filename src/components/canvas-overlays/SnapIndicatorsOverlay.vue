<script setup lang="ts">
// Snap indicators (PRD 07b §B8.1). Renders the active snap guides from the editor as red
// lines. Drawn in canvas coords (camera transform applied by the wrapper). Empty when no
// snap is in progress.
import { computed } from 'vue'
import type { SnapGuide } from '@open-pencil/core'
import { useEditorStore } from '@/stores/editor'
import { OVERLAY_Z, OVERLAY_COLOR } from '@/constants/overlays'

const editor = useEditorStore()

const guides = computed<SnapGuide[]>(() => editor.state.snapGuides)

function guideStyle(g: SnapGuide) {
  const horizontal = g.axis === 'y'
  return {
    position: 'absolute' as const,
    left: `${horizontal ? g.from : g.position}px`,
    top: `${horizontal ? g.position : g.from}px`,
    width: horizontal ? `${g.to - g.from}px` : '1px',
    height: horizontal ? '1px' : `${g.to - g.from}px`,
    background: OVERLAY_COLOR.SNAP_RED,
    zIndex: OVERLAY_Z.SNAP_PIXEL,
    pointerEvents: 'none' as const
  }
}
</script>

<template>
  <span
    v-for="(g, i) in guides"
    :key="i"
    data-test="snap-guide"
    :style="guideStyle(g)"
  />
</template>
