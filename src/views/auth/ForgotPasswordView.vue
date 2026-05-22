<!-- token-exempt-file: Auth-shell view. Px values match A15.05 hi-fi (cluster-01-tokens-used.md §3-§5). -->
<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

import AuthCard from '@/components/auth/AuthCard.vue'
import AuthCta from '@/components/auth/AuthCta.vue'
import AuthDivider from '@/components/auth/AuthDivider.vue'
import AuthField from '@/components/auth/AuthField.vue'
import AuthHeader from '@/components/auth/AuthHeader.vue'
import * as constants from '@/constants'
import { supabase } from '@/lib/supabase'

// W8a Cluster 01 — ForgotPasswordView (Plan 01 Task 18 / amendment §7 Phase 9.3).
// Hi-fi: A15.05. Behind constants.FORGOT_PASSWORD_ENABLED feature flag (false in MVP).
// Route exists for the Phase 2 email+password upgrade; entry link hidden from
// /login until the flag flips on. When flag is off, the form still renders
// for canonical-URL discoverability but the submit is disabled with an
// honest notice steering the user back to magic-link sign-in.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const router = useRouter()
const email = ref('')
const emailError = ref('')
const isSubmitting = ref(false)
const sent = ref(false)

async function onSubmit(): Promise<void> {
  emailError.value = ''
  if (!constants.FORGOT_PASSWORD_ENABLED) return
  if (!EMAIL_PATTERN.test(email.value)) {
    emailError.value = 'Enter a valid email address.'
    return
  }
  isSubmitting.value = true
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email.value)
    if (error) {
      emailError.value = 'Could not send. Try again.'
      return
    }
    sent.value = true
  } finally {
    isSubmitting.value = false
  }
}

function onBackToSignIn(): void {
  void router.push('/login')
}
</script>

<template>
  <div
    data-theme="light"
    data-test-id="forgot-password-view"
    class="grid min-h-screen grid-rows-[auto_1fr_auto] bg-bg text-ink"
  >
    <AuthHeader mode="signin" />
    <main class="grid min-h-0 place-items-center overflow-auto px-6 py-6 pb-14">
      <AuthCard>
        <header class="flex flex-col gap-[6px] text-left">
          <span class="text-[10px] text-ink-3">Reset password</span>
          <h1 class="m-0 text-[24px] leading-[1.18] font-semibold tracking-tight text-ink">
            Forgot your password?
          </h1>
          <p class="m-0 text-[13px] leading-[1.55] text-ink-2">
            Enter your email and we'll send a recovery link. The link is valid for 60 minutes.
          </p>
        </header>

        <p
          v-if="!constants.FORGOT_PASSWORD_ENABLED"
          data-test-id="forgot-password-disabled-notice"
          class="rounded-md border border-line bg-fill px-[12px] py-[10px] text-[12px] leading-[1.5] text-ink-2"
        >
          Magic-link sign-in is the only option in MVP. Password recovery becomes available when
          email + password sign-in ships.
        </p>

        <form class="flex flex-col gap-[14px]" @submit.prevent="onSubmit">
          <AuthField
            v-model="email"
            type="email"
            label="Email"
            autocomplete="email"
            placeholder="you@example.com"
            :error="emailError"
            :disabled="!constants.FORGOT_PASSWORD_ENABLED || sent"
          />
          <p class="text-[11.5px] text-ink-3">
            We'll only send a link if this email has an account.
          </p>
          <AuthCta
            data-test-id="forgot-password-submit"
            :label="sent ? 'Sent · check your inbox' : 'Send recovery link'"
            :loading="isSubmitting"
            :disabled="!constants.FORGOT_PASSWORD_ENABLED || sent || !email"
          />
        </form>

        <AuthDivider />

        <AuthCta
          label="Back to sign in"
          type="button"
          variant="secondary"
          @click="onBackToSignIn"
        />

        <p class="text-[12px] text-ink-2">
          Most accounts use magic-link sign-in instead.
          <RouterLink to="/login" class="text-ink underline hover:text-ink-2">
            What's that?
          </RouterLink>
        </p>
      </AuthCard>
    </main>
  </div>
</template>
