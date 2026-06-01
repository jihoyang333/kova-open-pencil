<script setup lang="ts">
// Multiple-fills list (PRD 07b §11.13). Drag-handle row per fill + add/remove/visibility.
// Mixed selection shows a placeholder. Reorder is emitted for the parent to apply.
import { colorToCSS } from '@open-pencil/core'
import type { Fill } from '@open-pencil/core'
import KovaIcon from '@/components/ui/KovaIcon.vue'

const { fills, mixed } = defineProps<{ fills: Fill[]; mixed: boolean }>()
const emit = defineEmits<{
  add: []
  remove: [index: number]
  reorder: [event: { fromIndex: number; toIndex: number }]
  'toggle-visibility': [index: number]
}>()

const TYPE_LABELS: Partial<Record<Fill['type'], string>> = {
  SOLID: 'Solid',
  IMAGE: 'Image',
  GRADIENT_LINEAR: 'Linear',
  GRADIENT_RADIAL: 'Radial',
  GRADIENT_ANGULAR: 'Angular',
  GRADIENT_DIAMOND: 'Diamond'
}

function fillLabel(fill: Fill): string {
  return TYPE_LABELS[fill.type] ?? fill.type
}

// Solid → its colour; gradient/image → a neutral swatch (gradient handles + image hash
// resolution live elsewhere; the inspector only needs a recognisable chip here).
function swatchStyle(fill: Fill): Record<string, string> {
  return fill.type === 'SOLID' ? { background: colorToCSS(fill.color) } : {}
}
</script>

<template>
  <div v-if="mixed" class="text-xs text-ink-3">Click to enter mixed value</div>

  <div v-else class="flex flex-col gap-1">
    <div
      v-for="(fill, index) in fills"
      :key="index"
      data-test="fill-row"
      class="flex items-center gap-2 rounded px-2 py-1 text-xs hover:bg-fill-2"
    >
      <KovaIcon name="grip-vertical" size="xs" class="cursor-grab text-ink-3" />
      <span
        class="size-4 rounded border border-border"
        :class="fill.type === 'SOLID' ? '' : 'bg-fill-2'"
        :style="swatchStyle(fill)"
      />
      <span class="flex-1 text-ink">{{ fillLabel(fill) }}</span>
      <span class="font-mono text-ink-3">{{ Math.round(fill.opacity * 100) }}%</span>
      <button
        type="button"
        class="cursor-pointer text-ink-3 hover:text-ink"
        :title="fill.visible ? 'Hide' : 'Show'"
        @click="emit('toggle-visibility', index)"
      >
        <KovaIcon :name="fill.visible ? 'eye' : 'eye-off'" size="xs" />
      </button>
      <button
        type="button"
        data-test="fill-remove"
        class="cursor-pointer text-ink-3 hover:text-ink"
        title="Remove fill"
        @click="emit('remove', index)"
      >
        ×
      </button>
    </div>
    <button
      type="button"
      data-test="add-fill"
      class="cursor-pointer self-start text-xs text-accent hover:text-accent-hover"
      @click="emit('add')"
    >
      + Add fill
    </button>
  </div>
</template>
