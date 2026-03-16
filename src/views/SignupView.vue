<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

import GoogleIcon from '@/components/icons/GoogleIcon.vue'
import { APP_NAME } from '@/constants'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const error = ref('')
const googleError = ref('')
const isSubmitting = ref(false)

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validateForm(): string | null {
  if (!EMAIL_PATTERN.test(email.value)) return 'Please enter a valid email address.'
  if (password.value.length < 6) return 'Password must be at least 6 characters.'
  if (password.value !== confirmPassword.value) return 'Passwords do not match.'
  return null
}

async function handleSubmit() {
  error.value = ''
  const validationError = validateForm()
  if (validationError) {
    error.value = validationError
    return
  }

  isSubmitting.value = true
  try {
    const { error: authError } = await auth.signUp(email.value, password.value)
    if (authError) {
      error.value = authError.message
      return
    }
    void router.push('/onboarding')
  } finally {
    isSubmitting.value = false
  }
}

async function handleGoogleSignIn() {
  googleError.value = ''
  const { error: authError } = await auth.signInWithGoogle()
  if (authError) {
    googleError.value = authError.message
  }
}
</script>

<template>
  <div
    data-test-id="signup-view"
    class="flex min-h-screen items-center justify-center bg-white px-4"
  >
    <div class="w-full max-w-sm">
      <!-- Logo + wordmark -->
      <div class="mb-8 flex flex-col items-center gap-3">
        <img src="/favicon-128.png" class="size-12 rounded-xl" :alt="APP_NAME" />
        <h1 class="text-2xl font-semibold tracking-tight text-gray-900">
          Create your account
        </h1>
      </div>

      <!-- Google OAuth -->
      <button
        data-test-id="signup-google-button"
        class="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        @click="handleGoogleSignIn"
      >
        <GoogleIcon class="size-5" />
        Continue with Google
      </button>
      <p
        v-if="googleError"
        data-test-id="signup-google-error"
        class="mt-2 text-center text-xs text-red-600"
      >
        {{ googleError }}
      </p>

      <!-- Divider -->
      <div class="my-6 flex items-center gap-3">
        <div class="h-px flex-1 bg-gray-200" />
        <span class="text-xs text-gray-400">or</span>
        <div class="h-px flex-1 bg-gray-200" />
      </div>

      <!-- Email/password form -->
      <form class="flex flex-col gap-3" @submit.prevent="handleSubmit">
        <div>
          <label for="signup-email" class="mb-1 block text-xs font-medium text-gray-700">
            Email
          </label>
          <input
            id="signup-email"
            v-model="email"
            type="email"
            data-test-id="signup-email-input"
            class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="you@company.com"
          />
        </div>
        <div>
          <label for="signup-password" class="mb-1 block text-xs font-medium text-gray-700">
            Password
          </label>
          <input
            id="signup-password"
            v-model="password"
            type="password"
            data-test-id="signup-password-input"
            class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="••••••••"
          />
        </div>
        <div>
          <label for="signup-confirm" class="mb-1 block text-xs font-medium text-gray-700">
            Confirm password
          </label>
          <input
            id="signup-confirm"
            v-model="confirmPassword"
            type="password"
            data-test-id="signup-confirm-input"
            class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="••••••••"
          />
        </div>

        <p
          v-if="error"
          data-test-id="signup-error"
          class="text-xs text-red-600"
        >
          {{ error }}
        </p>

        <button
          type="submit"
          data-test-id="signup-submit-button"
          class="mt-1 w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          :disabled="isSubmitting"
        >
          {{ isSubmitting ? 'Creating account...' : 'Create Account' }}
        </button>
      </form>

      <!-- Login link -->
      <p class="mt-6 text-center text-sm text-gray-500">
        Already have an account?
        <RouterLink
          to="/login"
          data-test-id="signup-login-link"
          class="font-medium text-blue-600 hover:text-blue-700"
        >
          Log in
        </RouterLink>
      </p>
    </div>
  </div>
</template>
