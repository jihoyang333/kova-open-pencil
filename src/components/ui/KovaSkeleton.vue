<script setup lang="ts">
import { computed } from 'vue'

/**
 * Skeleton placeholder — consumes `.skeleton` from kova-hifi.css.
 *
 * Spec: design.md §3 + kova-hifi.css `.skeleton` block.
 *   - Default radius `--r-md` (5 px).
 *   - Variants: r-pill / r-card / r-line / r-circle.
 *   - Shimmer: --motion-skeleton (1.4 s ease-in-out) — only gradient in
 *     the system; Ban 5 exception.
 *   - `prefers-reduced-motion: reduce` → static `--fill-2`, no shimmer
 *     (handled by canonical CSS media query — no JS required).
 */

export interface KovaSkeletonProps {
  variant?: 'default' | 'pill' | 'card' | 'line' | 'circle'
  /** CSS size — e.g. `'12px'`, `'100%'`. */
  width?: string
  height?: string
}

const props = withDefaults(defineProps<KovaSkeletonProps>(), {
  variant: 'default',
})

const klass = computed(() => {
  const c = ['skeleton']
  if (props.variant === 'pill') c.push('r-pill')
  else if (props.variant === 'card') c.push('r-card')
  else if (props.variant === 'line') c.push('r-line')
  else if (props.variant === 'circle') c.push('r-circle')
  return c.join(' ')
})

const style = computed(() => ({
  width: props.width ?? undefined,
  height: props.height ?? undefined,
}))
</script>

<template>
  <div
    :class="klass"
    :style="style"
    role="status"
    aria-live="polite"
    aria-busy="true"
    aria-label="Loading"
  />
</template>
