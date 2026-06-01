import { ref, computed, watch } from 'vue'
import { CAMERA_PAN } from '@/constants/overlays'
import { useEditorStore } from '@/stores/editor'
import { useFindStore } from '@/stores/find'

/**
 * Animated camera pan for find focus mode (PRD §12.12).
 *
 * Adapted per handoff R: the plan's `figma.viewport` / `figma.getNodeById` are fictional.
 * Real camera state is the editor store's `state.{panX,panY,zoom}` (screen = canvas *
 * zoom + pan). We tween those three over `CAMERA_PAN.DURATION_MS` with an ease-out cubic,
 * centering the node and fitting it with `PADDING_PCT` padding. Watches the find store's
 * `focusedNodeId` so a single match auto-pans. Scroll/RAF based — no gesture library.
 */
const MIN_ZOOM = 0.02
const MAX_ZOOM = 256

// cubic-bezier(0.4, 0, 0.2, 1) ≈ ease-out cubic
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

function clampZoom(zoom: number): number {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom))
}

export function useCameraPan() {
  const editor = useEditorStore()
  const findStore = useFindStore()

  // Per-instance animation state (audit L3 — was module-level, fragile if ever
  // instantiated more than once). EditorView creates exactly one, but keeping the
  // state local makes the composable reentrant by construction.
  const animating = ref(false)
  let currentRAF: number | null = null
  let cancelToken = 0
  // Resolves the in-flight pan so a superseding pan (whose cancel() stops the RAF
  // before the next step runs) never leaves the previous promise dangling.
  let pendingResolve: (() => void) | null = null

  const isAnimating = computed(() => animating.value)

  function cancel(): void {
    if (currentRAF !== null) {
      cancelAnimationFrame(currentRAF)
      currentRAF = null
    }
    cancelToken += 1
    animating.value = false
    if (pendingResolve !== null) {
      const resolve = pendingResolve
      pendingResolve = null
      resolve()
    }
  }

  function panToNode(nodeId: string): Promise<void> {
    cancel()
    const myToken = ++cancelToken

    const node = editor.graph.getNode(nodeId)
    if (!node) return Promise.resolve()

    const abs = editor.graph.getAbsolutePosition(nodeId)
    const centerX = abs.x + node.width / 2
    const centerY = abs.y + node.height / 2

    const viewW = window.innerWidth
    const viewH = window.innerHeight
    const pad = 1 - CAMERA_PAN.PADDING_PCT / 100
    const targetZoom = clampZoom(
      Math.min((viewW * pad) / node.width, (viewH * pad) / node.height)
    )
    const targetPanX = viewW / 2 - centerX * targetZoom
    const targetPanY = viewH / 2 - centerY * targetZoom

    const startPanX = editor.state.panX
    const startPanY = editor.state.panY
    const startZoom = editor.state.zoom
    const startTime = performance.now()

    return new Promise<void>((resolve) => {
      animating.value = true
      pendingResolve = resolve

      function step(now: number): void {
        if (myToken !== cancelToken) return // superseded — cancel() resolved us already
        const t = Math.min(1, (now - startTime) / CAMERA_PAN.DURATION_MS)
        const eased = easeOutCubic(t)
        editor.state.panX = startPanX + (targetPanX - startPanX) * eased
        editor.state.panY = startPanY + (targetPanY - startPanY) * eased
        editor.state.zoom = startZoom + (targetZoom - startZoom) * eased
        editor.requestRepaint()
        if (t < 1) {
          currentRAF = requestAnimationFrame(step)
        } else {
          animating.value = false
          currentRAF = null
          pendingResolve = null
          resolve()
        }
      }

      currentRAF = requestAnimationFrame(step)
    })
  }

  // Auto-pan when find narrows to a single focused node.
  watch(
    () => findStore.focusedNodeId,
    (id) => {
      if (id !== null) void panToNode(id)
    }
  )

  return { panToNode, cancel, isAnimating }
}
