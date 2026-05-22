<script setup lang="ts">
import { computed } from 'vue'

import KovaIcon from '@/components/ui/KovaIcon.vue'

/**
 * Canonical Kova button — consumes `.btn` classes from kova-hifi.css.
 *
 * Variants per design.md §3 + kova-hifi.css L332-365:
 *   - default → `.btn` (page bg, line border)
 *   - primary → `.btn.primary` (ink-on-#111, the high-contrast neutral)
 *   - accent  → `.btn.accent` (--accent on white)
 *   - ghost   → `.btn.ghost` (transparent → line-2 on hover)
 *   - danger  → `.btn.danger` (currently degraded to neutral per Ban 12; uses .btn shell)
 *   - text    → `.btn.text` (no border, transparent, --ink-2 → line-2 hover) — used in error pages
 *
 * Sizes: `md` (default 30px), `sm` (~26px).
 * Icon-only: `iconOnly` prop → `.btn.icon` (30x30) or `.btn.icon.sm` (26x26).
 */

export interface KovaButtonProps {
  variant?: 'default' | 'primary' | 'accent' | 'ghost' | 'danger' | 'text'
  size?: 'md' | 'sm'
  iconOnly?: boolean
  /** Optional Lucide icon name. Renders before label. */
  icon?: string
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
  loading?: boolean
  /** ARIA label for icon-only buttons (mandatory per design.md §5 Ban 11). */
  ariaLabel?: string
}

const props = withDefaults(defineProps<KovaButtonProps>(), {
  variant: 'default',
  size: 'md',
  iconOnly: false,
  type: 'button',
  disabled: false,
  loading: false,
})

defineEmits<{
  (e: 'click', event: MouseEvent): void
}>()

const klass = computed(() => {
  const c: string[] = ['btn']
  if (props.variant !== 'default') c.push(props.variant)
  if (props.size === 'sm') c.push('sm')
  if (props.iconOnly) c.push('icon')
  return c.join(' ')
})

const iconSize = computed(() => (props.size === 'sm' ? 'xs' : 'sm'))
</script>

<template>
  <button
    :type="type"
    :class="klass"
    :disabled="disabled || loading"
    :aria-label="ariaLabel"
    :aria-busy="loading ? 'true' : undefined"
    @click="$emit('click', $event)"
  >
    <KovaIcon
      v-if="loading"
      name="loader"
      :size="iconSize"
      class="ic"
      aria-hidden="true"
    />
    <KovaIcon
      v-else-if="icon"
      :name="icon"
      :size="iconSize"
      class="ic"
      aria-hidden="true"
    />
    <slot />
  </button>
</template>
