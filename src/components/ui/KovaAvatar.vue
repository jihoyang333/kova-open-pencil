<script setup lang="ts">
import { computed } from 'vue'

/**
 * Avatar — design.md §3.15.
 *
 * Default 26×26 pill. Sample customer data uses a brand color
 * (passed via `bg` prop). Our own avatars use `--fill-2` + ink.
 *
 * Sizes:
 *   - sm (24)  inline icon
 *   - md (26)  topbar (default per design.md)
 *   - lg (28)  popover header + side-footer
 *   - xl (36)  account page
 */

export interface KovaAvatarProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** Two-letter initials (e.g. "JY"). */
  initials?: string
  /** Optional image src. */
  src?: string
  alt?: string
  /** Brand background override (customer-data color). Falls back to --fill-2. */
  bg?: string
  /** Text/ink color (when initials shown). */
  ink?: string
}

const props = withDefaults(defineProps<KovaAvatarProps>(), {
  size: 'md',
})

const sizePx = computed<number>(() => {
  switch (props.size) {
    case 'sm':
      return 24
    case 'lg':
      return 28
    case 'xl':
      return 36
    case 'md':
    default:
      return 26
  }
})

const style = computed(() => ({
  width: `${sizePx.value}px`,
  height: `${sizePx.value}px`,
  background: props.bg ?? 'var(--fill-2)',
  color: props.ink ?? 'var(--ink)',
  fontSize: sizePx.value < 28 ? '10.5px' : '11.5px',
}))
</script>

<template>
  <div class="avatar" :style="style" role="img" :aria-label="alt ?? initials ?? 'avatar'">
    <img v-if="src" :src="src" :alt="alt ?? ''" :style="{ width: '100%', height: '100%', borderRadius: '50%' }" />
    <span v-else>{{ initials }}</span>
  </div>
</template>
