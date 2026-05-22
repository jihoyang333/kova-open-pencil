<script setup lang="ts">
import KovaGoogleSignInButton from '@/components/ui/KovaGoogleSignInButton.vue'
import { useGoogleOAuth } from '@/composables/auth/use-google-oauth'

// W8a Cluster 01 — Cluster 01 surface wrapping the Cluster 11 primitive
// + useGoogleOAuth composable (Plan 01 Task 17 / amendment §3.3).
//
// The wrapper exists so SignupView + LoginView can drop a single component
// without each owning the start() boilerplate. Failures surface via the
// oauth-error event; success does not emit because the browser is redirected
// to the Google consent screen by Supabase before we'd see the resolution.

interface Props {
  mode: 'signin' | 'signup'
  theme?: 'light' | 'dark'
}

const { mode, theme = 'light' } = defineProps<Props>()
const emit = defineEmits<{ 'oauth-error': [reason: string] }>()

const { start, isStarting } = useGoogleOAuth()

async function onClick(): Promise<void> {
  const result = await start()
  if (!result.ok) emit('oauth-error', result.reason)
}
</script>

<template>
  <KovaGoogleSignInButton :mode="mode" :theme="theme" :disabled="isStarting" @click="onClick" />
</template>
