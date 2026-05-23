// PRD 04 §6.2.2 — useAccountStore.
//
// Profile draft + unsaved-changes tracking for the Profile section.
// State:
//   - original: server-side baseline (loaded once, refreshed after save)
//   - draft: editable copy that the form mutates
//   - isDirty: shallow inequality of original vs draft
// Actions: load(), patch(partial), save(), discard().

import { defineStore } from 'pinia'
import { computed, reactive, ref } from 'vue'

import { supabase } from '@/lib/supabase'

export interface ProfileDraft {
  name: string
  avatarStoragePath: string | null
  preferences: Record<string, unknown>
}

const EMPTY_DRAFT: ProfileDraft = {
  name: '',
  avatarStoragePath: null,
  preferences: {},
}

function clone(d: ProfileDraft): ProfileDraft {
  // JSON clone (not structuredClone): handles Vue reactive proxies + the
  // JSONB shape we persist; preferences are plain JSON-serializable per
  // PRD 04 schema (text/bool/number, no functions or class instances).
  return {
    name: d.name,
    avatarStoragePath: d.avatarStoragePath,
    preferences: JSON.parse(JSON.stringify(d.preferences)) as Record<string, unknown>,
  }
}

function shallowEqual(a: ProfileDraft, b: ProfileDraft): boolean {
  if (a.name !== b.name) return false
  if (a.avatarStoragePath !== b.avatarStoragePath) return false
  // JSON-equality for preferences (small, JSONB)
  try {
    return JSON.stringify(a.preferences) === JSON.stringify(b.preferences)
  } catch {
    return false
  }
}

export const useAccountStore = defineStore('account', () => {
  const original = ref<ProfileDraft>(clone(EMPTY_DRAFT))
  const draft = reactive<ProfileDraft>(clone(EMPTY_DRAFT))
  const isLoading = ref(false)
  const isSaving = ref(false)
  const error = ref<string | null>(null)

  const isDirty = computed(() => !shallowEqual(original.value, draft))

  async function load(): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user === null) {
        error.value = 'not_authenticated'
        return
      }
      const { data, error: dbErr } = await supabase
        .from('users')
        .select('name, avatar_storage_path, preferences')
        .eq('id', user.id)
        .maybeSingle()
      if (dbErr || data === null) {
        error.value = dbErr?.message ?? 'no_user_row'
        return
      }
      const next: ProfileDraft = {
        name: (data.name as string | null) ?? '',
        avatarStoragePath: (data.avatar_storage_path as string | null) ?? null,
        preferences: (data.preferences as Record<string, unknown> | null) ?? {},
      }
      original.value = clone(next)
      Object.assign(draft, clone(next))
    } finally {
      isLoading.value = false
    }
  }

  function patch(partial: Partial<ProfileDraft>): void {
    if (partial.name !== undefined) draft.name = partial.name
    if (partial.avatarStoragePath !== undefined) draft.avatarStoragePath = partial.avatarStoragePath
    if (partial.preferences !== undefined) draft.preferences = { ...partial.preferences }
  }

  async function save(): Promise<boolean> {
    if (!isDirty.value) return true
    isSaving.value = true
    error.value = null
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user === null) {
        error.value = 'not_authenticated'
        return false
      }
      const updates: Record<string, unknown> = {}
      if (draft.name !== original.value.name) updates.name = draft.name
      if (draft.avatarStoragePath !== original.value.avatarStoragePath) {
        updates.avatar_storage_path = draft.avatarStoragePath
      }
      if (JSON.stringify(draft.preferences) !== JSON.stringify(original.value.preferences)) {
        updates.preferences = draft.preferences
      }
      const { error: dbErr } = await supabase.from('users').update(updates).eq('id', user.id)
      if (dbErr) {
        error.value = dbErr.message
        return false
      }
      original.value = clone(draft)
      return true
    } finally {
      isSaving.value = false
    }
  }

  function discard(): void {
    Object.assign(draft, clone(original.value))
  }

  function $reset(): void {
    original.value = clone(EMPTY_DRAFT)
    Object.assign(draft, clone(EMPTY_DRAFT))
    isLoading.value = false
    isSaving.value = false
    error.value = null
  }

  return {
    original,
    draft,
    isLoading,
    isSaving,
    error,
    isDirty,
    load,
    patch,
    save,
    discard,
    $reset,
  }
})
