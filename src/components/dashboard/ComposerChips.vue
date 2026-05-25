<script setup lang="ts">
import KovaIcon from '@/components/ui/KovaIcon.vue'

import type { ComposerPreset } from '@/constants/composer-presets'

// PRD 02 §6.4.3 + Plan T25 — composer chip row (5 preset chips below the
// composer input).

defineProps<{ presets: readonly ComposerPreset[] }>()
defineEmits<{ select: [preset: ComposerPreset] }>()
</script>

<template>
  <div data-test-id="composer-chips" class="composer-chips">
    <button
      v-for="p in presets"
      :key="p.id"
      :data-test-id="`composer-chip-${p.id}`"
      type="button"
      class="composer-chip"
      @click="$emit('select', p)"
    >
      <KovaIcon :name="p.icon" size="sm" class="ic" />
      {{ p.label }}
    </button>
  </div>
</template>
