<!-- token-exempt-file: Auth-shell view. Px values match A15.06 hi-fi (cluster-01-tokens-used.md §3-§5). -->
<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

import AuthCard from '@/components/auth/AuthCard.vue'
import AuthCta from '@/components/auth/AuthCta.vue'
import AuthHeader from '@/components/auth/AuthHeader.vue'
import { useAuthStore } from '@/stores/auth'

// W8a Cluster 01 — EmailVerifiedView (Plan 01 Task 18 / amendment §7 Phase 9.2).
// Hi-fi: A15.06 — post-magic-link landing card with success medal, persistent-
// session toggle (opt-out, pre-toggled on, 30-day refresh), and "Continue to
// Kova" CTA that routes to /onboarding (new) or /dashboard (existing) based
// on auth.isOnboarded. AuthCallbackView handles the auto-redirect path; this
// view is reachable when the magic-link flow lands users at /auth/email-verified
// instead of /auth/callback (manual confirm flow, future Cluster 04 surface).

const router = useRouter()
const auth = useAuthStore()

const persistentSession = ref(true)
const email = computed(() => auth.user?.email ?? '')

function togglePersistent(): void {
  persistentSession.value = !persistentSession.value
}

function onContinue(): void {
  void router.push(auth.isOnboarded ? '/dashboard' : '/onboarding')
}

async function onSignOut(): Promise<void> {
  await auth.signOut()
  void router.push('/login')
}
</script>

<template>
  <div
    data-theme="light"
    data-test-id="email-verified-view"
    class="grid min-h-screen grid-rows-[auto_1fr_auto] bg-bg text-ink"
  >
    <AuthHeader mode="verified" />
    <main class="grid min-h-0 place-items-center overflow-auto px-6 py-6 pb-14">
      <AuthCard>
        <div class="flex flex-col items-center gap-[18px] text-center">
          <div
            class="grid size-12 place-items-center rounded-full bg-ok-soft text-ok"
            aria-hidden="true"
          >
            <icon-lucide-check class="size-6" />
          </div>

          <header class="flex flex-col items-center gap-[6px] text-center">
            <span class="text-[10px] text-ink-3">Email verified</span>
            <h1 class="m-0 text-[24px] leading-[1.18] font-semibold tracking-tight text-ink">
              You're signed in
            </h1>
            <p class="m-0 max-w-[300px] text-[13px] leading-[1.55] text-ink-2">
              <b class="font-medium text-ink">{{ email }}</b> is confirmed. We'll take you to your
              workspace next.
            </p>
          </header>

          <button
            type="button"
            data-test-id="persistent-session-toggle"
            role="switch"
            :aria-checked="persistentSession ? 'true' : 'false'"
            class="flex w-full items-center justify-between rounded-md border border-line bg-fill px-[14px] py-[10px] text-left transition-colors hover:border-ink-3"
            @click="togglePersistent"
          >
            <span class="flex flex-col gap-[2px]">
              <span class="text-[13px] font-medium text-ink">Keep me signed in on this device</span>
              <span class="text-[11.5px] text-ink-2">
                Stay signed in for 30 days · skip the magic link next time
              </span>
            </span>
            <span
              :class="[
                'relative inline-flex h-[18px] w-[30px] shrink-0 rounded-full transition-colors',
                persistentSession ? 'bg-ink' : 'bg-line'
              ]"
            >
              <span
                :class="[
                  'absolute top-[2px] size-[14px] rounded-full bg-page transition-transform',
                  persistentSession ? 'translate-x-[14px]' : 'translate-x-[2px]'
                ]"
              />
            </span>
          </button>

          <AuthCta
            label="Continue to Kova"
            type="button"
            data-test-id="continue-to-kova"
            @click="onContinue"
          />

          <p class="m-0 text-[12px] text-ink-2">
            Not you?
            <button
              type="button"
              data-test-id="sign-out-link"
              class="text-ink underline hover:text-ink-2"
              @click="onSignOut"
            >
              Sign out and start over
            </button>
          </p>
        </div>
      </AuthCard>
    </main>
  </div>
</template>
