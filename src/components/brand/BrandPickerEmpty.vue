<script setup lang="ts">
import KovaButton from '@/components/ui/KovaButton.vue'
import KovaIcon from '@/components/ui/KovaIcon.vue'

// W9b Cluster 03 — `.bp-empty` zero-state (Plan 03 Task 29 / PRD A2.b).

interface Props {
  title?: string
  body?: string
  ctaLabel?: string
  showCta?: boolean
}
withDefaults(defineProps<Props>(), {
  title: 'Start with one brand',
  body: 'Each brand is its own workspace: canvases, kit, Shopify, and chat.',
  ctaLabel: 'New brand',
  showCta: true,
})

const emit = defineEmits<{ (e: 'cta'): void }>()
</script>

<template>
  <div class="bp-empty">
    <div class="bp-empty__icon">
      <KovaIcon name="layers" size="lg" aria-hidden="true" />
    </div>
    <h3 class="bp-empty__title">{{ title }}</h3>
    <p class="bp-empty__body">{{ body }}</p>
    <KovaButton v-if="showCta" variant="primary" @click="emit('cta')">{{ ctaLabel }}</KovaButton>
  </div>
</template>
