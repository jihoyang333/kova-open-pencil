<script setup lang="ts">
// Effects inspector section (audit H1 — wires EffectRow + EffectEditor into the live
// panel). The list (EffectRow) selects/toggles/deletes; the expanded EffectEditor edits
// the selected effect. Add seeds a drop shadow. All edits route through the engine.
import { computed, ref, watch } from 'vue'
import type { Effect } from '@open-pencil/core'
import { useMultiProps } from '@/composables/use-multi-props'
import EffectRow from '@/components/inspector/EffectRow.vue'
import EffectEditor from '@/components/inspector/EffectEditor.vue'

const { active, activeNode, isArrayMixed, targetNodes, updateArrayItem, removeArrayItem, toggleArrayVisibility, store } =
  useMultiProps()

const mixed = computed(() => isArrayMixed('effects'))
const effects = computed<Effect[]>(() => activeNode.value?.effects ?? [])
const selectedIndex = ref(0)

watch(effects, (list) => {
  if (selectedIndex.value > list.length - 1) selectedIndex.value = Math.max(0, list.length - 1)
})

const selectedEffect = computed<Effect | null>(() => effects.value[selectedIndex.value] ?? null)

function defaultEffect(): Effect {
  return {
    type: 'DROP_SHADOW',
    color: { r: 0, g: 0, b: 0, a: 0.25 },
    offset: { x: 0, y: 4 },
    radius: 4,
    spread: 0,
    visible: true
  }
}

function add(): void {
  for (const n of targetNodes()) {
    store.updateNodeWithUndo(n.id, { effects: [...n.effects, defaultEffect()] }, 'Add effect')
  }
  selectedIndex.value = effects.value.length
}

function update(effect: Effect): void {
  updateArrayItem('effects', selectedIndex.value, effect, 'Change effect')
}

function remove(index: number): void {
  removeArrayItem('effects', index, 'Remove effect')
}

function toggleVisibility(index: number): void {
  toggleArrayVisibility('effects', index)
}
</script>

<template>
  <section v-if="active" data-section="effects" data-testid="effects-inspector-section" class="border-b border-line px-3 py-2">
    <div class="mb-1 flex items-center justify-between">
      <label class="text-[11px] text-ink-3">Effects</label>
      <button
        type="button"
        data-test="add-effect"
        class="flex size-5 cursor-pointer items-center justify-center rounded text-sm leading-none text-ink-3 hover:bg-hover hover:text-ink"
        @click="add"
      >
        +
      </button>
    </div>

    <p v-if="mixed" class="text-[11px] text-ink-3">Mixed effects</p>

    <template v-else>
      <EffectRow
        v-for="(effect, i) in effects"
        :key="i"
        :effect="effect"
        :index="i"
        :is-selected="i === selectedIndex"
        @select="selectedIndex = i"
        @toggle-visibility="toggleVisibility(i)"
        @delete="remove(i)"
      />

      <EffectEditor
        v-if="selectedEffect"
        class="mt-2"
        :model-value="selectedEffect"
        :index="selectedIndex"
        @update:model-value="update"
        @delete="remove(selectedIndex)"
      />
    </template>
  </section>
</template>
