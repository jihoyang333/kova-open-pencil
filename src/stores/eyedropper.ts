import { defineStore } from 'pinia'
import { ref } from 'vue'

type SampleCallback = (hex: string) => void

/**
 * Canvas-only eyedropper sampling state (PRD 07b §12.9 Q20-locked for MVP).
 * Native screen-wide sampling is gated behind EYEDROPPER_NATIVE_TAURI (Phase 2).
 */
export const useEyedropperStore = defineStore('eyedropper', () => {
  const active = ref(false)
  const sampledHex = ref<string | null>(null)
  const callback = ref<SampleCallback | null>(null)

  function activate(onSample: SampleCallback): void {
    active.value = true
    callback.value = onSample
  }

  function sample(hex: string): void {
    sampledHex.value = hex
    if (callback.value) callback.value(hex)
    active.value = false
    callback.value = null
  }

  function cancel(): void {
    active.value = false
    callback.value = null
  }

  return { active, sampledHex, activate, sample, cancel }
})
