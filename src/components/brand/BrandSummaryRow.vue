<script setup lang="ts">
import { computed } from 'vue'

import { brandLogoTintClass } from '@/composables/use-brand-color'
import { sanitizePlainText } from '@/lib/sanitize-text'

import type { Brand } from '@/types/kova/database'

// W9b Cluster 03 — `.brand-summary` row used inside Archive / Delete / Restore
// modals. Renders 5-tint logo glyph + name + meta (URL truncated).
// Per Plan 03 Task 22. Plain-text sanitized for B-CRIT14 defense in depth.

interface Props {
  brand: Brand
}
const props = defineProps<Props>()

const safeName = computed(() => sanitizePlainText(props.brand.name))
const safeUrl = computed(() => (props.brand.url ? sanitizePlainText(props.brand.url) : ''))
const logoClass = computed(() => `bp-card__logo ${brandLogoTintClass(props.brand.color)}`)
const initial = computed(() => safeName.value.charAt(0).toUpperCase() || 'B')
</script>

<template>
  <div class="brand-summary">
    <div :class="logoClass" aria-hidden="true">{{ initial }}</div>
    <div class="brand-summary__meta">
      <div class="brand-summary__name">{{ safeName }}</div>
      <div v-if="safeUrl" class="brand-summary__url">{{ safeUrl }}</div>
    </div>
  </div>
</template>
