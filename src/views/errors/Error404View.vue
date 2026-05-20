<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import KovaButton from '@/components/ui/KovaButton.vue'
import KovaIcon from '@/components/ui/KovaIcon.vue'

const router = useRouter()
const auth = useAuthStore()

// Smart "go home" — respects onboarding + auth state instead of blindly
// pushing /dashboard (which would bounce an unonboarded user to /onboarding).
function goHome() {
  if (!auth.isAuthenticated) {
    void router.push('/login')
  } else if (!auth.isOnboarded) {
    void router.push('/onboarding')
  } else {
    void router.push('/dashboard')
  }
}
</script>

<template>
  <div
    class="err-page grid min-h-screen place-items-center bg-page p-8 text-ink"
  >
    <div
      class="err-card flex max-w-md flex-col items-center gap-3 rounded-lg border border-line bg-panel p-8 text-center"
    >
      <div
        class="err-icon-tile grid h-12 w-12 place-items-center rounded-md bg-line-2 text-ink-2"
      >
        <KovaIcon name="search-x" size="lg" />
      </div>
      <h1 class="text-xl font-semibold">Page not found</h1>
      <p class="text-sm text-ink-2">
        It may be archived or you don't have access.
      </p>
      <div class="cta-row mt-3 flex items-center gap-2">
        <KovaButton variant="primary" @click="goHome">
          Go home
        </KovaButton>
        <KovaButton variant="text" @click="auth.signOut()">
          Sign out
        </KovaButton>
      </div>
    </div>
  </div>
</template>
