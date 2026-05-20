<script setup lang="ts">
import { useTheme } from '@/composables/use-theme'

/**
 * Marketing shell — light theme. Used by /privacy + /terms (Cluster 01).
 * Route declares `meta.theme: 'light'` to drive `useTheme()` swap.
 *
 * Shell anatomy: max-width content column on light surface, Inter sans,
 * --color-page bg in light-mode = #fff (per kova-hifi-light.css).
 */

useTheme()
</script>

<template>
  <div
    :style="{
      background: 'var(--page)',
      color: 'var(--ink)',
      minHeight: '100%',
      height: '100%',
      width: '100%',
      overflowY: 'auto',
      fontFamily: 'Inter, system-ui, sans-serif',
    }"
  >
    <div
      :style="{
        maxWidth: '720px',
        margin: '0 auto',
        padding: '64px 24px',
      }"
    >
      <slot />
    </div>
  </div>
</template>
