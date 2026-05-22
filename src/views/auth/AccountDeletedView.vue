<!-- token-exempt-file: Auth-shell view. Px values follow Plan 01 §6.4 + A15 chrome (cluster-01-tokens-used.md §3-§5). -->
<script setup lang="ts">
import { useRouter } from 'vue-router'

import AuthCard from '@/components/auth/AuthCard.vue'
import AuthCta from '@/components/auth/AuthCta.vue'
import AuthHeader from '@/components/auth/AuthHeader.vue'

// W8a Cluster 01 — AccountDeletedView (Plan 01 Task 20 / amendment §7 Phase 9.6).
// Terminal post-deletion landing. Renders after the GDPR cron successfully
// purges the user. Public route — the user is already signed out by the time
// they see this, so light theme (pre-auth surface).

const router = useRouter()

function onStartFresh(): void {
  void router.push('/signup')
}
</script>

<template>
  <div
    data-theme="light"
    data-test-id="account-deleted-view"
    class="grid min-h-screen grid-rows-[auto_1fr_auto] bg-bg text-ink"
  >
    <AuthHeader mode="signup" />
    <main class="grid min-h-0 place-items-center overflow-auto px-6 py-6 pb-14">
      <AuthCard>
        <div class="flex flex-col items-center gap-[18px] text-center">
          <div
            class="grid size-12 place-items-center rounded-full bg-fill text-ink-3"
            aria-hidden="true"
          >
            <icon-lucide-check class="size-6" />
          </div>

          <header class="flex flex-col items-center gap-[6px] text-center">
            <span class="text-[10px] text-ink-3">Goodbye</span>
            <h1 class="m-0 text-[24px] leading-[1.18] font-semibold tracking-tight text-ink">
              Your account is deleted
            </h1>
            <p class="m-0 max-w-[320px] text-[13px] leading-[1.55] text-ink-2">
              Your account, brand profiles, and canvases have been permanently removed. If you
              change your mind, you can always start fresh.
            </p>
          </header>

          <AuthCta
            label="Create a new account"
            type="button"
            data-test-id="start-fresh-cta"
            @click="onStartFresh"
          />
        </div>
      </AuthCard>
    </main>
  </div>
</template>
