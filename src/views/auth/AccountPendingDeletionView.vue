<!-- token-exempt-file: Auth-shell view. Px values follow Plan 01 §6.4 + A15 chrome (cluster-01-tokens-used.md §3-§5). -->
<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'

import AuthCard from '@/components/auth/AuthCard.vue'
import AuthCta from '@/components/auth/AuthCta.vue'
import AuthHeader from '@/components/auth/AuthHeader.vue'
import { useAccountDeletion } from '@/composables/auth/use-account-deletion'
import { useAuthStore } from '@/stores/auth'

// W8a Cluster 01 — AccountPendingDeletionView (Plan 01 Task 20 / amendment §7
// Phase 9.5). Signed-in surface shown during the 30-day grace period after
// the user requests account deletion (Cluster 04 wires the entry point via
// DangerZoneCard; the API surface is in `requestAccountDeletion` already
// shipped on the auth store). Dark theme — this is an inside-app surface,
// not a pre-auth surface.

const router = useRouter()
const auth = useAuthStore()
const deletion = useAccountDeletion()

const purgeDate = computed(() => {
  const raw = deletion.scheduledPurgeAt.value ?? auth.scheduledPurgeAt
  if (!raw) return null
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? null : d
})

const formattedPurgeDate = computed(() => {
  const d = purgeDate.value
  if (!d) return ''
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
})

async function onRestore(): Promise<void> {
  const ok = await deletion.restoreAccount()
  if (ok) void router.push('/dashboard')
}

async function onSignOut(): Promise<void> {
  await auth.signOut()
  void router.push('/login')
}
</script>

<template>
  <div
    data-test-id="account-pending-deletion-view"
    class="grid min-h-screen grid-rows-[auto_1fr_auto] bg-bg text-ink"
  >
    <AuthHeader mode="signin" />
    <main class="grid min-h-0 place-items-center overflow-auto px-6 py-6 pb-14">
      <AuthCard>
        <div class="flex flex-col items-center gap-[18px] text-center">
          <div
            class="grid size-12 place-items-center rounded-full bg-warn-soft text-warn"
            aria-hidden="true"
          >
            <icon-lucide-clock class="size-6" />
          </div>

          <header class="flex flex-col items-center gap-[6px] text-center">
            <span class="text-[10px] text-ink-3">Pending deletion</span>
            <h1 class="m-0 text-[24px] leading-[1.18] font-semibold tracking-tight text-ink">
              Account scheduled for deletion
            </h1>
            <p class="m-0 max-w-[320px] text-[13px] leading-[1.55] text-ink-2">
              We'll permanently delete your account and all canvases on
              <b v-if="formattedPurgeDate" class="font-medium text-ink">{{ formattedPurgeDate }}</b>
              <span v-else class="font-medium text-ink">the scheduled date</span>. Restore now to
              keep everything.
            </p>
          </header>

          <AuthCta
            label="Restore account"
            type="button"
            data-test-id="restore-cta"
            @click="onRestore"
          />
          <AuthCta
            label="Sign out (keep deletion scheduled)"
            type="button"
            variant="secondary"
            data-test-id="signout-cta"
            @click="onSignOut"
          />
        </div>
      </AuthCard>
    </main>
  </div>
</template>
