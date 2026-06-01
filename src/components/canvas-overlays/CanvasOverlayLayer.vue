<script setup lang="ts">
// Single overlay mount point (PRD 07b §B8 + §12.12). Composes every 07b canvas overlay.
//
// Two sub-layers:
//  - camera-transformed layer: node-bound overlays draw in canvas coordinates and are
//    projected by one shared translate/scale (matches the canvas pan/zoom).
//  - screen-space layer: pixel grid + eyedropper crosshair align to device pixels.
//
// The host itself is pointer-events-none; FindOverlay re-enables pointer events on its
// own dim rects for clickthrough handling.
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { useFindStore } from '@/stores/find'
import FrameOutlinesOverlay from './FrameOutlinesOverlay.vue'
import MaskOutlinesOverlay from './MaskOutlinesOverlay.vue'
import SliceRegionOverlay from './SliceRegionOverlay.vue'
import LayoutGuidesOverlay from './LayoutGuidesOverlay.vue'
import HoverContourOverlay from './HoverContourOverlay.vue'
import SnapIndicatorsOverlay from './SnapIndicatorsOverlay.vue'
import MeasurementAnnotations from './MeasurementAnnotations.vue'
import FindOverlay from './FindOverlay.vue'
import PixelGridOverlay from './PixelGridOverlay.vue'
import EyedropperCrosshair from './EyedropperCrosshair.vue'

const editor = useEditorStore()
const findStore = useFindStore()

const cameraStyle = computed(() => ({
  position: 'absolute' as const,
  inset: '0',
  transformOrigin: '0 0',
  transform: `translate(${editor.state.panX}px, ${editor.state.panY}px) scale(${editor.state.zoom})`,
  pointerEvents: 'none' as const
}))
</script>

<template>
  <div class="pointer-events-none absolute inset-0">
    <!-- Camera-projected, node-bound overlays -->
    <div :style="cameraStyle">
      <FrameOutlinesOverlay v-if="editor.state.overlays.frameOutlines" />
      <MaskOutlinesOverlay v-if="editor.state.overlays.maskOutlines" />
      <SliceRegionOverlay />
      <LayoutGuidesOverlay v-if="editor.state.overlays.layoutGuides" />
      <HoverContourOverlay v-if="editor.state.overlays.hoverContour" />
      <SnapIndicatorsOverlay />
      <MeasurementAnnotations v-if="editor.state.overlays.measurements" />
      <FindOverlay v-if="findStore.active" />
    </div>

    <!-- Screen-space overlays. PixelGridOverlay self-gates (manual toggle OR
         auto-show > 800%); do NOT double-gate the mount here (audit H3). -->
    <PixelGridOverlay />
    <EyedropperCrosshair />
  </div>
</template>
