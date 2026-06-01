<script setup lang="ts">
// Image-fill picker (PRD 07b §11.12 / 12.10 / 12.11, Q21). Four scale modes —
// Fill / Fit / Crop / Tile. Crop shows corner handles; Tile shows a size slider.
//
// Adapted per R2: core `Fill` (type:'IMAGE') carries `imageScaleMode` + `imageTransform`
// (a {m00..m12} matrix) — there is no `scaleMode` / `src` / `tileSize`. The preview URL
// is passed in (`imageUrl`) since the Fill references the bitmap by `imageHash`. Tile
// size maps to a uniform `imageTransform` scale.
import { computed } from 'vue'
import type { Fill, ImageScaleMode, GradientTransform } from '@open-pencil/core'

const { modelValue, imageUrl } = defineProps<{ modelValue: Fill; imageUrl?: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: Fill] }>()

const IDENTITY: GradientTransform = { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 }

const MODES: ReadonlyArray<{ value: ImageScaleMode; label: string }> = [
  { value: 'FILL', label: 'Fill' },
  { value: 'FIT', label: 'Fit' },
  { value: 'CROP', label: 'Crop' },
  { value: 'TILE', label: 'Tile' }
]

const isCrop = computed(() => modelValue.imageScaleMode === 'CROP')
const isTile = computed(() => modelValue.imageScaleMode === 'TILE')

function setMode(mode: ImageScaleMode): void {
  emit('update:modelValue', { ...modelValue, imageScaleMode: mode })
}

const tileSize = computed<number>({
  get: () => Math.round((modelValue.imageTransform?.m00 ?? 1) * 100),
  set: (pct) => {
    const scale = pct / 100
    const base = modelValue.imageTransform ?? IDENTITY
    emit('update:modelValue', {
      ...modelValue,
      imageTransform: { ...base, m00: scale, m11: scale }
    })
  }
})
</script>

<template>
  <div class="flex w-64 flex-col gap-2 rounded border border-border bg-panel p-2">
    <!-- Scale-mode tabs -->
    <div class="flex items-center gap-0.5">
      <button
        v-for="m in MODES"
        :key="m.value"
        type="button"
        data-test="scale-mode"
        :aria-pressed="modelValue.imageScaleMode === m.value"
        class="flex-1 cursor-pointer rounded px-2 py-1 text-xs"
        :class="
          modelValue.imageScaleMode === m.value
            ? 'bg-accent-soft text-accent'
            : 'text-ink-3 hover:bg-fill-2 hover:text-ink'
        "
        @click="setMode(m.value)"
      >
        {{ m.label }}
      </button>
    </div>

    <!-- Crop preview with corner handles -->
    <div v-if="isCrop" class="relative aspect-video overflow-hidden rounded bg-fill-2">
      <img v-if="imageUrl" :src="imageUrl" alt="" class="size-full object-cover" />
      <span data-test="crop-handle" class="absolute top-0 left-0 size-2 rounded-sm bg-white" />
      <span data-test="crop-handle" class="absolute top-0 right-0 size-2 rounded-sm bg-white" />
      <span data-test="crop-handle" class="absolute bottom-0 left-0 size-2 rounded-sm bg-white" />
      <span data-test="crop-handle" class="absolute right-0 bottom-0 size-2 rounded-sm bg-white" />
    </div>

    <!-- Tile size slider -->
    <div v-if="isTile" class="flex items-center gap-2">
      <label class="text-xs text-ink-3">Tile size</label>
      <input
        v-model.number="tileSize"
        data-test="tile-size-slider"
        type="range"
        min="10"
        max="200"
        class="flex-1"
      />
      <span class="font-mono text-xs text-ink-2">{{ tileSize }}%</span>
    </div>
  </div>
</template>
