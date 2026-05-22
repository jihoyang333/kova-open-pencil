<!-- token-exempt-file: Auth-shell view. Px values match A15.01 + A15.04 hi-fi (cluster-01-tokens-used.md §3-§5). -->
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
import OtpInput from '@/components/auth/OtpInput.vue'
import { useMagicLink } from '@/composables/auth/use-magic-link'
import { toast } from '@/composables/use-toast'
import { supabase } from '@/lib/supabase'

// W8a Cluster 01 — SignupView (Plan 01 Task 17 / amendment §3.1).
// Notion-pattern 2-state machine:
//   email-entry (A15.01)  → code-entry (A15.04 — OTP cells + email shown +
//                                       resend timer; user can ALSO click
//                                       the magic link in the email)
// Supabase signInWithOtp sends a single email with both the magic link
// and the 6-digit code; either path completes account creation.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_OTP_ATTEMPTS = 5

type State = 'email-entry' | 'code-entry' | 'otp-locked'

const state = ref<State>('email-entry')
const email = ref('')
const emailError = ref('')
const isSubmitting = ref(false)
const otpCode = ref('')
const otpError = ref('')
const otpAttempts = ref(0)

const { send, cooldown } = useMagicLink()
const router = useRouter()

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
      state.value = 'code-entry'
      otpCode.value = ''
      otpError.value = ''
      otpAttempts.value = 0
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

function onResend(): void {
  if (cooldown.value === 0) void onEmailSubmit()
}

function onTryDifferentEmail(): void {
  state.value = 'email-entry'
  otpCode.value = ''
  otpError.value = ''
  otpAttempts.value = 0
}

function onSendNewCode(): void {
  state.value = 'email-entry'
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
      const attemptsLeft = MAX_OTP_ATTEMPTS - otpAttempts.value
      otpError.value = `Wrong code. ${attemptsLeft} attempts left.`
    }
    return
  }
  // New user lands at /onboarding; AuthCallbackView handles that branch on
  // the magic-link path. Inline OTP completion takes the same route.
  void router.push('/onboarding')
}

function onOAuthError(reason: string): void {
  toast.show(`Google sign-in failed: ${reason}`, 'error')
}
</script>

<template>
  <div
    data-theme="light"
    data-test-id="signup-view"
    class="grid min-h-screen grid-rows-[auto_1fr_auto] bg-bg text-ink"
  >
    <AuthHeader mode="signup" />
    <main class="grid min-h-0 place-items-center overflow-auto px-6 py-6 pb-14">
      <AuthCard>
        <template v-if="state === 'email-entry'">
          <header class="flex flex-col gap-[6px] text-left">
            <h1 class="m-0 text-[22px] leading-[1.22] font-semibold tracking-tight text-ink">
              Create your account
            </h1>
            <p class="m-0 text-[13px] leading-[1.55] text-ink-2">
              Sign up with Google or use your email for a sign-up code.
            </p>
          </header>

          <GoogleSignInButton mode="signup" @oauth-error="onOAuthError" />
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

          <AuthFootnote mode="signup" />
        </template>

        <template v-else-if="state === 'code-entry'">
          <header class="flex flex-col gap-[6px] text-left">
            <h1 class="m-0 text-[22px] leading-[1.22] font-semibold tracking-tight text-ink">
              Check your email
            </h1>
            <p class="m-0 text-[13px] leading-[1.55] text-ink-2">
              We sent a code to <b class="font-medium text-ink">{{ email }}</b
              >. Enter it here, or click the link in the email.
            </p>
          </header>

          <OtpInput v-model="otpCode" @complete="onOtpComplete" />

          <p v-if="otpError" class="text-[12px] text-warn">{{ otpError }}</p>

          <div class="flex items-center justify-between text-[12px]">
            <button
              type="button"
              class="text-ink-2 hover:text-ink hover:underline"
              @click="onTryDifferentEmail"
            >
              Try a different email
            </button>
            <button
              type="button"
              :disabled="cooldown > 0"
              class="text-ink-2 hover:text-ink hover:underline disabled:cursor-not-allowed disabled:text-ink-3 disabled:no-underline"
              @click="onResend"
            >
              {{ cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code' }}
            </button>
          </div>
        </template>

        <template v-else-if="state === 'otp-locked'">
          <header class="flex flex-col gap-[6px] text-left">
            <h1 class="m-0 text-[22px] leading-[1.22] font-semibold tracking-tight text-ink">
              Too many wrong attempts
            </h1>
            <p class="m-0 text-[13px] leading-[1.55] text-ink-2">
              For your security, we've locked code entry for this email. Request a new code to
              continue.
            </p>
          </header>
          <AuthCta label="Send a new code" type="button" @click="onSendNewCode" />
        </template>
      </AuthCard>
    </main>
  </div>
</template>
