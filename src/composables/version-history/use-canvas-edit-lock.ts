import { readonly, ref } from 'vue'
import { captureBrowserException } from '@/sentry'

// W4 C-MED25 / PRD §12.12 — single-owner edit lock. The version-history panel is the
// sole lock holder while previewing/restoring. Boolean (not ref-counted) so a stuck
// lock from mismatched lock/unlock pairs surfaces loudly instead of hiding behind a
// counter. A double-lock warns + Sentry-captures the contention.
const isLockedInternal = ref(false)
const isLocked = readonly(isLockedInternal)

export function useCanvasEditLock() {
  function lock(): void {
    if (isLockedInternal.value) {
      const msg = 'useCanvasEditLock: lock() called while already locked (single-owner contract violated)'
      console.warn(msg)
      captureBrowserException(new Error(msg))
      return
    }
    isLockedInternal.value = true
  }
  function unlock(): void {
    isLockedInternal.value = false
  }
  return { lock, unlock, isLocked }
}
