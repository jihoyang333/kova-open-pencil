<script setup lang="ts">
// JPG export-quality dropdown (PRD 07b §11.18 / Q22). Three fixed levels from the
// JPG_QUALITY constant. Built on AppSelect to match ExportSection's dropdowns.
import AppSelect from '@/components/AppSelect.vue'
import { JPG_QUALITY } from '@/constants/overlays'

type QualityKey = 'high' | 'medium' | 'low'

const modelValue = defineModel<QualityKey>({ required: true })

const OPTIONS: ReadonlyArray<{ value: QualityKey; label: string }> = [
  { value: 'high', label: `High (${JPG_QUALITY.HIGH.toFixed(2)})` },
  { value: 'medium', label: `Medium (${JPG_QUALITY.MEDIUM.toFixed(2)})` },
  { value: 'low', label: `Low (${JPG_QUALITY.LOW.toFixed(2)})` }
]
</script>

<template>
  <AppSelect v-model="modelValue" :options="[...OPTIONS]" />
</template>
