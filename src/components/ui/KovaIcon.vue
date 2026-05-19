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

const props = withDefaults(defineProps<Props>(), { size: 'md' })

const attrs = useAttrs()

const px = computed(() => KOVA_ICON_SIZE_PX[props.size])

const component = computed(() => {
  const c = KOVA_ICON_REGISTRY.get(props.name)
  if (!c && import.meta.env.DEV) {
    console.warn(
      `[KovaIcon] unknown lucide name: "${props.name}". Add to src/components/ui/kova-icon-registry.ts.`
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
    :class="props.class"
    :aria-hidden="hasAriaLabel ? undefined : 'true'"
    :role="hasAriaLabel ? 'img' : undefined"
  />
</template>
