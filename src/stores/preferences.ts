import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { DEFAULTS, mergeWithDefaults, type UserPreferences } from '@/types/preferences'

export const usePreferencesStore = defineStore('preferences', () => {
  const prefs = ref<UserPreferences>(structuredClone(DEFAULTS))
  const loaded = ref(false)
  const loadError = ref<Error | null>(null)
  const lastWriteError = ref<Error | null>(null)
  const explicitAccessibilityKeys = ref<Set<string>>(new Set())

  async function load(): Promise<void> {
    const auth = useAuthStore()
    const userId = auth.user?.id
    if (!userId) {
      prefs.value = structuredClone(DEFAULTS)
      loaded.value = true
      applyToDom(prefs.value)
      return
    }
    const { data, error } = await supabase
      .from('users')
      .select('preferences')
      .eq('id', userId)
      .single()
    if (error) {
      loadError.value = error as unknown as Error
      loaded.value = true
      applyToDom(prefs.value)
      return
    }
    const raw = ((data as { preferences?: unknown } | null)?.preferences ?? {}) as Record<
      string,
      unknown
    >
    const rawAccessibility = (raw['accessibility'] ?? {}) as Record<string, unknown>
    explicitAccessibilityKeys.value = new Set(Object.keys(rawAccessibility))
    prefs.value = mergeWithDefaults(raw, DEFAULTS)
    loaded.value = true
    applyToDom(prefs.value)
  }

  // Optimistic write with rollback. We snapshot the prior prefs object
  // before applying the local update, then debounce the RPC. On RPC failure
  // we revert prefs + DOM to the snapshot so the user doesn't see state
  // that disagrees with persistence. L14 surface lastWriteError in the
  // modal footer so the user can retry.
  const debouncedWrite = useDebounceFn(
    async (
      path: string[],
      value: unknown,
      prior: UserPreferences,
    ): Promise<void> => {
      // supabase-js auto-JSON-encodes RPC args; do NOT pre-stringify or values
      // round-trip back double-quoted (e.g. 'large' → '"large"').
      const { error } = await supabase.rpc('update_user_pref', {
        p_path: path,
        p_value: value,
      })
      if (error) {
        const err = error as unknown as Error
        lastWriteError.value = err
        loadError.value = err
        prefs.value = prior
        applyToDom(prior)
        return
      }
      lastWriteError.value = null
    },
    1000,
  )

  // JSON round-trip deep clone. Preferences are JSON-safe by design
  // (primitives + plain objects only — no Maps/Sets/Dates/functions) so
  // JSON is faster than structuredClone and immune to Pinia/Vue reactive
  // Proxy targets that structuredClone refuses via DataCloneError.
  function deepClone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T
  }

  function set<K extends keyof UserPreferences>(key: K, value: UserPreferences[K]): void {
    const prior = deepClone(prefs.value)
    prefs.value = { ...prefs.value, [key]: deepClone(value) }
    if (key === 'accessibility' && value && typeof value === 'object') {
      // Whole-group writes mark every accessibility key explicit.
      for (const k of Object.keys(value)) explicitAccessibilityKeys.value.add(k)
    }
    applyToDom(prefs.value)
    void debouncedWrite([key as string], value, prior)
  }

  function setPath(path: string[], value: unknown): void {
    const prior = deepClone(prefs.value)
    // Deep-clone the incoming value so a caller mutating the original
    // object reference can't ghost-edit the store state.
    const cloned =
      value !== null && typeof value === 'object' ? deepClone(value) : value
    prefs.value = setIn(prefs.value, path, cloned) as UserPreferences
    if (path[0] === 'accessibility' && path.length >= 2) {
      explicitAccessibilityKeys.value.add(path[1])
    }
    applyToDom(prefs.value)
    void debouncedWrite(path, cloned, prior)
  }

  function hasExplicitAccessibilityKey(key: string): boolean {
    return explicitAccessibilityKeys.value.has(key)
  }

  function reset(): void {
    prefs.value = structuredClone(DEFAULTS)
    explicitAccessibilityKeys.value = new Set()
    loaded.value = false
    loadError.value = null
    lastWriteError.value = null
    applyToDom(prefs.value)
  }

  function applyToDom(p: UserPreferences): void {
    if (typeof document === 'undefined') return
    const html = document.documentElement
    html.dataset['textSize'] = p.accessibility.textSize
    html.dataset['reduceMotion'] = String(p.accessibility.reduceMotion)
    html.dataset['highContrast'] = String(p.accessibility.highContrast)
  }

  const accessibility = computed(() => prefs.value.accessibility)
  const view = computed(() => prefs.value.view)
  const notifications = computed(() => prefs.value.notifications)
  const ai = computed(() => prefs.value.ai)
  const snap = computed(() => prefs.value.snap)
  const defaults = computed(() => prefs.value.defaults)

  return {
    prefs,
    loaded,
    loadError,
    lastWriteError,
    accessibility,
    view,
    notifications,
    ai,
    snap,
    defaults,
    load,
    set,
    setPath,
    hasExplicitAccessibilityKey,
    reset,
  }
})

function setIn<T>(obj: T, path: string[], value: unknown): T {
  if (path.length === 0) return value as T
  const head = path[0]
  const rest = path.slice(1)
  const source = obj as Record<string, unknown>
  const current = (source[head] ?? {}) as Record<string, unknown>
  return {
    ...source,
    [head]: setIn(current, rest, value),
  } as T
}
