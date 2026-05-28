/**
 * useCanvasDrop — Cluster 06 Task 8 (extends M5 image-file drop).
 *
 * Dispatches on the 5 Cluster-05 brand-kit MIME types per PRD 06 §6.5:
 *   application/x-kova-brand-color
 *   application/x-kova-brand-font
 *   application/x-kova-brand-asset
 *   application/x-kova-saved-block
 *   application/x-kova-tone-snippet
 *
 * Existing image-file drop (M5) is preserved as the fallback path.
 * dropTargetAction is set on dragover so Cluster 07b's hover-overlay can
 * render a ghost preview + label.
 */
import { useEventListener } from '@vueuse/core'
import { ref, type Ref } from 'vue'
import * as v from 'valibot'

import type { EditorStore } from '@/stores/editor'
import {
  DRAG_MIME,
  BrandColorPayloadSchema,
  BrandFontPayloadSchema,
  BrandAssetPayloadSchema,
  SavedBlockPayloadSchema,
  ToneSnippetPayloadSchema,
} from '@/types/drag-payload'

const ACCEPTED_FILE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/avif',
])

const KOVA_MIME_TYPES = new Set<string>(Object.values(DRAG_MIME))

const FILL_SUPPORTING_TYPES = new Set([
  'FRAME',
  'GROUP',
  'COMPONENT',
  'COMPONENT_SET',
  'RECTANGLE',
  'ELLIPSE',
  'POLYGON',
  'STAR',
  'LINE',
  'TEXT',
  'VECTOR',
])

export interface CanvasDropContext {
  /** Pointer position in canvas coordinates (after screenToCanvas). */
  x: number
  y: number
  /** Hit-tested node under pointer, or null if drop is on empty canvas. */
  target: { id: string; type: string } | null
  /** Modifier keys at the moment of drop. */
  modifiers: { shift: boolean; alt: boolean }
}

export interface CanvasDropHandlers {
  handleDrop: (e: DragEvent) => Promise<void>
  handleDragOver: (e: DragEvent) => void
  handleDragLeave: (e: DragEvent) => void
}

/**
 * Pure handlers — testable in isolation. Wired to DOM by useCanvasDrop below.
 * Pass a minimal store-like adapter so tests can mock without booting the full
 * SceneGraph.
 */
export interface DropEditorAdapter {
  screenToCanvas: (sx: number, sy: number) => { x: number; y: number }
  hitTestAt: (cx: number, cy: number) => { id: string; type: string } | null
  /** Apply a partial update to an existing node with undo. */
  updateNode: (id: string, changes: Record<string, unknown>) => void
  /** Read the current fills array from a node (for additive operations). */
  readFills: (id: string) => unknown[]
  /** Spawn a RECTANGLE on empty canvas. Returns the new node id. */
  spawnRect: (x: number, y: number, w: number, h: number, fillHex: string) => string
  /** Spawn a TEXT node. Returns the new node id. */
  spawnText: (
    x: number,
    y: number,
    content: string,
    extras?: { fontFamily?: string; parentId?: string }
  ) => string
  /** Spawn an IMAGE node (or fill-as-image equivalent). Returns the new node id. */
  spawnImage: (x: number, y: number, url: string) => string
  /** Look up a node's bounding box for footer-snap logic. */
  getBounds: (id: string) => { x: number; y: number; w: number; h: number } | null
  /** Set the drop-target action so Cluster 07b can render hover preview. */
  setDropTarget: (id: string | null, action: string | null) => void
  /** Clear the drop-target after handling. */
  clearDropTarget: () => void
}

