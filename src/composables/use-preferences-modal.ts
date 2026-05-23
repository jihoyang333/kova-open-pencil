import { readonly, ref, type Ref } from 'vue'

type PreferencesMode = 'accessibility'

const isOpen = ref(false)
const mode = ref<PreferencesMode>('accessibility')

export function usePreferencesModal() {
  function open(m: PreferencesMode = 'accessibility'): void {
    mode.value = m
    isOpen.value = true
  }
  function close(): void {
    isOpen.value = false
  }
  return {
    isOpen: readonly(isOpen) as Readonly<Ref<boolean>>,
    mode: readonly(mode) as Readonly<Ref<PreferencesMode>>,
    open,
    close,
  }
}
