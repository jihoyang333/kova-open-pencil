<!-- token-exempt-file: A15 hi-fi shell primitive. Px values match .auth-cta / .auth-second selector (cluster-01-tokens-used.md §3-§5). -->
<script setup lang="ts">
// Plan 01 Task 14 derivative. A15 hi-fi .auth-cta (primary, full-width, ink
// background) and .auth-second (secondary, ghost). Both use the canonical
// .btn primitive's height behavior with auth-specific padding.

interface Props {
  label: string
  type?: 'submit' | 'button'
  variant?: 'primary' | 'secondary'
  loading?: boolean
  disabled?: boolean
}

const {
  label,
  type = 'submit',
  variant = 'primary',
  loading = false,
  disabled = false
} = defineProps<Props>()

const emit = defineEmits<{ click: [] }>()

function onClick(): void {
  if (!loading && !disabled) emit('click')
}
</script>

<template>
  <button
    :type="type"
    :disabled="loading || disabled"
    :class="[
      'flex w-full items-center justify-center gap-2 rounded-md font-medium transition-colors',
      variant === 'primary'
        ? 'border border-ink bg-ink px-[14px] py-[10px] text-[13.5px] text-ink-on-primary hover:border-[#000000] hover:bg-[#000000]'
        : 'border border-line bg-page px-[14px] py-[9px] text-[13px] text-ink-2 hover:text-ink',
      (loading || disabled) && 'cursor-not-allowed opacity-50'
    ]"
    @click="onClick"
  >
    <slot name="leading" />
    <span>{{ loading ? 'Loading...' : label }}</span>
    <slot name="trailing" />
  </button>
</template>
