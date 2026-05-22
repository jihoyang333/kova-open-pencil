import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { supabase } from '@/lib/supabase'
import { getRouter } from '@/router'

import type { AuthError, AuthResponse, Session, User } from '@supabase/supabase-js'

interface UserProfile {
  name: string | null
  onboarded: boolean
  plan: string
  // C-LOW01.5: `deleted_at` is REVOKEd from authenticated role at the column
  // level, so a direct SELECT returns null even when the row carries a value.
  // Surfacing it here keeps the typing honest for any caller that has
  // service-role context (e.g. server-side hydration).
  deleted_at: string | null
}

function isUserProfile(data: unknown): data is UserProfile {
  return (
    typeof data === 'object' &&
    data !== null &&
    'onboarded' in data &&
    typeof (data as Record<string, unknown>).onboarded === 'boolean' &&
    'plan' in data &&
    typeof (data as Record<string, unknown>).plan === 'string'
  )
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const session = ref<Session | null>(null)
  const profile = ref<UserProfile | null>(null)
  const isLoading = ref(true)
  // W8a Cluster 01 — populated by requestAccountDeletion() after the Edge
  // Function returns the 30-day scheduled-purge timestamp. Cleared by
  // restoreAccount() on success. Persists across page reloads only via the
  // server (deleted_at on users) — the client-side ref re-hydrates on next
  // fetchProfile() call.
  const pendingDeletionState = ref<{ scheduled_purge_at: string } | null>(null)

  let authSubscription: { unsubscribe: () => void } | null = null

  const isAuthenticated = computed(() => !!user.value)
  const isOnboarded = computed(() => profile.value?.onboarded ?? false)
  // W8a Cluster 01 — deleted_at column gated by RLS; client typically sees null.
  // The server-side requestAccountDeletion path also sets pendingDeletionState,
  // so consumers should OR both sources.
  const pendingDeletion = computed(
    () => Boolean(profile.value?.deleted_at) || pendingDeletionState.value !== null
  )
  const scheduledPurgeAt = computed(() => pendingDeletionState.value?.scheduled_purge_at ?? null)

  async function fetchProfile(): Promise<void> {
    if (!user.value) return

    const { data, error } = await supabase
      .from('users')
      .select('name, onboarded, plan, deleted_at')
      .eq('id', user.value.id)
      .single()

    if (error) {
      console.error('Failed to fetch user profile:', error.message)
      return
    }

    if (!isUserProfile(data)) {
      console.error('Invalid user profile shape:', data)
      return
    }

    profile.value = data
  }

  async function initialize(): Promise<void> {
    try {
      const { data, error } = await supabase.auth.getSession()

      if (error) {
        console.error('Failed to get session:', error.message)
      } else if (data.session) {
        session.value = data.session
        user.value = data.session.user
        await fetchProfile()
      }
    } catch (err) {
      console.error('Auth initialization error:', err)
    } finally {
      isLoading.value = false
    }

    const { data } = supabase.auth.onAuthStateChange(
      (event: string, newSession: Session | null) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          session.value = newSession
          user.value = newSession?.user ?? null
          if (newSession?.user) {
            void fetchProfile()
          }
        } else if (event === 'SIGNED_OUT') {
          session.value = null
          user.value = null
          profile.value = null
        }
      }
    )
    authSubscription = data.subscription
  }

  async function signIn(email: string, password: string): Promise<{ error: AuthError | null }> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    if (!error && data.session) {
      session.value = data.session
      user.value = data.session.user
      await fetchProfile()
    }
    return { error }
  }

  async function signUp(email: string, password: string): Promise<AuthResponse> {
    const { data, error } = await supabase.auth.signUp({ email, password })
    return { data, error }
  }

  async function signInWithGoogle(): Promise<{ error: AuthError | null }> {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    })
    return { error }
  }

  async function signOut(): Promise<void> {
    await supabase.auth.signOut()
    session.value = null
    user.value = null
    profile.value = null
    pendingDeletionState.value = null
    void getRouter().push('/login')
  }

  // W8a Cluster 01 — GDPR Art. 17 entry point. Calls the Edge Function,
  // captures the 30-day scheduled-purge timestamp, then signs the user out
  // client-side (the server also signs them out, but we double-sure here so
  // the SPA doesn't keep stale session state).
  async function requestAccountDeletion(): Promise<void> {
    const res = await fetch('/api/account/deletion-request', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.value?.access_token ?? ''}`,
        'X-Idempotency-Key': crypto.randomUUID().replace(/-/g, ''),
      },
    })
    if (!res.ok) {
      throw new Error(`deletion-request failed: ${res.status}`)
    }
    const body = (await res.json()) as { scheduled_purge_at?: string }
    if (body.scheduled_purge_at) {
      pendingDeletionState.value = { scheduled_purge_at: body.scheduled_purge_at }
    }
    await supabase.auth.signOut()
  }

  // W8a Cluster 01 — restore within 30-day window. Returns true on success,
  // false on 409 (no_pending_deletion). Throws on 401/500.
  async function restoreAccount(): Promise<boolean> {
    const res = await fetch('/api/account/restore', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.value?.access_token ?? ''}` },
    })
    if (res.status === 200) {
      pendingDeletionState.value = null
      await fetchProfile()
      return true
    }
    if (res.status === 409) return false
    throw new Error(`restore failed: ${res.status}`)
  }

  async function updateName(newName: string): Promise<void> {
    if (!user.value) return
    const { error } = await supabase.from('users').update({ name: newName }).eq('id', user.value.id)
    if (error) throw error
    if (profile.value) {
      profile.value = { ...profile.value, name: newName }
    }
  }

  function dispose(): void {
    authSubscription?.unsubscribe()
  }

  return {
    user,
    session,
    profile,
    isLoading,
    isAuthenticated,
    isOnboarded,
    pendingDeletion,
    scheduledPurgeAt,
    initialize,
    // DEPRECATED — kept for M5-era callers (LoginView, SignupView, NameStep,
    // BrandSettingsView, AccountMenu, useOnboardingComplete). Tasks 17+ rewrite
    // these views around magic-link composables; the deprecated methods retire
    // when those callers no longer reference them.
    signIn,
    signUp,
    signInWithGoogle,
    updateName,
    // New surface (W8a Cluster 01 — GDPR cascade + magic-link era):
    signOut,
    fetchProfile,
    requestAccountDeletion,
    restoreAccount,
    dispose,
  }
})