export function createCanvasDropHandlers(
  editor: DropEditorAdapter,
  options: { canvasRef?: Ref<HTMLCanvasElement | null> } = {}
): CanvasDropHandlers {
  function buildContext(e: DragEvent): CanvasDropContext {
    let sx = e.clientX
    let sy = e.clientY
    const canvas = options.canvasRef?.value
    if (canvas) {
      const rect = canvas.getBoundingClientRect()
      sx = e.clientX - rect.left
      sy = e.clientY - rect.top
    }
    const { x, y } = editor.screenToCanvas(sx, sy)
    return {
      x,
      y,
      target: editor.hitTestAt(x, y),
      modifiers: { shift: e.shiftKey, alt: e.altKey },
    }
  }

  async function handleDrop(e: DragEvent): Promise<void> {
    if (!e.dataTransfer) return
    const types = Array.from(e.dataTransfer.types)

    // Dispatch on first matching MIME type. Order matters only for ambiguous
    // drops; in practice each drop carries exactly one Kova MIME.
    if (types.includes(DRAG_MIME.COLOR)) {
      await handleColorDrop(e, editor, buildContext(e))
      return
    }
    if (types.includes(DRAG_MIME.FONT)) {
      await handleFontDrop(e, editor, buildContext(e))
      return
    }
    if (types.includes(DRAG_MIME.ASSET)) {
      await handleAssetDrop(e, editor, buildContext(e))
      return
    }
    if (types.includes(DRAG_MIME.SAVED_BLOCK)) {
      await handleSavedBlockDrop(e, editor, buildContext(e))
      return
    }
    if (types.includes(DRAG_MIME.TONE_SNIPPET)) {
      await handleToneSnippetDrop(e, editor, buildContext(e))
      return
    }
    // No Kova MIME matched — caller handles file-drop fallback.
  }

  function handleDragOver(e: DragEvent): void {
    if (!e.dataTransfer) return
    const types = Array.from(e.dataTransfer.types)
    if (!types.some((t) => KOVA_MIME_TYPES.has(t))) return

    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'

    const ctx = buildContext(e)
    let action: string | null = null
    if (types.includes(DRAG_MIME.COLOR)) {
      action = ctx.target
        ? ctx.modifiers.shift
          ? 'stroke-replace'
          : ctx.modifiers.alt
            ? 'fill-additive'
            : 'fill-replace'
        : 'spawn-rect'
    } else if (types.includes(DRAG_MIME.FONT)) {
      action = ctx.target?.type === 'TEXT' ? 'text-font' : 'spawn-text'
    } else if (types.includes(DRAG_MIME.ASSET)) {
      action =
        ctx.target && FILL_SUPPORTING_TYPES.has(ctx.target.type)
          ? 'image-fill-replace'
          : 'spawn-image'
    } else if (types.includes(DRAG_MIME.SAVED_BLOCK)) {
      action = 'spawn-text'
    } else if (types.includes(DRAG_MIME.TONE_SNIPPET)) {
      action = ctx.target?.type === 'TEXT' ? 'text-replace' : 'spawn-text'
    }
    editor.setDropTarget(ctx.target?.id ?? null, action)
  }

  function handleDragLeave(_e: DragEvent): void {
    editor.clearDropTarget()
  }

  return { handleDrop, handleDragOver, handleDragLeave }
}

async function handleColorDrop(
  e: DragEvent,
  editor: DropEditorAdapter,
  ctx: CanvasDropContext
): Promise<void> {
  const raw = e.dataTransfer?.getData(DRAG_MIME.COLOR) ?? ''
  const payload = parsePayload(raw, BrandColorPayloadSchema)
  if (!payload) return

  // dropTargetAction is already set by handleDragOver; do not double-write
  // during drop (was causing visual jitter — H2 from code review).
  if (ctx.target) {
    if (ctx.modifiers.shift) {
      editor.updateNode(ctx.target.id, {
        strokes: [{ type: 'SOLID', color: hexToColor(payload.hex) }],
      })
    } else if (ctx.modifiers.alt) {
      const existing = editor.readFills(ctx.target.id)
      editor.updateNode(ctx.target.id, {
        fills: [...existing, { type: 'SOLID', color: hexToColor(payload.hex) }],
      })
    } else {
      editor.updateNode(ctx.target.id, {
        fills: [{ type: 'SOLID', color: hexToColor(payload.hex) }],
      })
    }
  } else {
    editor.spawnRect(ctx.x - 100, ctx.y - 100, 200, 200, payload.hex)
  }
  editor.clearDropTarget()
}

async function handleFontDrop(
  e: DragEvent,
  editor: DropEditorAdapter,
  ctx: CanvasDropContext
): Promise<void> {
  const raw = e.dataTransfer?.getData(DRAG_MIME.FONT) ?? ''
  const payload = parsePayload(raw, BrandFontPayloadSchema)
  if (!payload) return

  if (ctx.target && ctx.target.type === 'TEXT') {
    editor.updateNode(ctx.target.id, { fontFamily: payload.family })
  } else {
    editor.spawnText(ctx.x, ctx.y, 'Edit text', { fontFamily: payload.family })
  }
  editor.clearDropTarget()
}

