<script setup lang="ts">
import { usePreferencePath } from '@/composables/use-preferences'
import KovaSegmented from '@/components/ui/KovaSegmented.vue'
import KovaToggle from '@/components/ui/KovaToggle.vue'
import type { TextSize } from '@/types/preferences'

const textSize = usePreferencePath<TextSize>(['accessibility', 'textSize'])
const reduceMotion = usePreferencePath<boolean>(['accessibility', 'reduceMotion'])
const highContrast = usePreferencePath<boolean>(['accessibility', 'highContrast'])

const textSizeOptions = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
] as const
</script>

<template>
  <div class="row-stack">
    <div class="row">
      <div class="lbl">
        Text size
        <span class="sub"
          >Affects body, list, and dialog text. Tools and canvas chrome stay
          fixed.</span
        >
      </div>
      <div class="val">
        <KovaSegmented
          v-model="textSize"
          :options="[...textSizeOptions]"
          aria-label="Text size"
        />
      </div>
    </div>

    <div class="row">
      <div class="lbl">
        Reduce motion
        <span class="sub"
          >Disables panel slide-ins, hover transitions, and AI streaming
          animations.</span
        >
      </div>
      <div class="val">
        <KovaToggle v-model="reduceMotion" aria-label="Reduce motion" />
      </div>
    </div>

    <div class="row">
      <div class="lbl">
        High contrast
        <span class="sub">Strengthens borders and dividers.</span>
      </div>
      <div class="val">
        <KovaToggle v-model="highContrast" aria-label="High contrast" />
      </div>
    </div>
  </div>
</template>
