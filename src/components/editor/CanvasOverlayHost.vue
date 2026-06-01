<script setup lang="ts">
/**
 * CanvasOverlayHost — Cluster 06 Task 16.
 *
 * Absolute-positioned slot host stretched over the canvas viewport. Cluster 07b
 * mounts its overlays (selection box, frame outlines, measurement annotations,
 * find dim-layer, etc.) as children of the default slot.
 *
 * The host itself is `pointer-events-none` so it never intercepts canvas input;
 * individual overlays opt back into pointer events as needed. Sits at z-20 per
 * the canvas viewport z-stack (Plan 06 sub-spec 14.x):
 *   z-0 canvas · z-10 selection · z-20 overlays · z-30 pill/zoom · z-50 modal.
 */
</script>

<template>
  <div class="pointer-events-none absolute inset-0 z-20" data-testid="canvas-overlay-host">
    <slot />
  </div>
</template>
