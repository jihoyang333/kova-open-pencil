<script setup lang="ts">
import { computed } from 'vue'

export interface KovaGoogleSignInButtonProps {
  mode: 'signin' | 'signup'
  theme?: 'light' | 'dark'
  disabled?: boolean
}

const { mode, theme = 'light', disabled = false } = defineProps<KovaGoogleSignInButtonProps>()

const emit = defineEmits<{ click: [] }>()

const label = computed(() => (mode === 'signin' ? 'Continue with Google' : 'Sign up with Google'))

const themeClass = computed(() =>
  theme === 'dark' ? 'google-signin--dark' : 'google-signin--light'
)
</script>

<template>
  <button
    type="button"
    class="google-signin"
    :class="themeClass"
    :disabled="disabled"
    @click="emit('click')"
  >
    <!-- Google G mark — official 48×48 viewBox per Google branding guidelines.
         4 token-exempt hex literals (the brand-mandated arc colors). -->
    <svg
      class="google-signin__logo"
      viewBox="0 0 48 48"
      width="18"
      height="18"
      aria-hidden="true"
    >
      <path
        d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
        fill="#4285F4"
      />
      <path
        d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
        fill="#34A853"
      />
      <path
        d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z"
        fill="#FBBC05"
      />
      <path
        d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
        fill="#EA4335"
      />
    </svg>
    <span class="google-signin__label">{{ label }}</span>
  </button>
</template>

<!-- token-exempt-file: Google brand-spec primitive — sizing + color literals come from Google branding guidelines, audited in docs/execution-phase/cluster-audits/cluster-01-tokens-used.md §0. 6 token-exempt literals total: 4 SVG arc fills (#4285F4 / #34A853 / #FBBC05 / #EA4335) + 2 dark-theme chrome (#131314 bg, #8e918f border) + #1f1f20 dark-hover bg. All annotated inline. -->
<style scoped>
.google-signin {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  height: 44px;
  padding: 0 16px;
  border-radius: var(--r-md);
  font-family: var(--font-sans);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition:
    background-color 0.1s,
    border-color 0.1s;
}

.google-signin:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.google-signin__logo {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.google-signin--light {
  background-color: #ffffff; /* token-exempt: Google brand requirement */
  color: var(--ink);
  border: 1px solid var(--line);
}

.google-signin--light:hover:not(:disabled) {
  background-color: var(--fill);
}

.google-signin--dark {
  background-color: #131314; /* token-exempt: Google brand requirement */
  color: #ffffff; /* token-exempt: Google brand requirement */
  border: 1px solid #8e918f; /* token-exempt: Google brand requirement */
}

.google-signin--dark:hover:not(:disabled) {
  background-color: #1f1f20; /* token-exempt: Google brand requirement (hover state) */
}
</style>
