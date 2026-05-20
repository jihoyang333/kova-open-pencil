<script setup lang="ts">
import { computed } from 'vue'

import KovaIcon from '@/components/ui/KovaIcon.vue'

/**
 * Empty state — consumes `.empty-pane / .inline / .full-page` from
 * kova-hifi.css (B9 + A11 lift).
 *
 * Variants:
 *   - inline-32 (in-list zero-results)
 *   - panel-40  (panel-bounded empty)  → default
 *   - full-48   (full-viewport empty)
 *
 * For query-echo headlines, wrap the quoted phrase in `<span class="q">`
 * inside the `headline` slot.
 */

export interface EmptyStateProps {
  variant?: 'inline-32' | 'panel-40' | 'full-48'
  /** Lucide icon name. */
  icon?: string
  headline?: string
  body?: string
}

const props = withDefaults(defineProps<EmptyStateProps>(), {
  variant: 'panel-40',
})

const klass = computed(() => {
  const c = ['empty-pane']
  if (props.variant === 'inline-32') c.push('inline')
  else if (props.variant === 'full-48') c.push('full-page')
  return c.join(' ')
})

const iconSize = computed(() => {
  if (props.variant === 'inline-32') return 'md'
  if (props.variant === 'full-48') return 'lg'
  return 'md'
})
</script>

<template>
  <div :class="klass">
    <div v-if="icon" class="ic-wrap">
      <KovaIcon :name="icon" :size="iconSize" class="ic" aria-hidden="true" />
    </div>
    <h5>
      <slot name="headline">{{ headline }}</slot>
    </h5>
    <p v-if="body || $slots.body">
      <slot name="body">{{ body }}</slot>
    </p>
    <div v-if="$slots.cta" class="cta-row">
      <slot name="cta" />
    </div>
  </div>
</template>
