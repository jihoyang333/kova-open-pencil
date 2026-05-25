<script setup lang="ts">
import { ref } from 'vue'

import { COMPOSER_PRESETS, type ComposerPreset } from '@/constants/composer-presets'

import ComposerChips from './ComposerChips.vue'
import ComposerInputWrap from './ComposerInputWrap.vue'

// PRD 02 §6.4.3 + Plan T26 — composer parent. Wires input + chips. Chip click
// seeds the draft with preset.seedText; submit emits draft to parent which
// drives the actual canvas-creation handoff + state machine (T32 transition).

const draft = ref('')
const state = ref<'idle' | 'submitting' | 'review'>('idle')

const emit = defineEmits<{ submit: [prompt: string] }>()

function onChipSelect(preset: ComposerPreset): void {
  draft.value = preset.seedText
}

function onSubmit(): void {
  if (!draft.value.trim() || state.value !== 'idle') return
  emit('submit', draft.value)
}

defineExpose({ draft, state })
</script>

<template>
  <div data-test-id="composer" class="composer">
    <ComposerInputWrap v-model="draft" :state="state" @submit="onSubmit" />
    <ComposerChips :presets="COMPOSER_PRESETS" @select="onChipSelect" />
  </div>
</template>
