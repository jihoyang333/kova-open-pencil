<script setup lang="ts">
import { computed, useAttrs } from 'vue'

import {
  KOVA_ICON_REGISTRY,
  KOVA_ICON_SIZE_PX,
  type KovaIconSize,
} from './kova-icon-registry'

interface Props {
  name: string
  size?: KovaIconSize
  class?: string
}

const { name, size = 'md', class: cssClass } = defineProps<Props>()

const attrs = useAttrs()

const px = computed(() => KOVA_ICON_SIZE_PX[size])

const component = computed(() => {
  const c = KOVA_ICON_REGISTRY.get(name)
  if (!c && import.meta.env.DEV) {
    console.warn(
      `[KovaIcon] unknown lucide name: "${name}". Add to src/components/ui/kova-icon-registry.ts.`
    )
  }
  return c
})

const hasAriaLabel = computed(() => 'aria-label' in attrs)
</script>

<template>
  <component
    v-if="component"
    :is="component"
    :width="px"
    :height="px"
    :class="cssClass"
    :aria-hidden="hasAriaLabel ? undefined : 'true'"
    :role="hasAriaLabel ? 'img' : undefined"
  />
</template>