async function handleAssetDrop(
  e: DragEvent,
  editor: DropEditorAdapter,
  ctx: CanvasDropContext
): Promise<void> {
  const raw = e.dataTransfer?.getData(DRAG_MIME.ASSET) ?? ''
  const payload = parsePayload(raw, BrandAssetPayloadSchema)
  if (!payload) return

  if (ctx.target && FILL_SUPPORTING_TYPES.has(ctx.target.type)) {
    editor.updateNode(ctx.target.id, {
      fills: [{ type: 'IMAGE', imageUrl: payload.url, scaleMode: 'FILL' }],
    })
  } else {
    editor.spawnImage(ctx.x, ctx.y, payload.url)
  }
  editor.clearDropTarget()
}

async function handleSavedBlockDrop(
  e: DragEvent,
  editor: DropEditorAdapter,
  ctx: CanvasDropContext
): Promise<void> {
  const raw = e.dataTransfer?.getData(DRAG_MIME.SAVED_BLOCK) ?? ''
  const payload = parsePayload(raw, SavedBlockPayloadSchema)
  if (!payload) return

  const blockType = payload.blockData.type
  const content = payload.blockData.content

  if (blockType === 'cta') {
    // Wrap CTA in a button-shaped RECT with the text as a child.
    const wrapId = editor.spawnRect(ctx.x - 100, ctx.y - 20, 200, 40, '#1a1a18')
    editor.spawnText(0, 0, content, { parentId: wrapId })
  } else if (blockType === 'footer') {
    // Snap to bottom of the nearest containing FRAME if any.
    const parentBounds = ctx.target ? editor.getBounds(ctx.target.id) : null
    const y = parentBounds ? parentBounds.y + parentBounds.h - 40 : ctx.y
    editor.spawnText(ctx.x, y, content)
  } else {
    editor.spawnText(ctx.x, ctx.y, content)
  }
  editor.clearDropTarget()
}

async function handleToneSnippetDrop(
  e: DragEvent,
  editor: DropEditorAdapter,
  ctx: CanvasDropContext
): Promise<void> {
  const raw = e.dataTransfer?.getData(DRAG_MIME.TONE_SNIPPET) ?? ''
  const payload = parsePayload(raw, ToneSnippetPayloadSchema)
  if (!payload) return

  if (ctx.target && ctx.target.type === 'TEXT') {
    editor.updateNode(ctx.target.id, { characters: payload.content })
  } else {
    editor.spawnText(ctx.x, ctx.y, payload.content)
  }
  editor.clearDropTarget()
}

function parsePayload<TSchema extends v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>>(
  raw: string,
  schema: TSchema
): v.InferOutput<TSchema> | null {
  try {
    const parsed = JSON.parse(raw)
    const result = v.safeParse(schema, parsed)
    if (!result.success) return null
    return result.output as v.InferOutput<TSchema>
  } catch {
    return null
  }
}

function hexToColor(hex: string): { r: number; g: number; b: number; a: number } {
  // #RRGGBB or #RRGGBBAA → 0-1 floats; matches Paint.color shape in scene-graph.
  const m = hex.replace('#', '')
  const r = parseInt(m.slice(0, 2), 16) / 255
  const g = parseInt(m.slice(2, 4), 16) / 255
  const b = parseInt(m.slice(4, 6), 16) / 255
  const a = m.length === 8 ? parseInt(m.slice(6, 8), 16) / 255 : 1
  return { r, g, b, a }
}

// -------------------------------------------------------------------------
// DOM-wired entry point used by EditorCanvas (preserves existing M5 contract).
// -------------------------------------------------------------------------

