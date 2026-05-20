<script setup lang="ts">
// Cluster 11 Plan Task 6.4 — KovaSkeleton.
// Shimmer loader. Reduced-motion users see static block via .no-shimmer.

import { computed } from 'vue'
import { useReducedMotion } from '@/composables/use-reduced-motion'

interface Props {
  width?: string | number
  height?: string | number
  radius?: 'pill' | 'card' | 'line' | 'circle'
}

const props = withDefaults(defineProps<Props>(), {
  width: '100%',
  height: 14,
  radius: 'line',
})

const { reduced } = useReducedMotion()

const widthStyle = computed(() =>
  typeof props.width === 'number' ? `${props.width}px` : props.width,
)
const heightStyle = computed(() =>
  typeof props.height === 'number' ? `${props.height}px` : props.height,
)

const radiusClass = computed(() => {
  switch (props.radius) {
    case 'pill':
      return 'rounded-full'
    case 'card':
      return 'rounded-md'
    case 'circle':
      return 'rounded-full'
    case 'line':
    default:
      return 'rounded-sm'
  }
})
</script>

<template>
  <div
    class="skeleton bg-input"
    :class="[
      `r-${radius}`,
      radiusClass,
      reduced ? 'no-shimmer' : 'animate-pulse',
    ]"
    :style="{ width: widthStyle, height: heightStyle }"
    role="status"
    aria-label="Loading"
  />
</template>
