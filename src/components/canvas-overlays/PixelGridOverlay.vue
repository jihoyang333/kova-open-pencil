<script setup lang="ts">
// Pixel grid (PRD 07b §12.7 / B8.5). Auto-shows above 800% zoom. Screen-space: one cell
// per canvas pixel, so cell size = current zoom (px) offset by the pan. Rendered OUTSIDE
// the camera-transform layer (it aligns to the device viewport, not canvas coords).
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { OVERLAY_Z, OVERLAY_COLOR, PIXEL_GRID_ZOOM_THRESHOLD } from '@/constants/overlays'

const editor = useEditorStore()

// Auto-show above 800% OR when the user toggled it on via Shift+' (PRD §12.7).
// Single OR-gate — the parent no longer double-gates on overlays.pixelGrid, so the
// manual toggle works at any zoom (audit H3). Figma shows the grid regardless of zoom
// once toggled; auto-show is the separate zoom condition.
const visible = computed(
  () => editor.state.overlays.pixelGrid || editor.state.zoom > PIXEL_GRID_ZOOM_THRESHOLD
)

const gridStyle = computed(() => {
  const cell = editor.state.zoom
  const ox = editor.state.panX % cell
  const oy = editor.state.panY % cell
  const line = OVERLAY_COLOR.PIXEL_GRID
  return {
    position: 'absolute' as const,
    inset: '0',
    backgroundImage: `linear-gradient(to right, ${line} 1px, transparent 1px), linear-gradient(to bottom, ${line} 1px, transparent 1px)`,
    backgroundSize: `${cell}px ${cell}px`,
    backgroundPosition: `${ox}px ${oy}px`,
    zIndex: OVERLAY_Z.PIXEL_GRID,
    pointerEvents: 'none' as const
  }
})
</script>

<template>
  <div v-if="visible" data-test="pixel-grid" :style="gridStyle" />
</template>
