<script setup lang="ts">
import { computed } from 'vue'

import GoogleIcon from '@/components/icons/GoogleIcon.vue'

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
    <GoogleIcon class="google-signin__logo" aria-hidden="true" />
    <span class="google-signin__label">{{ label }}</span>
  </button>
</template>

<!-- token-exempt-file: Google brand-spec primitive — sizing + color literals come from Google branding guidelines, audited in docs/execution-phase/cluster-audits/cluster-01-tokens-used.md (Q-10 + §1.4.a). -->
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
