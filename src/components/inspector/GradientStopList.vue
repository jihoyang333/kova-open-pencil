<script setup lang="ts">
// Gradient stop list (PRD 07b §12.6/12.7). Outer stops (0%, 100%) hide the × remove
// control; intermediate stops show it. Pure presentational — parent (PaintEditor) owns
// the Fill.gradientStops array and applies edits.
import { colorToCSS } from '@open-pencil/core'
import type { GradientStop } from '@open-pencil/core'

const { stops, selectedIndex } = defineProps<{
  stops: GradientStop[]
  selectedIndex: number
}>()
const emit = defineEmits<{
  'update:selectedIndex': [index: number]
  add: []
  remove: [index: number]
}>()

function isOuter(index: number): boolean {
  return index === 0 || index === stops.length - 1
}
</script>

<template>
  <div class="flex flex-col gap-1">
    <div
      v-for="(stop, index) in stops"
      :key="index"
      data-test="stop-row"
      :data-stop="index"
      class="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs"
      :class="index === selectedIndex ? 'bg-fill-2 ring-1 ring-accent' : 'hover:bg-fill-2'"
      @click="emit('update:selectedIndex', index)"
    >
      <span
        class="size-4 rounded border border-border"
        :style="{ background: colorToCSS(stop.color) }"
      />
      <span class="flex-1 font-mono text-ink-2">{{ Math.round(stop.position * 100) }}%</span>
      <button
        type="button"
        data-test="stop-remove"
        class="cursor-pointer text-ink-3 hover:text-ink"
        :style="{ visibility: isOuter(index) ? 'hidden' : 'visible' }"
        title="Remove stop"
        @click.stop="emit('remove', index)"
      >
        ×
      </button>
    </div>
    <button
      type="button"
      data-test="add-stop"
      class="cursor-pointer self-start text-xs text-accent hover:text-accent-hover"
      @click="emit('add')"
    >
      + Add stop
    </button>
  </div>
</template>
