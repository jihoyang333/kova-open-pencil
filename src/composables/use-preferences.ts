import { computed, type WritableComputedRef } from 'vue'
import { usePreferencesStore } from '@/stores/preferences'
import type { UserPreferences } from '@/types/preferences'

export function usePreference<K extends keyof UserPreferences>(
  key: K,
): WritableComputedRef<UserPreferences[K]> {
  const store = usePreferencesStore()
  return computed<UserPreferences[K]>({
    get: () => store.prefs[key],
    set: (next) => store.set(key, next),
  })
}

export function usePreferencePath<T>(path: readonly string[]): WritableComputedRef<T> {
  const store = usePreferencesStore()
  return computed<T>({
    get: () =>
      path.reduce<unknown>(
        (acc, k) => (acc as Record<string, unknown> | undefined)?.[k],
        store.prefs,
      ) as T,
    set: (next) => store.setPath([...path], next),
  })
}
