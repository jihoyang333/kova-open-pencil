<script setup lang="ts">
// Eyedropper crosshair (PRD 07b §12.9 / B8.7 / audit C2). When the eyedropper is
// active a full-window capture layer follows the pointer: a pixel magnifier shows the
// real canvas region under the cursor (nearest-neighbour), a hex chip previews the
// live colour, click commits the sample, Escape cancels. Screen-space (device pixels).
import { ref, computed, watch, onBeforeUnmount, nextTick } from 'vue'
import { useEyedropperStore } from '@/stores/eyedropper'
import { useEyedropperSampler } from '@/composables/use-eyedropper-sampler'
import { OVERLAY_Z, OVERLAY_COLOR } from '@/constants/overlays'

const eyedropper = useEyedropperStore()
const { sampleHexAt, drawMagnifier } = useEyedropperSampler()

const MAGNIFIER_PX = 96
const SAMPLE_SIZE = 11 // odd → a single, centred target pixel
const CELL_PX = MAGNIFIER_PX / SAMPLE_SIZE

const pointer = ref({ x: 0, y: 0 })
const currentHex = ref<string | null>(null)
const magCanvas = ref<HTMLCanvasElement | null>(null)
let rafId: number | null = null

function refresh(): void {
  const { x, y } = pointer.value
  currentHex.value = sampleHexAt(x, y)
  if (magCanvas.value) drawMagnifier(x, y, magCanvas.value, SAMPLE_SIZE)
}

function onMove(e: MouseEvent): void {
  pointer.value = { x: e.clientX, y: e.clientY }
  if (rafId !== null) return
  rafId = requestAnimationFrame(() => {
    rafId = null
    refresh()
  })
}

function onClick(): void {
  if (currentHex.value) eyedropper.sample(currentHex.value)
}

function onKeydown(e: KeyboardEvent): void {
  if (e.code === 'Escape') {
    e.preventDefault()
    eyedropper.cancel()
  }
}

// Bind window-level keydown only while active so Escape cancels without leaking a
// listener; pointer events ride the capture layer below.
watch(
  () => eyedropper.active,
  (active) => {
    if (active) {
      currentHex.value = null
      window.addEventListener('keydown', onKeydown)
      void nextTick(refresh)
    } else {
      window.removeEventListener('keydown', onKeydown)
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
        rafId = null
      }
    }
  }
)

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  if (rafId !== null) cancelAnimationFrame(rafId)
})

const captureStyle = computed(() => ({
  position: 'fixed' as const,
  inset: '0',
  zIndex: OVERLAY_Z.EYEDROPPER_MAGNIFIER - 1,
  cursor: 'none' as const
}))

const magnifierStyle = computed(() => ({
  position: 'fixed' as const,
  left: `${pointer.value.x - MAGNIFIER_PX / 2}px`,
  top: `${pointer.value.y - MAGNIFIER_PX / 2}px`,
  width: `${MAGNIFIER_PX}px`,
  height: `${MAGNIFIER_PX}px`,
  zIndex: OVERLAY_Z.EYEDROPPER_MAGNIFIER,
  pointerEvents: 'none' as const
}))

const reticleStyle = computed(() => ({
  width: `${CELL_PX}px`,
  height: `${CELL_PX}px`
}))

const chipStyle = computed(() => ({
  position: 'fixed' as const,
  left: `${pointer.value.x - 24}px`,
  top: `${pointer.value.y + MAGNIFIER_PX / 2 + 4}px`,
  zIndex: OVERLAY_Z.EYEDROPPER_HEX_CHIP,
  backgroundColor: OVERLAY_COLOR.EYEDROPPER_HEX_CHIP_BG,
  pointerEvents: 'none' as const
}))
</script>

<template>
  <template v-if="eyedropper.active">
    <!-- Full-window capture layer: receives pointer + click, hides the OS cursor. -->
    <div data-test="eyedropper-capture" :style="captureStyle" @mousemove="onMove" @click="onClick" />

    <!-- Pixel magnifier with a centred target-cell reticle. -->
    <div class="overflow-hidden rounded-full border-2 border-white shadow-lg" :style="magnifierStyle">
      <canvas
        ref="magCanvas"
        data-test="eyedropper-magnifier"
        :width="MAGNIFIER_PX"
        :height="MAGNIFIER_PX"
        class="block size-full"
      />
      <div class="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div
          class="border border-white/90 shadow-[0_0_0_1px_rgba(0,0,0,0.5)]"
          :style="reticleStyle"
        />
      </div>
    </div>

    <!-- Live hex chip. -->
    <span
      v-if="currentHex"
      data-test="eyedropper-hex"
      class="rounded px-1.5 py-px font-mono text-[11px] text-white"
      :style="chipStyle"
      >{{ currentHex }}</span
    >
  </template>
</template>
