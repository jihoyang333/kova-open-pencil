<!-- token-exempt-file: Auth-shell view. Px values match A15.01 hi-fi (cluster-01-tokens-used.md §3-§5). -->
<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

import AuthCard from '@/components/auth/AuthCard.vue'
import AuthCta from '@/components/auth/AuthCta.vue'
import AuthDivider from '@/components/auth/AuthDivider.vue'
import AuthField from '@/components/auth/AuthField.vue'
import AuthFootnote from '@/components/auth/AuthFootnote.vue'
import AuthHeader from '@/components/auth/AuthHeader.vue'
import GoogleSignInButton from '@/components/auth/GoogleSignInButton.vue'
import MagicLinkSentBlock from '@/components/auth/MagicLinkSentBlock.vue'
import { useMagicLink } from '@/composables/auth/use-magic-link'
import { toast } from '@/composables/use-toast'

// W8a Cluster 01 — SignupView (Plan 01 Task 17 / amendment §3.1).
// 2-state machine: email-entry → magic-link-sent. Google button slotted
// above the email field per Notion pattern; A15 hi-fi is NOT amended
// (founder lock 2026-05-21) — the Google button comes from
// KovaGoogleSignInButton primitive built per Google brand spec.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type State = 'email-entry' | 'magic-link-sent'

const state = ref<State>('email-entry')
const email = ref('')
const emailError = ref('')
const isSubmitting = ref(false)

const { send, cooldown } = useMagicLink()
const router = useRouter()

async function onSubmit(): Promise<void> {
  emailError.value = ''
  if (!EMAIL_PATTERN.test(email.value)) {
    emailError.value = 'Enter your email'
    return
  }
  isSubmitting.value = true
  try {
    const result = await send(email.value)
    if (result.ok) {
      state.value = 'magic-link-sent'
    } else if (result.reason === 'rate_limited') {
      emailError.value = 'Too many requests. Try again soon.'
    } else if (result.reason === 'invalid_email') {
      emailError.value = 'Please enter a valid email address.'
    } else {
      emailError.value = 'Could not send. Try again.'
    }
  } finally {
    isSubmitting.value = false
  }
}

function onEnterCodeInstead(): void {
  void router.push({ path: '/login', query: { state: 'otp-entry', email: email.value } })
}

function onOAuthError(reason: string): void {
  toast.show(`Google sign-in failed: ${reason}`, 'error')
}
</script>

<template>
  <div
    data-theme="light"
    data-test-id="signup-view"
    class="grid min-h-screen grid-rows-[auto_1fr] bg-page text-ink"
  >
    <AuthHeader mode="signup" />
    <main class="flex items-start justify-center px-6 py-6 pb-14">
      <AuthCard>
        <template v-if="state === 'email-entry'">
          <header class="flex flex-col gap-[6px] text-left">
            <h1 class="m-0 text-[22px] leading-[1.22] font-semibold tracking-tight text-ink">
              Create your account
            </h1>
            <p class="m-0 text-[13px] leading-[1.55] text-ink-2">
              Sign up with Google or use your email for a magic link.
            </p>
          </header>

          <GoogleSignInButton mode="signup" @oauth-error="onOAuthError" />
          <AuthDivider />

          <form class="flex flex-col gap-[14px]" @submit.prevent="onSubmit">
            <AuthField
              v-model="email"
              type="email"
              label="Email"
              autocomplete="email"
              placeholder="you@example.com"
              :error="emailError"
            />
            <AuthCta label="Continue with email" :loading="isSubmitting" :disabled="!email" />
          </form>

          <AuthFootnote mode="signup" />
        </template>

        <MagicLinkSentBlock
          v-else
          :email="email"
          :resend-cooldown="cooldown"
          @resend="onSubmit"
          @enter-code-instead="onEnterCodeInstead"
        />
      </AuthCard>
    </main>
  </div>
</template>
