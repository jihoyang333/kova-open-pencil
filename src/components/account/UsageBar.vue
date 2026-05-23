<script setup lang="ts">
// PRD 04 §6.4.2 — Usage bar (AI generations, storage).
import { computed } from 'vue'

interface Props {
  label: string
  used: number
  cap: number
  resetDateIso?: string | null
  unit?: 'count' | 'bytes'
}
const { unit = 'count', label, used, cap, resetDateIso } = defineProps<Props>()

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`
  if (n < 1024 * 1024 * 1024) return `${Math.round(n / 1024 / 1024)} MB`
  return `${(n / 1024 / 1024 / 1024).toFixed(1)} GB`
}

const display = computed(() => {
  if (unit === 'bytes') return `${formatBytes(used)} / ${formatBytes(cap)}`
  return `${used} / ${cap}`
})

const pct = computed(() => {
  if (cap === 0) return 0
  return Math.min(100, Math.round((used / cap) * 100))
})

const resetDisplay = computed(() => {
  if (resetDateIso === null || resetDateIso === undefined || resetDateIso === '') return null
  return new Date(resetDateIso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
})
</script>

<template>
  <div class="usage" role="group" :aria-label="`${label} usage`">
    <div class="usage-head">
      <span class="usage-lbl">{{ label }}</span>
      <span class="usage-val">{{ display }}</span>
    </div>
    <div class="usage-bar" role="progressbar" :aria-valuenow="pct" aria-valuemin="0" aria-valuemax="100">
      <div class="usage-bar-fill" :style="{ width: `${pct}%` }" />
    </div>
    <p v-if="resetDisplay !== null" class="usage-meta">Resets {{ resetDisplay }}</p>
  </div>
</template>
