<script setup lang="ts">
// Paint editor (PRD 07b §12.5–12.14). Six mode tabs — Solid + all 4 gradient types
// (founder decision 2026-05-17, match Figma) + Image. Composes GradientStopList for the
// gradient modes. Anchor context `page-bg` is single-mode (no tabs) per hi-fi 12.12.
//
// Adapted per R2: core has ONE `Fill` interface (no Paint/GradientPaint/ImagePaint).
// Gradient direction lives in `Fill.gradientTransform` (a {m00..m12} matrix), NOT a
// `rotation` field — the angle input derives/rotates that transform.
import { computed } from 'vue'
import { parseColor } from '@open-pencil/core'
import type { Fill, GradientStop, GradientTransform } from '@open-pencil/core'
import KovaIcon from '@/components/ui/KovaIcon.vue'
import GradientStopList from './GradientStopList.vue'
import { useEyedropper } from '@/composables/use-eyedropper'
import { GRADIENT_MODES, type GradientMode } from '@/constants/overlays'

type Mode = 'solid' | GradientMode | 'image'
type AnchorContext = 'fill' | 'stroke' | 'effect' | 'page-bg'

const { modelValue, mode, anchorContext } = defineProps<{
  modelValue: Fill
  mode: Mode
  anchorContext?: AnchorContext
}>()
const emit = defineEmits<{
  'update:modelValue': [value: Fill]
  'update:mode': [value: Mode]
  'update:selectedStopIndex': [index: number]
}>()

const TABS: ReadonlyArray<{ value: Mode; label: string; icon: string }> = [
  { value: 'solid', label: 'Solid', icon: 'square' },
  { value: 'linear', label: 'Linear', icon: 'move-right' },
  { value: 'radial', label: 'Radial', icon: 'circle' },
  { value: 'angular', label: 'Angular', icon: 'pie-chart' },
  { value: 'diamond', label: 'Diamond', icon: 'diamond' },
  { value: 'image', label: 'Image', icon: 'image' }
]

const DEFAULT_STOPS: GradientStop[] = [
  { position: 0, color: { r: 0, g: 0, b: 0, a: 1 } },
  { position: 1, color: { r: 1, g: 1, b: 1, a: 1 } }
]

const showTabs = computed(() => anchorContext !== 'page-bg')
const isGradient = computed(() => GRADIENT_MODES.includes(mode as GradientMode))
// Figma: Linear + Angular expose a numeric angle; Radial + Diamond use on-canvas handles.
const showAngleInput = computed(() => mode === 'linear' || mode === 'angular')

const stops = computed<GradientStop[]>(() => modelValue.gradientStops ?? DEFAULT_STOPS)

const RAD = Math.PI / 180

function angleOf(t: GradientTransform | undefined): number {
  if (!t) return 90
  return Math.round((Math.atan2(t.m10, t.m00) * 180) / Math.PI)
}

// Rotate the existing gradient frame around its centre (0.5, 0.5) by `delta` degrees.
function rotateAroundCentre(t: GradientTransform, delta: number): GradientTransform {
  const c = Math.cos(delta * RAD)
  const s = Math.sin(delta * RAD)
  const cx = 0.5
  const cy = 0.5
  const e = cx - c * cx + s * cy
  const f = cy - s * cx - c * cy
  return {
    m00: c * t.m00 - s * t.m10,
    m01: c * t.m01 - s * t.m11,
    m02: c * t.m02 - s * t.m12 + e,
    m10: s * t.m00 + c * t.m10,
    m11: s * t.m01 + c * t.m11,
    m12: s * t.m02 + c * t.m12 + f
  }
}

const angle = computed(() => angleOf(modelValue.gradientTransform))

function setAngle(deg: number): void {
  const base = modelValue.gradientTransform ?? { m00: 1, m01: 0, m02: 0, m10: 0, m11: 0, m12: 0.5 }
  emit('update:modelValue', {
    ...modelValue,
    gradientTransform: rotateAroundCentre(base, deg - angleOf(base))
  })
}

function updateStops(next: GradientStop[]): void {
  emit('update:modelValue', { ...modelValue, gradientStops: next })
}

function addStop(): void {
  const next = [...stops.value]
  const insertAt = Math.max(1, next.length - 1)
  const before = next[insertAt - 1]
  const after = next[insertAt]
  next.splice(insertAt, 0, {
    position: (before.position + after.position) / 2,
    color: { ...before.color }
  })
  updateStops(next)
}

function removeStop(index: number): void {
  if (index === 0 || index === stops.value.length - 1) return
  updateStops(stops.value.filter((_, i) => i !== index))
}

const { activate: activateEyedropper } = useEyedropper()

function pickColor(): void {
  activateEyedropper((hex) => {
    const color = parseColor(hex.startsWith('#') ? hex : `#${hex}`)
    emit('update:modelValue', { ...modelValue, color })
  })
}
</script>

<template>
  <div class="flex w-64 flex-col gap-2 rounded border border-border bg-panel p-2">
    <!-- Mode tabs (hidden in page-bg context per hi-fi 12.12) -->
    <div v-if="showTabs" class="flex items-center gap-0.5">
      <button
        v-for="tab in TABS"
        :key="tab.value"
        type="button"
        data-test="mode-tab"
        :data-mode="tab.value"
        :title="tab.label"
        :aria-pressed="mode === tab.value"
        class="flex flex-1 cursor-pointer items-center justify-center rounded p-1.5"
        :class="mode === tab.value ? 'bg-accent-soft text-accent' : 'text-ink-3 hover:text-ink'"
        @click="emit('update:mode', tab.value)"
      >
        <KovaIcon :name="tab.icon" size="sm" />
      </button>
    </div>

    <!-- Gradient stops (all 4 gradient modes share the stops UI) -->
    <div v-if="isGradient" data-test="gradient-stops" :data-gradient-type="mode">
      <GradientStopList
        :stops="stops"
        :selected-index="0"
        @update:selected-index="emit('update:selectedStopIndex', $event)"
        @add="addStop"
        @remove="removeStop"
      />
    </div>

    <!-- Angle input — Linear + Angular only (Radial + Diamond use on-canvas handles) -->
    <label v-if="showAngleInput" class="flex items-center gap-2 text-xs text-ink-3">
      Angle
      <input
        data-test="gradient-angle"
        type="number"
        min="-360"
        max="360"
        step="1"
        class="w-16 rounded border border-border bg-input px-2 py-1 text-xs text-ink"
        :value="angle"
        @input="setAngle(Number(($event.target as HTMLInputElement).value))"
      />
    </label>

    <!-- Eyedropper trigger (hi-fi 12.5) -->
    <button
      type="button"
      title="Pick color from canvas"
      class="cursor-pointer self-end text-ink-3 hover:text-ink"
      @click="pickColor"
    >
      <KovaIcon name="pipette" size="sm" />
    </button>
  </div>
</template>
