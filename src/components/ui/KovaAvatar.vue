<script setup lang="ts">
import { computed } from 'vue'

/**
 * Avatar — design.md §3.15 + canonical `.avatar` block in kova-hifi.css.
 *
 * Default 26×26 pill, --fill bg + --ink text (per design.md §3.15
 * "Our own avatars use --color-surface-input + ink").
 *
 * Sample customer data uses a brand color (e.g. `#c24a1e`) via the
 * `bg` prop — "Customer brand colors are data, not part of our system."
 *
 * Sizes:
 *   - sm 24
 *   - md 26 (default per design.md)
 *   - lg 28 (popover header, side-footer)
 *   - xl 36 (account page)
 */

export interface KovaAvatarProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** Two-letter initials (e.g. "JY"). */
  initials?: string
  /** Optional image src. */
  src?: string
  alt?: string
  /** Brand background override (customer data only — opt-in). */
  bg?: string
  /** Text/ink color override. */
  ink?: string
}

const props = withDefaults(defineProps<KovaAvatarProps>(), {
  size: 'md',
})

const klass = computed(() => `avatar ${props.size}`)

const style = computed(() => {
  const s: Record<string, string> = {}
  if (props.bg) s.background = props.bg
  if (props.ink) s.color = props.ink
  return Object.keys(s).length > 0 ? s : undefined
})
</script>

<template>
  <div :class="klass" :style="style" role="img" :aria-label="alt ?? initials ?? 'avatar'">
    <img v-if="src" :src="src" :alt="alt ?? ''" />
    <span v-else>{{ initials }}</span>
  </div>
</template>
