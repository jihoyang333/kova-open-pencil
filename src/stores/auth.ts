import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { supabase } from '@/lib/supabase'
import { getRouter } from '@/router'

import type { AuthError, AuthResponse, Session, User } from '@supabase/supabase-js'

interface UserProfile {
  name: string | null
  onboarded: boolean
  plan: string
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

  let authSubscription: { unsubscribe: () => void } | null = null

  const isAuthenticated = computed(() => !!user.value)
  const isOnboarded = computed(() => profile.value?.onboarded ?? false)

  async function fetchProfile(): Promise<void> {
    if (!user.value) return

    const { data, error } = await supabase
      .from('users')
      .select('name, onboarded, plan')
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
    void getRouter().push('/login')
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
    initialize,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    fetchProfile,
    updateName,
    dispose
  }
})
