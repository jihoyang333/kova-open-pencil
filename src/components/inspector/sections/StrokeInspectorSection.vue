<script setup lang="ts">
// Stroke inspector section (audit H1 — wires StrokeAlignRow into the live panel).
// Per-stroke colour + weight + visibility, plus a section-level align segmented control
// (StrokeAlignRow) that applies to every stroke of the selection, mirroring Figma.
import { computed } from 'vue'
import type { Color, Stroke } from '@open-pencil/core'
import { useMultiProps } from '@/composables/use-multi-props'
import { SECTION_DEFAULT_STROKE } from '@/constants'
import ColorInput from '@/components/ColorInput.vue'
import StrokeAlignRow from '@/components/inspector/StrokeAlignRow.vue'

type Align = Stroke['align']

const { active, activeNode, isArrayMixed, targetNodes, updateArrayItem, removeArrayItem, toggleArrayVisibility, store } =
  useMultiProps()

const mixed = computed(() => isArrayMixed('strokes'))
const strokes = computed<Stroke[]>(() => activeNode.value?.strokes ?? [])
const align = computed<Align>(() => strokes.value[0]?.align ?? 'INSIDE')

function setAlign(value: Align): void {
  for (const n of targetNodes()) {
    store.updateNodeWithUndo(n.id, { strokes: n.strokes.map((s) => ({ ...s, align: value })) }, 'Change stroke align')
  }
}

function updateColor(index: number, color: Color): void {
  updateArrayItem('strokes', index, { color }, 'Change stroke')
}

function updateWeight(index: number, weight: number): void {
  updateArrayItem('strokes', index, { weight: Math.max(0, weight) }, 'Change stroke')
}

function add(): void {
  for (const n of targetNodes()) {
    store.updateNodeWithUndo(n.id, { strokes: [...n.strokes, { ...SECTION_DEFAULT_STROKE }] }, 'Add stroke')
  }
}

function remove(index: number): void {
  removeArrayItem('strokes', index, 'Remove stroke')
}

function toggleVisibility(index: number): void {
  toggleArrayVisibility('strokes', index)
}
</script>

<template>
  <section v-if="active" data-section="stroke" data-testid="stroke-inspector-section" class="border-b border-line px-3 py-2">
    <div class="mb-1 flex items-center justify-between">
      <label class="text-[11px] text-ink-3">Stroke</label>
      <button
        type="button"
        data-test="add-stroke"
        class="flex size-5 cursor-pointer items-center justify-center rounded text-sm leading-none text-ink-3 hover:bg-hover hover:text-ink"
        @click="add"
      >
        +
      </button>
    </div>

    <p v-if="mixed" class="text-[11px] text-ink-3">Mixed strokes</p>

    <template v-else>
      <div
        v-for="(stroke, i) in strokes"
        :key="i"
        data-test="stroke-row"
        class="group flex items-center gap-1.5 py-0.5 text-xs"
      >
        <ColorInput :color="stroke.color" editable @update="updateColor(i, $event)" />
        <input
          type="number"
          min="0"
          step="0.5"
          data-test="stroke-weight"
          class="w-12 rounded border border-border bg-input px-1 py-0.5 text-ink"
          :value="stroke.weight"
          @input="updateWeight(i, Number(($event.target as HTMLInputElement).value))"
        />
        <button
          type="button"
          class="cursor-pointer text-ink-3 hover:text-ink"
          :title="stroke.visible ? 'Hide' : 'Show'"
          @click="toggleVisibility(i)"
        >
          <icon-lucide-eye v-if="stroke.visible" class="size-3.5" />
          <icon-lucide-eye-off v-else class="size-3.5" />
        </button>
        <button
          type="button"
          data-test="stroke-remove"
          class="flex size-5 cursor-pointer items-center justify-center rounded text-sm leading-none text-ink-3 hover:bg-hover hover:text-ink"
          @click="remove(i)"
        >
          −
        </button>
      </div>

      <StrokeAlignRow v-if="strokes.length > 0" class="mt-1.5" :model-value="align" @update:model-value="setAlign" />
    </template>
  </section>
</template>
