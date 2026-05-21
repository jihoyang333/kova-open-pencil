<script setup lang="ts">
import { useRouter } from 'vue-router'

import KovaButton from '@/components/ui/KovaButton.vue'
import KovaIcon from '@/components/ui/KovaIcon.vue'

const router = useRouter()

function retry(): void {
  window.location.reload()
}

function goDashboard(): void {
  void router.push('/dashboard')
}
</script>

<template>
  <div class="err-page">
    <div class="err-card">
      <div class="err-icon-tile">
        <KovaIcon name="alert-triangle" size="lg" class="ic" aria-hidden="true" />
      </div>
      <h1>Something broke</h1>
      <p>Try again in a moment.</p>
      <div class="err-cta-stack">
        <KovaButton variant="primary" icon="refresh-cw" @click="retry">Try again</KovaButton>
        <KovaButton variant="text" @click="goDashboard">Go to dashboard</KovaButton>
      </div>
    </div>
  </div>
</template>
