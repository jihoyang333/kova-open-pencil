<script setup lang="ts">
import KovaButton from '@/components/ui/KovaButton.vue'
import KovaIcon from '@/components/ui/KovaIcon.vue'

function retry(): void {
  window.location.reload()
}
</script>

<template>
  <div class="err-page">
    <div class="err-card">
      <div class="err-icon-tile">
        <KovaIcon name="wifi-off" size="lg" class="ic" aria-hidden="true" />
      </div>
      <h1>Can't reach Kova</h1>
      <p>Check your internet connection.</p>
      <div class="err-cta-stack">
        <KovaButton variant="primary" icon="refresh-cw" @click="retry">Retry connection</KovaButton>
      </div>
    </div>
  </div>
</template>
