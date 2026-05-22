<!-- token-exempt-file: A15 hi-fi shell primitive. Px values match the .auth-top selector in design-system/hifi/auth/Kova Hi-Fi A15 Auth - Light.html (audited in docs/execution-phase/cluster-audits/cluster-01-tokens-used.md §3–§5). -->
<script setup lang="ts">
import { computed } from 'vue'

import { APP_NAME } from '@/constants'

// W8a Cluster 01 — shared auth-shell header (Plan 01 Task 14 derivative).
// A15 hi-fi reference: .auth-top wordmark on the left, .auth-top .corner
// "Sign in / Sign up" cross-link on the right. The corner link hides on
// verified + sent states (no nav out of the success rail).

interface Props {
  mode: 'signin' | 'signup' | 'verified' | 'sent'
}

const { mode } = defineProps<Props>()

const cornerLink = computed<{ to: string; label: string } | null>(() => {
  if (mode === 'signin') return { to: '/signup', label: 'No account? Sign up' }
  if (mode === 'signup') return { to: '/login', label: 'Already have an account? Sign in' }
  return null
})
</script>

<template>
  <header class="flex items-center justify-between px-7 py-[22px]">
    <RouterLink to="/" class="inline-flex items-center gap-2 text-[13px] font-semibold text-ink">
      <span
        class="grid size-5 place-items-center rounded-[5px] bg-ink text-[11.5px] font-extrabold text-ink-on-primary"
      >
        K
      </span>
      <span>{{ APP_NAME }}</span>
    </RouterLink>
    <RouterLink
      v-if="cornerLink"
      :to="cornerLink.to"
      class="text-[12px] font-medium text-ink-2 hover:text-ink"
    >
      {{ cornerLink.label }}
    </RouterLink>
  </header>
</template>
