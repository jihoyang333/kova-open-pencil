<script setup lang="ts">
import { useRouter } from 'vue-router'

import KovaButton from '@/components/ui/KovaButton.vue'
import KovaIcon from '@/components/ui/KovaIcon.vue'

// W9b Cluster 03 — placeholder for routes that haven't shipped yet.
// Used by PRD §12.7 Account button fallback. Polite, no jargon.

interface Props {
  feature?: string
  back?: string
}
withDefaults(defineProps<Props>(), { feature: 'This feature', back: '/brands' })

const router = useRouter()
</script>

<template>
  <div class="not-shipped">
    <div class="not-shipped__icon">
      <KovaIcon name="construction" size="lg" aria-hidden="true" />
    </div>
    <h2>{{ feature }} is coming soon</h2>
    <p>We're working on it. Check back shortly.</p>
    <KovaButton variant="primary" @click="router.push(back)">Back</KovaButton>
  </div>
</template>
