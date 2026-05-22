<!-- token-exempt-file: Auth-shell view. Px values match A15.02-A15.04 + B4.3-B4.4 hi-fi (cluster-01-tokens-used.md §3-§5). -->
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import AuthCard from '@/components/auth/AuthCard.vue'
import AuthCta from '@/components/auth/AuthCta.vue'
import AuthDivider from '@/components/auth/AuthDivider.vue'
import AuthField from '@/components/auth/AuthField.vue'
import AuthFootnote from '@/components/auth/AuthFootnote.vue'
import AuthHeader from '@/components/auth/AuthHeader.vue'
import GoogleSignInButton from '@/components/auth/GoogleSignInButton.vue'
import MagicLinkSentBlock from '@/components/auth/MagicLinkSentBlock.vue'
import OtpInput from '@/components/auth/OtpInput.vue'
import { useMagicLink } from '@/composables/auth/use-magic-link'
import { toast } from '@/composables/use-toast'
import { supabase } from '@/lib/supabase'

// W8a Cluster 01 — LoginView (Plan 01 Task 17 / amendment §3.1).
// 5-state machine per Plan 01 §6.4:
//   email-entry (A15.02) → magic-link-sent (A15.03) → otp-entry (A15.04)
//                                                  ↘ otp-wrong (B4.3 inline)
//                                                  ↘ otp-locked (B4.4)
// Google button only on email-entry. Auto-submit on 6th OTP digit per
// Plan 01 §12.6.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_OTP_ATTEMPTS = 5

type State = 'email-entry' | 'magic-link-sent' | 'otp-entry' | 'otp-wrong' | 'otp-locked'

const route = useRoute()
const router = useRouter()
const { send, cooldown } = useMagicLink()

const state = ref<State>('email-entry')
const email = ref('')
const emailError = ref('')
const isSubmitting = ref(false)
const otpCode = ref('')
const otpError = ref('')
const otpAttempts = ref(0)

const otpAttemptsLeft = computed(() => Math.max(0, MAX_OTP_ATTEMPTS - otpAttempts.value))

onMounted(() => {
  const stateParam = route.query.state
  const emailParam = route.query.email
  if (typeof emailParam === 'string') email.value = emailParam
  if (stateParam === 'otp-entry') state.value = 'otp-entry'
})

async function onEmailSubmit(): Promise<void> {
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
  state.value = 'otp-entry'
  otpCode.value = ''
  otpAttempts.value = 0
}

async function onOtpComplete(code: string): Promise<void> {
  if (otpAttempts.value >= MAX_OTP_ATTEMPTS) {
    state.value = 'otp-locked'
    return
  }
  otpError.value = ''
  const { error } = await supabase.auth.verifyOtp({
    email: email.value,
    token: code,
    type: 'email'
  })
  if (error) {
    otpAttempts.value += 1
    if (otpAttempts.value >= MAX_OTP_ATTEMPTS) {
      state.value = 'otp-locked'
    } else {
      state.value = 'otp-wrong'
      otpError.value = `Wrong code. ${otpAttemptsLeft.value} attempts left.`
    }
    return
  }
  void router.push('/dashboard')
}

function onOAuthError(reason: string): void {
  toast.show(`Google sign-in failed: ${reason}`, 'error')
}
</script>

<template>
  <div
    data-theme="light"
    data-test-id="login-view"
    class="grid min-h-screen grid-rows-[auto_1fr] bg-page text-ink"
  >
    <AuthHeader mode="signin" />
    <main class="flex items-start justify-center px-6 py-6 pb-14">
      <AuthCard>
        <template v-if="state === 'email-entry'">
          <header class="flex flex-col gap-[6px] text-left">
            <h1 class="m-0 text-[22px] leading-[1.22] font-semibold tracking-tight text-ink">
              Sign in to Kova
            </h1>
            <p class="m-0 text-[13px] leading-[1.55] text-ink-2">
              Continue with Google or enter your email for a magic link.
            </p>
          </header>

          <GoogleSignInButton mode="signin" @oauth-error="onOAuthError" />
          <AuthDivider />

          <form class="flex flex-col gap-[14px]" @submit.prevent="onEmailSubmit">
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

          <AuthFootnote mode="signin" />
        </template>

        <MagicLinkSentBlock
          v-else-if="state === 'magic-link-sent'"
          :email="email"
          :resend-cooldown="cooldown"
          @resend="onEmailSubmit"
          @enter-code-instead="onEnterCodeInstead"
        />

        <template v-else-if="state === 'otp-entry' || state === 'otp-wrong'">
          <header class="flex flex-col gap-[6px] text-left">
            <h1 class="m-0 text-[22px] leading-[1.22] font-semibold tracking-tight text-ink">
              Enter your 6-digit code
            </h1>
            <p class="m-0 text-[13px] leading-[1.55] text-ink-2">
              We sent it to <b class="font-medium text-ink">{{ email }}</b
              >.
            </p>
          </header>
          <OtpInput v-model="otpCode" @complete="onOtpComplete" />
          <p v-if="otpError" class="text-[12px] text-warn">{{ otpError }}</p>
          <button
            type="button"
            class="self-start text-[12px] text-ink-2 hover:text-ink hover:underline"
            @click="state = 'email-entry'"
          >
            Try a different email
          </button>
        </template>

        <template v-else-if="state === 'otp-locked'">
          <header class="flex flex-col gap-[6px] text-left">
            <h1 class="m-0 text-[22px] leading-[1.22] font-semibold tracking-tight text-ink">
              Too many wrong attempts
            </h1>
            <p class="m-0 text-[13px] leading-[1.55] text-ink-2">
              For your security, we've locked code entry for this email. Request a new magic link to
              continue.
            </p>
          </header>
          <AuthCta
            label="Send a new magic link"
            type="button"
            @click="
              state = 'email-entry'
              otpAttempts = 0
            "
          />
        </template>
      </AuthCard>
    </main>
  </div>
</template>
