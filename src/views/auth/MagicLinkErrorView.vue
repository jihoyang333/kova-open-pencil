<!-- token-exempt-file: Auth-shell view. Px values match B4.1 + B4.2 hi-fi (cluster-01-tokens-used.md §3-§5). -->
<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import AuthCard from '@/components/auth/AuthCard.vue'
import AuthCta from '@/components/auth/AuthCta.vue'
import AuthHeader from '@/components/auth/AuthHeader.vue'

// W8a Cluster 01 — MagicLinkErrorView (Plan 01 Task 18 / amendment §7 Phase 9.1).
// B4.1 (?status=expired) + B4.2 (?status=invalid). Same auth-shell chrome
// as A15; only copy + CTA label differ per status. Unknown / missing status
// renders the invalid variant (safe default — never blame the user).

type ErrorStatus = 'expired' | 'invalid'

interface ErrorCopy {
  eyebrow: string
  headline: string
  lede: string
  primaryLabel: string
}

const route = useRoute()
const router = useRouter()

const status = computed<ErrorStatus>(() => {
  const raw = route.query.status
  return raw === 'expired' ? 'expired' : 'invalid'
})

const copy = computed<ErrorCopy>(() => {
  if (status.value === 'expired') {
    return {
      eyebrow: 'Sign-in link',
      headline: 'This link expired',
      lede: 'Magic links last 30 minutes for security. Send a new one to continue signing in.',
      primaryLabel: 'Send a new link'
    }
  }
  return {
    eyebrow: 'Sign-in link',
    headline: "Link doesn't work",
    lede: 'This link is invalid or has already been used. Sign in again to get a fresh one.',
    primaryLabel: 'Sign in'
  }
})

function onPrimary(): void {
  void router.push('/login')
}
</script>

<template>
  <div
    data-theme="light"
    data-test-id="magic-link-error-view"
    class="grid min-h-screen grid-rows-[auto_1fr_auto] bg-bg text-ink"
  >
    <AuthHeader mode="signin" />
    <main class="grid min-h-0 place-items-center overflow-auto px-6 py-6 pb-14">
      <AuthCard>
        <header class="flex flex-col gap-[6px] text-left">
          <span class="text-[10px] text-ink-3">{{ copy.eyebrow }}</span>
          <h1 class="m-0 text-[24px] leading-[1.18] font-semibold tracking-tight text-ink">
            {{ copy.headline }}
          </h1>
          <p class="m-0 text-[13px] leading-[1.55] text-ink-2">{{ copy.lede }}</p>
        </header>

        <AuthCta
          :label="copy.primaryLabel"
          type="button"
          data-test-id="magic-link-error-primary"
          @click="onPrimary"
        />
      </AuthCard>
    </main>
  </div>
</template>
