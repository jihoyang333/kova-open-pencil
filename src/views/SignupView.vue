<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

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

function validateForm(): string | null {
  if (!email.value.includes('@')) return 'Please enter a valid email address.'
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
  const { error: authError } = await auth.signUp(email.value, password.value)
  isSubmitting.value = false

  if (authError) {
    error.value = authError.message
    return
  }

  void router.push('/onboarding')
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
        <svg class="size-5" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
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
