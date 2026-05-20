<script setup lang="ts">
// Cluster 11 Plan Task 6.1 — KovaButton.
// 6 variants, 2 sizes, loading + disabled + icon slots. Preserves kova-hifi.css
// .btn / .btn.primary / .btn.danger / .btn.ghost class names.

import KovaIcon from './KovaIcon.vue'

interface Props {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'text' | 'icon'
  size?: 'sm' | 'md'
  loading?: boolean
  disabled?: boolean
  icon?: string
  iconPosition?: 'leading' | 'trailing'
  type?: 'button' | 'submit' | 'reset'
}

withDefaults(defineProps<Props>(), {
  variant: 'secondary',
  size: 'md',
  iconPosition: 'leading',
  type: 'button',
})
</script>

<template>
  <button
    :type="type"
    class="btn inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
    :class="[
      variant,
      size,
      size === 'sm' && 'h-7 px-2 text-xs',
      size === 'md' && 'h-8 px-3 text-sm',
      variant === 'primary' && 'bg-accent text-white hover:bg-accent/90',
      variant === 'secondary' && 'border border-line bg-panel text-ink hover:bg-line-2',
      variant === 'ghost' && 'text-ink-2 hover:bg-line-2 hover:text-ink',
      variant === 'danger' && 'bg-red-500 text-white hover:bg-red-400',
      variant === 'text' && 'px-1 text-accent hover:underline',
      variant === 'icon' && 'aspect-square px-0',
      loading && 'loading',
    ]"
    :disabled="disabled || loading"
  >
    <KovaIcon
      v-if="loading"
      data-test="spinner"
      name="loader"
      class="spinner animate-spin"
    />
    <KovaIcon
      v-else-if="icon && iconPosition === 'leading'"
      :name="icon"
    />
    <slot />
    <KovaIcon
      v-if="icon && iconPosition === 'trailing' && !loading"
      :name="icon"
    />
  </button>
</template>
