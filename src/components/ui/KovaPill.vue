<script setup lang="ts">
// Cluster 11 Plan Task 6.3 — KovaPill.
// kova-hifi.css .pill + .pill.accent + .pill.warn etc.

defineProps<{
  variant?: 'neutral' | 'accent' | 'outline' | 'warn'
  dot?: boolean
  dotState?: 'ok' | 'warn' | 'info'
}>()
</script>

<template>
  <span
    class="pill inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs"
    :class="[
      variant ?? 'neutral',
      variant === 'accent' && 'bg-accent/10 text-accent',
      variant === 'outline' && 'border border-line text-ink-2',
      variant === 'warn' && 'bg-amber-500/10 text-amber-300',
      (!variant || variant === 'neutral') && 'bg-line-2 text-ink-2',
    ]"
    :data-dot-state="dotState ?? 'ok'"
  >
    <span
      v-if="dot"
      class="dot inline-block h-1.5 w-1.5 rounded-full"
      :class="[
        dotState === 'warn' && 'bg-amber-400',
        dotState === 'info' && 'bg-blue-400',
        (!dotState || dotState === 'ok') && 'bg-green-400',
      ]"
    />
    <slot />
  </span>
</template>
