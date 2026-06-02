import { computed, ref, watch, type Ref } from 'vue'
import { useSnapshotsStore, type SnapshotKind } from '@/stores/snapshots'
import { useEditorStore } from '@/stores/editor'
import { useCanvasesStore } from '@/stores/canvases'

const DEFAULT_INTERVAL_MS = 30 * 60 * 1000 // 30 min (Figma-exact)

// FNV-1a hash of the serialized snapshot bytes — a cheap change signal so an idle
// canvas does not pile up identical autosaves against the 100 MB quota.
function hashBytes(bytes: Uint8Array): number {
  let h = 0x811c9dc5
  for (const b of bytes) {
    h ^= b
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

export function useAutosnapshot(
  canvasId: Ref<string>,
  opts: { intervalMs?: number; isActive?: Ref<boolean> } = {},
) {
  const store = useSnapshotsStore()
  const canvases = useCanvasesStore()
  // Editor is a singleton provided at canvas-mount; resolve it lazily so this
  // composable can be created before the editor is active.
  const getEditor = () => useEditorStore()
  const intervalMs = opts.intervalMs ?? DEFAULT_INTERVAL_MS
  const isActive = opts.isActive ?? ref(true)

  const paused = ref(false)
  const lastHash = ref<number | null>(null)
  const lastSnapAt = ref<Date | null>(null)
  let handle: ReturnType<typeof setInterval> | null = null
  let stopTrashWatch: (() => void) | null = null

  function isTrashed(): boolean {
    const list = canvases.canvases as Array<{ id: string; trashed_at: string | null }> | undefined
    return !!list?.find((c) => c.id === canvasId.value)?.trashed_at
  }

  async function attemptSnap(kind: SnapshotKind): Promise<void> {
    const bytes = await getEditor().serializeSnapshot()
    if (kind === 'autosave') {
      const h = hashBytes(bytes)
      if (h === lastHash.value) return // unchanged since last snap
    }
    const res = await store.create({ canvasId: canvasId.value, kind })
    if (res.ok) {
      lastHash.value = hashBytes(bytes)
      lastSnapAt.value = new Date()
    }
  }

  // Exposed for deterministic testing (no fake timers needed).
  async function tick(): Promise<void> {
    if (paused.value || !isActive.value || !navigator.onLine || isTrashed()) return
    await attemptSnap('autosave')
  }

  const onBlur = () => { paused.value = true }
  const onFocus = () => { paused.value = false }
  const onOffline = () => { void attemptSnap('disconnect') }
  const onBeforeUnload = () => { void attemptSnap('tab_close') }

  function start(): void {
    handle = setInterval(() => void tick(), intervalMs)
    window.addEventListener('blur', onBlur)
    window.addEventListener('focus', onFocus)
    window.addEventListener('offline', onOffline)
    window.addEventListener('beforeunload', onBeforeUnload)
    stopTrashWatch = watch(
      () => isTrashed(),
      (trashed) => { if (trashed) stop() },
    )
  }

  function stop(): void {
    if (handle) { clearInterval(handle); handle = null }
    window.removeEventListener('blur', onBlur)
    window.removeEventListener('focus', onFocus)
    window.removeEventListener('offline', onOffline)
    window.removeEventListener('beforeunload', onBeforeUnload)
    stopTrashWatch?.()
    stopTrashWatch = null
  }

  return { start, stop, tick, paused, lastSnapAt: computed(() => lastSnapAt.value) }
}
