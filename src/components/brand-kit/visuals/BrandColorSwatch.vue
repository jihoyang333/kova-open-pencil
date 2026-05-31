<script setup lang="ts">
// Cluster 05 — BrandColorSwatch.vue (PRD §3.2, A7.3.1)
// Color swatch tile: fill preview + name + hex. Draggable (MIME: brand-color).

import KovaIcon from '@/components/ui/KovaIcon.vue'
import { useBrandKitDrag } from '@/composables/brand-kit/use-brand-kit-drag'
import type { BrandColor } from '@/types/brand-kit'

const props = defineProps<{
  color: BrandColor
}>()

const emit = defineEmits<{
  (e: 'edit', color: BrandColor): void
}>()

const { onColorDragStart } = useBrandKitDrag()

function onDragStart(event: DragEvent): void {
  onColorDragStart(props.color, event)
}
</script>

<template>
  <div
    class="sw-item"
    draggable="true"
    :aria-label="`${color.label} ${color.hex}`"
    @dragstart="onDragStart"
  >
    <div class="fill" :style="{ background: color.hex }" />
    <div class="body">
      <div class="nm">{{ color.label }}</div>
      <div class="hex">{{ color.hex }}</div>
    </div>
    <button
      type="button"
      class="sw-edit-btn"
      :aria-label="`Edit ${color.label}`"
      @click.stop="emit('edit', color)"
    >
      <KovaIcon name="pencil" size="xs" aria-hidden="true" />
    </button>
  </div>
</template>
