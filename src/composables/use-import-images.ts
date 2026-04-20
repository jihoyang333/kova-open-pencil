import { onMounted, onUnmounted } from 'vue'

import { toast } from '@/composables/use-toast'

import type { EditorStore } from '@/stores/editor'

const STORAGE_KEY = 'kova-import-images'
const CANVAS_READY_TIMEOUT_MS = 15_000

interface ImportedImage {
  url: string
  fileName: string
  fileType: string
}

function isValidImage(value: unknown): value is ImportedImage {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<string, unknown>).url === 'string' &&
    typeof (value as Record<string, unknown>).fileName === 'string' &&
    typeof (value as Record<string, unknown>).fileType === 'string'
  )
}

/**
 * Consumes images queued in sessionStorage by the brand assets "Import to canvas" flow.
 * Waits for CanvasKit to be ready, fetches each image as a blob, converts to File,
 * and places on the canvas center.
 */
export function useImportImages(store: EditorStore): void {
  let cancelled = false
  const abortController = new AbortController()

  onUnmounted(() => {
    cancelled = true
    abortController.abort()
  })

  /**
   * Waits for the canvas element to be fully initialized (CanvasKit WASM loaded + renderer created).
   * use-canvas.ts sets `data-ready="1"` after `setCanvasKit()` completes.
   * Resolves to null on timeout or component unmount.
   */
  function waitForCanvasReady(): Promise<HTMLCanvasElement | null> {
    return new Promise((resolve) => {
      const deadline = Date.now() + CANVAS_READY_TIMEOUT_MS

      function check() {
        if (cancelled) return resolve(null)
        const el = document.querySelector<HTMLCanvasElement>('canvas[data-ready]')
        if (el) return resolve(el)
        if (Date.now() > deadline) return resolve(null)
        requestAnimationFrame(check)
      }

      check()
    })
  }

  onMounted(async () => {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return

    // Always consume — the user explicitly clicked "Import to canvas".
    // If placement fails, they can re-trigger from the brand assets panel.
    sessionStorage.removeItem(STORAGE_KEY)

    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      return
    }

    if (!Array.isArray(parsed)) return

    const images = parsed.filter(isValidImage)
    if (images.length === 0) return

    try {
      // Wait for CanvasKit readiness and fetch images in parallel for best performance
      const [canvasEl, fetchSettled] = await Promise.all([
        waitForCanvasReady(),
        Promise.allSettled(
          images.map(async (img) => {
            const response = await fetch(img.url, {
              signal: abortController.signal
            })
            if (!response.ok) throw new Error(`Failed to fetch ${img.fileName}`)
            const blob = await response.blob()
            return new File([blob], img.fileName, { type: img.fileType })
          })
        )
      ])

      if (cancelled) return

      if (!canvasEl) {
        toast.show('Canvas failed to initialize', 'error')
        return
      }

      const files = fetchSettled
        .filter((r): r is PromiseFulfilledResult<File> => r.status === 'fulfilled')
        .map((r) => r.value)

      if (files.length === 0) {
        toast.show('Failed to load imported images', 'error')
        return
      }

      const rect = canvasEl.getBoundingClientRect()
      const screenCx = rect.left + rect.width / 2
      const screenCy = rect.top + rect.height / 2
      const { x: cx, y: cy } = store.screenToCanvas(screenCx, screenCy)

      await store.placeImageFiles(files, cx, cy)

      const failed = fetchSettled.filter((r) => r.status === 'rejected').length
      if (failed > 0) {
        toast.show(`Placed ${files.length} image(s), ${failed} failed to load`, 'warning')
      }
    } catch {
      if (!cancelled) {
        toast.show('Failed to import images', 'error')
      }
    }
  })
}
