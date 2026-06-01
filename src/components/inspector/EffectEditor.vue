<script setup lang="ts">
// Per-effect editor popover (PRD 07b §11.16). Shadow effects expose X / Y / Blur /
// Spread + color + Visible; blur effects expose Radius + Visible.
import { computed } from 'vue'
import { colorToCSS } from '@open-pencil/core'
import type { Effect } from '@open-pencil/core'

const { modelValue } = defineProps<{ modelValue: Effect; index: number }>()
const emit = defineEmits<{ 'update:modelValue': [value: Effect]; delete: [] }>()

const TYPE_LABELS: Record<Effect['type'], string> = {
  DROP_SHADOW: 'Drop shadow',
  INNER_SHADOW: 'Inner shadow',
  LAYER_BLUR: 'Layer blur',
  BACKGROUND_BLUR: 'Background blur',
  FOREGROUND_BLUR: 'Foreground blur'
}

const isShadow = computed(
  () => modelValue.type === 'DROP_SHADOW' || modelValue.type === 'INNER_SHADOW'
)

function patch(next: Partial<Effect>): void {
  emit('update:modelValue', { ...modelValue, ...next })
}

function setOffsetX(value: number): void {
  patch({ offset: { ...modelValue.offset, x: value } })
}
function setOffsetY(value: number): void {
  patch({ offset: { ...modelValue.offset, y: value } })
}

const num = (event: Event): number => Number((event.target as HTMLInputElement).value)
</script>

<template>
  <div class="flex w-64 flex-col gap-2 rounded border border-border bg-panel p-2">
    <div class="flex items-center justify-between text-xs">
      <span class="font-medium text-ink">{{ TYPE_LABELS[modelValue.type] }}</span>
      <button
        type="button"
        data-test="delete-effect"
        class="cursor-pointer text-ink-3 hover:text-ink"
        title="Remove effect"
        @click="emit('delete')"
      >
        ×
      </button>
    </div>

    <div v-if="isShadow" class="grid grid-cols-2 gap-2">
      <label class="flex items-center gap-1 text-xs text-ink-3">
        X
        <input
          type="number"
          :value="modelValue.offset.x"
          class="w-full rounded border border-border bg-input px-1 py-0.5 text-ink"
          @input="setOffsetX(num($event))"
        />
      </label>
      <label class="flex items-center gap-1 text-xs text-ink-3">
        Y
        <input
          type="number"
          :value="modelValue.offset.y"
          class="w-full rounded border border-border bg-input px-1 py-0.5 text-ink"
          @input="setOffsetY(num($event))"
        />
      </label>
      <label class="flex items-center gap-1 text-xs text-ink-3">
        Blur
        <input
          type="number"
          :value="modelValue.radius"
          class="w-full rounded border border-border bg-input px-1 py-0.5 text-ink"
          @input="patch({ radius: num($event) })"
        />
      </label>
      <label class="flex items-center gap-1 text-xs text-ink-3">
        Spread
        <input
          type="number"
          :value="modelValue.spread"
          class="w-full rounded border border-border bg-input px-1 py-0.5 text-ink"
          @input="patch({ spread: num($event) })"
        />
      </label>
    </div>

    <div v-else class="grid grid-cols-1 gap-2">
      <label class="flex items-center gap-1 text-xs text-ink-3">
        Radius
        <input
          type="number"
          :value="modelValue.radius"
          class="w-full rounded border border-border bg-input px-1 py-0.5 text-ink"
          @input="patch({ radius: num($event) })"
        />
      </label>
    </div>

    <!-- Color swatch (shadows only) -->
    <div v-if="isShadow" class="flex items-center gap-2">
      <span
        class="size-4 rounded border border-border"
        :style="{ background: colorToCSS(modelValue.color) }"
      />
      <span class="font-mono text-xs text-ink-3">{{ Math.round(modelValue.color.a * 100) }}%</span>
    </div>

    <label class="flex items-center gap-1 text-xs text-ink-3">
      <input
        type="checkbox"
        :checked="modelValue.visible"
        @change="patch({ visible: ($event.target as HTMLInputElement).checked })"
      />
      Visible
    </label>
  </div>
</template>
