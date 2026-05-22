import { ref } from 'vue'

import { supabase } from '@/lib/supabase'

import type { Ref } from 'vue'

// W8a Cluster 01 — useGoogleOAuth composable (Plan 01 Task 9 / amendment §3.2).
//
// Wraps supabase.auth.signInWithOAuth for the Google provider. Exposes a typed
// StartResult (no thrown errors at the API boundary so the caller can map
// reasons to UI states without try/catch) and a reactive isStarting flag for
// button-disabled / spinner UX.
//
// The store also exposes `signInWithGoogle()` (un-deprecated per amendment
// §3.2) for backwards compat with the legacy LoginView / SignupView. The
// composable is the canonical entry point for new auth surfaces — it carries
// the /auth/callback redirect + offline-access queryParams that the post-W8a
// flow requires.

type StartResult = { ok: true } | { ok: false; reason: string }

export function useGoogleOAuth(): {
  start: () => Promise<StartResult>
  isStarting: Ref<boolean>
} {
  const isStarting = ref(false)

  async function start(): Promise<StartResult> {
    isStarting.value = true
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: { access_type: 'offline', prompt: 'consent' }
        }
      })
      if (error) return { ok: false, reason: error.message }
      return { ok: true }
    } finally {
      isStarting.value = false
    }
  }

  return { start, isStarting }
}
