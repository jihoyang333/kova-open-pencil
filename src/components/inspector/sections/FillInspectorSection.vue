<script setup lang="ts">
// Fill inspector section (audit H1 — wires the orphaned fill editors into the live
// panel). Composes MultipleFillsList (the list) + PaintEditor (solid / 4 gradients /
// image, with the mode→Fill.type switch the components lacked) + ImageFillPicker
// (scale modes). All edits route through the engine via useMultiProps.
import { computed, ref, watch } from 'vue'
import type { Fill } from '@open-pencil/core'
import { useMultiProps } from '@/composables/use-multi-props'
import { DEFAULT_SHAPE_FILL } from '@/constants'
import { MULTIPLE_FILLS_CAP } from '@/constants/overlays'
import MultipleFillsList from '@/components/inspector/MultipleFillsList.vue'
import PaintEditor from '@/components/inspector/PaintEditor.vue'
import ImageFillPicker from '@/components/inspector/ImageFillPicker.vue'
import { convertFillType, modeOfFill, type FillMode } from '@/components/inspector/fill-type'

const { active, activeNode, isArrayMixed, targetNodes, updateArrayItem, removeArrayItem, toggleArrayVisibility, store } =
  useMultiProps()

const mixed = computed(() => isArrayMixed('fills'))
const fills = computed<Fill[]>(() => activeNode.value?.fills ?? [])
const selectedIndex = ref(0)

// Keep the selected index in range as fills are added/removed.
watch(fills, (list) => {
  if (selectedIndex.value > list.length - 1) selectedIndex.value = Math.max(0, list.length - 1)
})

const selectedFill = computed<Fill | null>(() => fills.value[selectedIndex.value] ?? null)
const selectedMode = computed<FillMode>(() => (selectedFill.value ? modeOfFill(selectedFill.value) : 'solid'))

function onUpdateFill(fill: Fill): void {
  updateArrayItem('fills', selectedIndex.value, fill, 'Change fill')
}

function onUpdateMode(mode: FillMode): void {
  if (!selectedFill.value) return
  updateArrayItem('fills', selectedIndex.value, convertFillType(selectedFill.value, mode), 'Change fill type')
}

function add(): void {
  for (const n of targetNodes()) {
    if (n.fills.length >= MULTIPLE_FILLS_CAP) continue // founder lock: no cap (Infinity) — match Figma
    store.updateNodeWithUndo(n.id, { fills: [...n.fills, { ...DEFAULT_SHAPE_FILL }] }, 'Add fill')
  }
  selectedIndex.value = fills.value.length // select the newly added fill
}

function remove(index: number): void {
  removeArrayItem('fills', index, 'Remove fill')
}

function toggleVisibility(index: number): void {
  toggleArrayVisibility('fills', index)
}

function reorder({ fromIndex, toIndex }: { fromIndex: number; toIndex: number }): void {
  for (const n of targetNodes()) {
    const arr = [...n.fills]
    const [moved] = arr.splice(fromIndex, 1)
    arr.splice(toIndex, 0, moved)
    store.updateNodeWithUndo(n.id, { fills: arr }, 'Reorder fills')
  }
  selectedIndex.value = toIndex
}
</script>

<template>
  <section v-if="active" data-section="fill" data-testid="fill-inspector-section" class="border-b border-line px-3 py-2">
    <label class="mb-1 block text-[11px] text-ink-3">Fill</label>

    <MultipleFillsList
      :fills="fills"
      :mixed="mixed"
      @add="add"
      @remove="remove"
      @toggle-visibility="toggleVisibility"
      @reorder="reorder"
    />

    <template v-if="!mixed && selectedFill">
      <PaintEditor
        class="mt-2"
        :model-value="selectedFill"
        :mode="selectedMode"
        @update:model-value="onUpdateFill"
        @update:mode="onUpdateMode"
      />
      <ImageFillPicker
        v-if="selectedMode === 'image'"
        class="mt-2"
        :model-value="selectedFill"
        @update:model-value="onUpdateFill"
      />
    </template>
  </section>
</template>
