/**
 * editor-bus — typed editor-scoped event bus.
 *
 * Plan 06 §1665 contract: defines the payload shapes consumed by Cluster 09
 * (version history) + future siblings. Cluster 06 ships the type interface
 * + the singleton so consumers can wire without coupling to Cluster 06's
 * internals.
 *
 * Payload shapes are stable; new events MUST be added at the bottom of
 * `EditorEvents` (append-only) to mirror the Kiwi schema tag convention from
 * `packages/core/`. Renaming or renumbering existing events breaks the
 * cross-cluster handshake.
 *
 * Usage:
 *   editorBus.on('editor:open-version-history', ({ canvasId, brandId }) => { ... })
 *   editorBus.emit('editor:save-version-snapshot', { canvasId, brandId })
 */

export interface EditorEvents {
  /** File menu → "Show version history". Cluster 09 mounts the panel. */
  'editor:open-version-history': { canvasId: string; brandId: string }
  /** File menu → "Save current version" (manual snapshot). */
  'editor:save-version-snapshot': { canvasId: string; brandId: string }
}

export type EditorEventName = keyof EditorEvents
export type EditorEventHandler<K extends EditorEventName> = (payload: EditorEvents[K]) => void

interface EditorBus {
  on<K extends EditorEventName>(event: K, handler: EditorEventHandler<K>): () => void
  off<K extends EditorEventName>(event: K, handler: EditorEventHandler<K>): void
  emit<K extends EditorEventName>(event: K, payload: EditorEvents[K]): void
  /** Test-only: drop all subscribers. */
  clear(): void
}

function createEditorBus(): EditorBus {
  const handlers = new Map<EditorEventName, Set<(payload: unknown) => void>>()

  function on<K extends EditorEventName>(event: K, handler: EditorEventHandler<K>): () => void {
    let set = handlers.get(event)
    if (!set) {
      set = new Set()
      handlers.set(event, set)
    }
    set.add(handler as (payload: unknown) => void)
    return () => off(event, handler)
  }

  function off<K extends EditorEventName>(event: K, handler: EditorEventHandler<K>): void {
    const set = handlers.get(event)
    if (!set) return
    set.delete(handler as (payload: unknown) => void)
    if (set.size === 0) handlers.delete(event)
  }

  function emit<K extends EditorEventName>(event: K, payload: EditorEvents[K]): void {
    const set = handlers.get(event)
    if (!set) return
    for (const handler of set) handler(payload)
  }

  function clear(): void {
    handlers.clear()
  }

  return { on, off, emit, clear }
}

export const editorBus: EditorBus = createEditorBus()
