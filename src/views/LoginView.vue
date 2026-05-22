<!-- token-exempt-file: Auth-shell view. Px values match A15.02 + A15.04 + B4.4 hi-fi (cluster-01-tokens-used.md §3-§5). -->
<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

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

// W8a Cluster 01 — LoginView (Plan 01 Task 17 / amendment §3.1).
// 5-state machine per audit rubric:
//   email-entry      (A15.02) — initial; user enters email
//   magic-link-sent  (A15.03) — after successful send, awaiting code or link click
//   otp-entry        (A15.04) — user is actively entering the 6-digit code
//   otp-wrong        (B4.3)   — last verifyOtp attempt failed (attempts < 5)
//   otp-locked       (B4.4)   — 5 wrong attempts; only path is to request new code
// Supabase signInWithOtp sends one email containing BOTH the magic link
// and the 6-digit code; either path completes auth. The three middle states
// (magic-link-sent / otp-entry / otp-wrong) all render on the A15.04 surface;
// the distinction is internal logic for behavior + analytics.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_OTP_ATTEMPTS = 5

type State =
  | 'email-entry'
  | 'magic-link-sent'
  | 'otp-entry'
  | 'otp-wrong'
  | 'otp-locked'

const CODE_STATES: readonly State[] = ['magic-link-sent', 'otp-entry', 'otp-wrong'] as const

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

watch(otpCode, (value) => {
  if (value.length > 0 && state.value === 'magic-link-sent') {
    state.value = 'otp-entry'
  }
})

onMounted(() => {
  const emailParam = route.query.email
  const stateParam = route.query.state
  if (typeof emailParam === 'string') email.value = emailParam
  if (stateParam === 'code-entry' || stateParam === 'otp-entry') {
    state.value = 'magic-link-sent'
  }
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

function onSendNewLink(): void {
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
      state.value = 'otp-wrong'
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
    :data-state="state"
    class="grid min-h-screen grid-rows-[auto_1fr_auto] bg-bg text-ink"
  >
    <AuthHeader mode="signin" />
    <main class="grid min-h-0 place-items-center overflow-auto px-6 py-6 pb-14">
      <AuthCard>
        <template v-if="state === 'email-entry'">
          <header class="flex flex-col gap-[6px] text-left">
            <span class="text-[10px] text-ink-3">Welcome back</span>
            <h1 class="m-0 text-[24px] leading-[1.18] font-semibold tracking-tight text-ink">
              Sign in to Kova
            </h1>
            <p class="m-0 text-[13px] leading-[1.55] text-ink-2">
              Enter your email and we'll send a sign-in code.
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

        <template v-else-if="CODE_STATES.includes(state)">
          <header class="flex flex-col gap-[6px] text-left">
            <span class="text-[10px] text-ink-3">Enter code</span>
            <h1 class="m-0 text-[24px] leading-[1.18] font-semibold tracking-tight text-ink">
              Check your email for a 6-digit code
            </h1>
            <p class="m-0 text-[13px] leading-[1.55] text-ink-2">
              Enter it here for instant sign-in, or click the link in the email.
            </p>
          </header>

          <div class="flex flex-col gap-[6px]">
            <span class="text-[11.5px] font-medium tracking-[-0.005em] text-ink-2">
              Verification code
            </span>
            <OtpInput v-model="otpCode" :error="state === 'otp-wrong'" @complete="onOtpComplete" />
            <span class="text-[11.5px] text-ink-3">
              Sent to <b class="font-medium text-ink">{{ email }}</b>
            </span>
          </div>

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
          <AuthCta label="Send a new code" type="button" @click="onSendNewLink" />
        </template>
      </AuthCard>
    </main>
  </div>
</template>
