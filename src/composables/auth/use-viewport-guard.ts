import { computed, onMounted, onUnmounted, ref } from 'vue'
import type { ComputedRef } from 'vue'

// W8a Cluster 01 — useViewportGuard composable (Plan 01 Task 12.4).
//
// Reactive viewport width tracker. Drives DesktopOnlyView's primary
// (mobile <640px) vs tablet-edge (640–1023px) layouts AND the
// auto-rotate-and-reload behavior (§12.9): when a tablet rotates to
// landscape ≥1024px, isDesktop flips true and the consumer can reload
// into the originally-requested route.

const DESKTOP_MIN = 1024
const TABLET_MIN = 640

export function useViewportGuard(): {
  isDesktop: ComputedRef<boolean>
  isTablet: ComputedRef<boolean>
  isMobile: ComputedRef<boolean>
} {
  const width = ref(typeof window !== 'undefined' ? window.innerWidth : DESKTOP_MIN)

  function onResize(): void {
    width.value = window.innerWidth
  }

  onMounted(() => {
    if (typeof window === 'undefined') return
    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onResize)
  })

  onUnmounted(() => {
    if (typeof window === 'undefined') return
    window.removeEventListener('resize', onResize)
    window.removeEventListener('orientationchange', onResize)
  })

  return {
    isDesktop: computed(() => width.value >= DESKTOP_MIN),
    isTablet: computed(() => width.value >= TABLET_MIN && width.value < DESKTOP_MIN),
    isMobile: computed(() => width.value < TABLET_MIN),
  }
}
