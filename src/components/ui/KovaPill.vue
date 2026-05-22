<script setup lang="ts">
import { computed } from 'vue'

import KovaIcon from '@/components/ui/KovaIcon.vue'

/**
 * Canonical Kova pill — consumes `.pill` from kova-hifi.css L367-393.
 *
 * Variants:
 *   - neutral (default)  → `.pill`
 *   - accent             → `.pill.accent` (--accent-soft bg + --accent-ink + --accent-2 border)
 *   - outline            → `.pill.outline` (--page bg + --line border)
 *   - dot                → `.pill.dot` (leading 6 px --accent circle)
 *
 * Status sub-variants (.ok / .warn / .review) intentionally degrade to
 * neutral per kova-hifi.css L383-385 + Ban 12.
 */

export interface KovaPillProps {
  variant?: 'neutral' | 'accent' | 'outline' | 'dot'
  /** Optional Lucide icon name (rendered as .ic span). */
  icon?: string
}

const props = withDefaults(defineProps<KovaPillProps>(), {
  variant: 'neutral',
})

const klass = computed(() => {
  const c = ['pill']
  if (props.variant !== 'neutral') c.push(props.variant)
  return c.join(' ')
})
</script>

<template>
  <span :class="klass">
    <KovaIcon v-if="icon" :name="icon" size="xs" class="ic" aria-hidden="true" />
    <slot />
  </span>
</template>
