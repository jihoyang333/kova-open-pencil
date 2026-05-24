import { computed, type ComputedRef } from 'vue'
import { useModalsStore, type PreferencesMode } from '@/stores/modals'

// Backwards-compatible facade over useModalsStore so existing call sites
// (`usePreferencesModal().open(...)`, `usePreferencesModal().close()`) keep
// working. New code should reach for useModalsStore directly.

export function usePreferencesModal(): {
  isOpen: ComputedRef<boolean>
  mode: ComputedRef<PreferencesMode>
  open: (m?: PreferencesMode) => void
  close: () => void
} {
  const store = useModalsStore()
  return {
    isOpen: computed(() => store.preferencesOpen),
    mode: computed(() => store.preferencesMode),
    open: (m: PreferencesMode = 'accessibility') => store.openPreferences(m),
    close: () => store.closePreferences(),
  }
}

export type { PreferencesMode }
