import { usePreferencesStore } from '@/stores/preferences'

/**
 * One-shot OS-cue tick. On first ever load (no `accessibility.reduceMotion`
 * key in the server blob), default reduceMotion = true if the OS media query
 * reports `prefers-reduced-motion: reduce`. Subsequent loads honor the user
 * choice.
 */
export function applyReducedMotionDefault(): void {
  const store = usePreferencesStore()
  if (!store.loaded) return
  if (store.hasExplicitAccessibilityKey('reduceMotion')) return
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    store.setPath(['accessibility', 'reduceMotion'], true)
  }
}
