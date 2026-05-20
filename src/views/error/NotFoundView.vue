<script setup lang="ts">
import { useRouter } from 'vue-router'

import KovaButton from '@/components/ui/KovaButton.vue'
import KovaIcon from '@/components/ui/KovaIcon.vue'

import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

function goDashboard(): void {
  void router.push(auth.isAuthenticated ? '/dashboard' : '/login')
}

function signOut(): void {
  void auth.signOut().finally(() => router.push('/login'))
}
</script>

<template>
  <div class="err-page">
    <div class="err-card">
      <div class="err-icon-tile">
        <KovaIcon name="file-question" size="lg" class="ic" aria-hidden="true" />
      </div>
      <h1>Page not found</h1>
      <p>It may be archived or you don't have access.</p>
      <div class="err-cta-stack">
        <KovaButton variant="primary" @click="goDashboard">Go to dashboard</KovaButton>
        <KovaButton variant="text" :icon="auth.isAuthenticated ? 'log-out' : 'arrow-left'" @click="signOut">
          {{ auth.isAuthenticated ? 'Sign out' : 'Back to sign in' }}
        </KovaButton>
      </div>
    </div>
  </div>
</template>
