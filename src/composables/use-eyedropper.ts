import { computed } from 'vue'
import { IS_TAURI } from '@open-pencil/core'
import { useEyedropperStore } from '@/stores/eyedropper'
import { EYEDROPPER_NATIVE_TAURI } from '@/config/feature-flags'

/**
 * Eyedropper UI composable. MVP path is canvas-only via the store (Q20 lock).
 * The native screen-wide path is dormant behind EYEDROPPER_NATIVE_TAURI (default
 * false) and lazily imports the Tauri IPC so the web build carries no Tauri code.
 */
export function useEyedropper() {
  const store = useEyedropperStore()

  const isActive = computed(() => store.active)
  const sampledHex = computed(() => store.sampledHex)

  function activate(onSample: (hex: string) => void): void {
    if (EYEDROPPER_NATIVE_TAURI && IS_TAURI) {
      void sampleNative(onSample)
      return
    }
    // MVP canvas-only path (Q20 lock): overlay crosshair samples a canvas pixel.
    store.activate(onSample)
  }

  async function sampleNative(onSample: (hex: string) => void): Promise<void> {
    const { invoke } = await import('@tauri-apps/api/core')
    const hex = await invoke<string>('eyedropper_sample_screen')
    onSample(hex)
  }

  function cancel(): void {
    store.cancel()
  }

  return { isActive, sampledHex, activate, cancel }
}
