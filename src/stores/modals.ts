import { defineStore } from 'pinia'
import { ref } from 'vue'

// Cluster 12 — global modal singletons. Hosting these in a Pinia store
// (rather than module-scoped refs) keeps modal state inspectable via Vue
// Devtools and consistent with usePreferencesStore + useUIStateStore.
//
// Modes are kept as a union per modal so adding a new section later is a
// type-only change.

export type PreferencesMode = 'accessibility'

export const useModalsStore = defineStore('modals', () => {
  const preferencesOpen = ref(false)
  const preferencesMode = ref<PreferencesMode>('accessibility')

  function openPreferences(m: PreferencesMode = 'accessibility'): void {
    preferencesMode.value = m
    preferencesOpen.value = true
  }

  function closePreferences(): void {
    preferencesOpen.value = false
  }

  return {
    preferencesOpen,
    preferencesMode,
    openPreferences,
    closePreferences,
  }
})
