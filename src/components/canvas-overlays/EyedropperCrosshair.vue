<script setup lang="ts">
// Eyedropper crosshair (PRD 07b §12.9 / B8.7). When the eyedropper is active, shows a
// magnifier + reticle + hex chip that follow the pointer. Screen-space (device pixels).
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useEyedropperStore } from '@/stores/eyedropper'
import { OVERLAY_Z } from '@/constants/overlays'

const eyedropper = useEyedropperStore()

const pointer = ref({ x: 0, y: 0 })

function onMove(e: MouseEvent): void {
  pointer.value = { x: e.clientX, y: e.clientY }
}

onMounted(() => window.addEventListener('mousemove', onMove))
onBeforeUnmount(() => window.removeEventListener('mousemove', onMove))

const MAGNIFIER_PX = 96
const magnifierStyle = computed(() => ({
  position: 'absolute' as const,
  left: `${pointer.value.x - MAGNIFIER_PX / 2}px`,
  top: `${pointer.value.y - MAGNIFIER_PX / 2}px`,
  width: `${MAGNIFIER_PX}px`,
  height: `${MAGNIFIER_PX}px`,
  zIndex: OVERLAY_Z.EYEDROPPER_MAGNIFIER,
  pointerEvents: 'none' as const
}))

const chipStyle = computed(() => ({
  position: 'absolute' as const,
  left: `${pointer.value.x - 24}px`,
  top: `${pointer.value.y + MAGNIFIER_PX / 2}px`,
  zIndex: OVERLAY_Z.EYEDROPPER_HEX_CHIP,
  pointerEvents: 'none' as const
}))
</script>

<template>
  <template v-if="eyedropper.active">
    <span
      data-test="eyedropper-magnifier"
      class="block rounded-full border-2 border-white shadow-lg"
      :style="magnifierStyle"
    />
    <span
      v-if="eyedropper.sampledHex"
      data-test="eyedropper-hex"
      class="rounded bg-[#2c2c2c] px-1.5 py-px font-mono text-[11px] text-white"
      :style="chipStyle"
      >{{ eyedropper.sampledHex }}</span
    >
  </template>
</template>