export function useCanvasDrop(canvasRef: Ref<HTMLCanvasElement | null>, store: EditorStore) {
  const isDraggingOver = ref(false)
  const adapter = makeEditorAdapter(store)
  const handlers = createCanvasDropHandlers(adapter, { canvasRef })

  useEventListener(canvasRef, 'dragover', (e: DragEvent) => {
    const types = e.dataTransfer ? Array.from(e.dataTransfer.types) : []
    if (types.some((t) => KOVA_MIME_TYPES.has(t))) {
      handlers.handleDragOver(e)
      isDraggingOver.value = true
      return
    }
    if (hasImageFiles(e)) {
      e.preventDefault()
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
      isDraggingOver.value = true
    }
  })

  useEventListener(canvasRef, 'dragenter', (e: DragEvent) => {
    const types = e.dataTransfer ? Array.from(e.dataTransfer.types) : []
    if (types.some((t) => KOVA_MIME_TYPES.has(t)) || hasImageFiles(e)) {
      e.preventDefault()
      isDraggingOver.value = true
    }
  })

  useEventListener(canvasRef, 'dragleave', (e: DragEvent) => {
    handlers.handleDragLeave(e)
    isDraggingOver.value = false
  })

  useEventListener(canvasRef, 'drop', (e: DragEvent) => {
    e.preventDefault()
    isDraggingOver.value = false

    const types = e.dataTransfer ? Array.from(e.dataTransfer.types) : []
    if (types.some((t) => KOVA_MIME_TYPES.has(t))) {
      void handlers.handleDrop(e)
      return
    }

    // M5 image-file fallback.
    const files = filterImageFiles(e.dataTransfer?.files ?? null)
    if (!files.length) return
    const canvas = canvasRef.value
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    const { x: cx, y: cy } = store.screenToCanvas(sx, sy)

    void store.placeImageFiles(files, cx, cy)
  })

  return { isDraggingOver }
}

function makeEditorAdapter(store: EditorStore): DropEditorAdapter {
  return {
    screenToCanvas: (sx, sy) => store.screenToCanvas(sx, sy),
    hitTestAt: (cx, cy) => {
      const node = store.graph.hitTest(cx, cy, store.state.currentPageId)
      return node ? { id: node.id, type: node.type } : null
    },
    updateNode: (id, changes) => {
      store.updateNodeWithUndo(id, changes as Parameters<typeof store.updateNodeWithUndo>[1])
    },
    readFills: (id) => {
      const node = store.graph.getNode(id)
      return (node?.fills as unknown[]) ?? []
    },
    spawnRect: (x, y, w, h, fillHex) => {
      const id = store.createShape('RECTANGLE', x, y, w, h)
      store.updateNodeWithUndo(id, {
        fills: [{ type: 'SOLID', color: hexToColor(fillHex) }],
      } as Parameters<typeof store.updateNodeWithUndo>[1])
      return id
    },
    spawnText: (x, y, content, extras = {}) => {
      const parentId = extras.parentId ?? store.state.currentPageId
      const node = store.graph.createNode('TEXT', parentId, {
        x,
        y,
        width: 200,
        height: 40,
        characters: content,
        ...(extras.fontFamily ? { fontFamily: extras.fontFamily } : {}),
      })
      return node.id
    },
    spawnImage: (x, y, url) => {
      const node = store.graph.createNode('RECTANGLE', store.state.currentPageId, {
        x,
        y,
        width: 200,
        height: 200,
        fills: [{ type: 'IMAGE', imageUrl: url, scaleMode: 'FILL' }],
      } as unknown as Parameters<typeof store.graph.createNode>[2])
      return node.id
    },
    getBounds: (id) => {
      const n = store.graph.getNode(id)
      if (!n) return null
      return { x: n.x, y: n.y, w: n.width, h: n.height }
    },
    setDropTarget: (id, action) => store.setDropTarget(id, action),
    clearDropTarget: () => store.clearDropTarget(),
  }
}

function hasImageFiles(e: DragEvent): boolean {
  if (!e.dataTransfer?.types.includes('Files')) return false
  for (const item of e.dataTransfer.items) {
    if (item.kind === 'file' && ACCEPTED_FILE_TYPES.has(item.type)) return true
  }
  return false
}

function filterImageFiles(files: FileList | null): File[] {
  if (!files) return []
  const result: File[] = []
  for (const file of files) {
    if (ACCEPTED_FILE_TYPES.has(file.type)) result.push(file)
  }
  return result
}

export function extractImageFilesFromClipboard(e: ClipboardEvent): File[] {
  return filterImageFiles(e.clipboardData?.files ?? null)
}
