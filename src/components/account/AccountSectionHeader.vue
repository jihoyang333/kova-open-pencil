<script setup lang="ts">
// PRD 04 §6.4.2 — Section header (title + optional sub-copy + trailing slot).
interface Props {
  title: string
  subtitle?: string
}
const { title, subtitle } = defineProps<Props>()
</script>

<template>
  <header class="acc-section-head">
    <div class="acc-section-head-text">
      <h1 class="acc-section-title">{{ title }}</h1>
      <p v-if="subtitle !== undefined && subtitle !== ''" class="acc-section-sub">{{ subtitle }}</p>
    </div>
    <div class="acc-section-head-trailing">
      <slot name="trailing" />
    </div>
  </header>
</template>
