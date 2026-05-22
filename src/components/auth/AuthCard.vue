<!-- token-exempt-file: A15 hi-fi shell primitive. Px values match .auth-card selector (cluster-01-tokens-used.md §3-§5). -->
<script setup lang="ts">
// Plan 01 Task 14 derivative. A15 hi-fi .auth-card.

interface Props {
  wide?: boolean
}

const { wide = false } = defineProps<Props>()
</script>

<template>
  <section
    :class="[
      'mx-auto flex flex-col gap-[18px] rounded-[10px] border border-line bg-page px-7 pt-7 pb-6',
      wide ? 'w-[420px]' : 'w-[380px]',
      'max-w-full shadow-[0_1px_0_rgba(0,0,0,0.02),0_14px_40px_-24px_rgba(0,0,0,0.10)]'
    ]"
  >
    <slot />
    <footer v-if="$slots.footer">
      <slot name="footer" />
    </footer>
  </section>
</template>
