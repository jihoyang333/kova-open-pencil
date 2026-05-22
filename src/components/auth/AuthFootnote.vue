<!-- token-exempt-file: A15 hi-fi shell primitive. Px values match .auth-foot selector (cluster-01-tokens-used.md §3-§5). -->
<script setup lang="ts">
import { computed } from 'vue'

// Plan 01 Task 14 derivative. A15 hi-fi .auth-foot reference.

interface Props {
  mode: 'signin' | 'signup'
}

const { mode } = defineProps<Props>()

const cta = computed(() =>
  mode === 'signin'
    ? { question: 'No account?', label: 'Create one', to: '/signup' }
    : { question: 'Already have an account?', label: 'Sign in', to: '/login' }
)
</script>

<template>
  <p class="mt-[2px] text-center text-[12px] text-ink-3">
    {{ cta.question }}
    <RouterLink :to="cta.to" class="ml-1 font-medium text-ink-2 hover:text-ink hover:underline">
      {{ cta.label }}
    </RouterLink>
  </p>
</template>
