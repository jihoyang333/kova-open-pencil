/**
 * useLayerTree — Cluster 06 Task 5.
 *
 * Derives a virtual-scrollable flat row list from `editor.graph.flattenTree`
 * of the current page, with per-row expand/collapse state, mask glyph variant
 * (ALPHA/VECTOR/LUMINANCE per Q2), and slice glyph for SLICE NodeType.
 *
 * Reorder routes through the existing `editor.reorderChildWithUndo` primitive.
 */
import { computed, ref, type ComputedRef } from 'vue'
import { useEditorStore } from '@/stores/editor'
import type { MaskType } from '@open-pencil/core'

export interface LayerRow {
  id: string
  type: string
  name: string
  indent: number
  hasChildren: boolean
  isExpanded: boolean
  isMask: boolean
  maskGlyph: MaskType | null
  isSlice: boolean
  isVisible: boolean
  isLocked: boolean
}

// Expansion state is SHARED across all useLayerTree() consumers so the layers
// panel header count, drag-reorder targets, and any future search panel all
// agree on which subtrees are open (H3 from code review). Singleton module
// state — survives HMR in dev intentionally so the tree doesn't collapse
// during reloads.
//
// Lifecycle: `resetForCanvas(canvasId)` must be called by the canvas route
// guard (Task 17) when the active canvas changes, so deleted-node ids from
// the previous canvas don't leak across canvas switches. `pruneMissing(graph)`
// can be invoked after bulk node deletions for the same hygiene reason.
const expansionState = ref<Map<string, boolean>>(new Map())
let lastCanvasId: string | null = null

/** Recursion guard so a malformed graph cycle does not stack-overflow. */
const MAX_INDENT = 64

function isExpandedInternal(nodeId: string): boolean {
  return expansionState.value.has(nodeId) ? expansionState.value.get(nodeId)! : true
}

function toggleInternal(nodeId: string): void {
  const next = new Map(expansionState.value)
  next.set(nodeId, !isExpandedInternal(nodeId))
  expansionState.value = next
}

function setInternal(nodeId: string, expanded: boolean): void {
  const next = new Map(expansionState.value)
  next.set(nodeId, expanded)
  expansionState.value = next
}

/** Test-only: reset expansion state between tests. */
export function __resetLayerTreeExpansion(): void {
  expansionState.value = new Map()
  lastCanvasId = null
}

/**
 * Reset expansion state when the active canvas changes. Idempotent — calling
 * with the same canvasId is a no-op. Wire from the canvas route guard
 * (Task 17) so the layers panel never displays stale expansion state from
 * the previous canvas.
 */
export function resetForCanvas(canvasId: string): void {
  if (canvasId === lastCanvasId) return
  expansionState.value = new Map()
  lastCanvasId = canvasId
}

/**
 * Drop entries whose node id no longer exists in `graph`. Cheap to run after
 * a bulk deletion; avoids unbounded growth of `expansionState`.
 */
export function pruneMissing(graph: { getNode: (id: string) => unknown }): void {
  const next = new Map<string, boolean>()
  for (const [id, expanded] of expansionState.value) {
    if (graph.getNode(id)) next.set(id, expanded)
  }
  if (next.size !== expansionState.value.size) {
    expansionState.value = next
  }
}

export interface UseLayerTree {
  flatRows: ComputedRef<LayerRow[]>
  rowHeight: number
  toggleExpand: (nodeId: string) => void
  setExpanded: (nodeId: string, expanded: boolean) => void
  reorderLayer: (nodeId: string, parentId: string, insertIndex: number) => void
}

export function useLayerTree(): UseLayerTree {
  const editor = useEditorStore()

  const flatRows = computed<LayerRow[]>(() => {
    // Touch sceneVersion to subscribe to graph mutations.
    void editor.state.sceneVersion
    const pageId = editor.state.currentPageId
    return buildRows(editor.graph, pageId, isExpandedInternal)
  })

  function toggleExpand(nodeId: string): void {
    toggleInternal(nodeId)
  }

  function setExpanded(nodeId: string, expanded: boolean): void {
    setInternal(nodeId, expanded)
  }

  function reorderLayer(nodeId: string, parentId: string, insertIndex: number): void {
    editor.reorderChildWithUndo(nodeId, parentId, insertIndex)
  }

  return {
    flatRows,
    rowHeight: 28,
    toggleExpand,
    setExpanded,
    reorderLayer,
  }
}

interface MinimalGraph {
  getNode: (id: string) => { childIds: string[] } | undefined
}

function buildRows(
  graph: unknown,
  pageId: string,
  isExpanded: (id: string) => boolean
): LayerRow[] {
  const out: LayerRow[] = []
  const g = graph as MinimalGraph

  function walk(parentId: string, indent: number): void {
    if (indent > MAX_INDENT) return
    const parent = g.getNode(parentId)
    if (!parent) return
    for (const childId of parent.childIds) {
      const node = g.getNode(childId) as unknown as {
        id: string
        type: string
        name: string
        childIds: string[]
        isMask?: boolean
        maskType?: MaskType
        visible?: boolean
        locked?: boolean
      } | undefined
      if (!node) continue
      const expanded = isExpanded(node.id)
      out.push({
        id: node.id,
        type: node.type,
        name: node.name,
        indent,
        hasChildren: node.childIds.length > 0,
        isExpanded: expanded,
        isMask: node.isMask === true,
        maskGlyph: node.isMask === true ? (node.maskType ?? 'ALPHA') : null,
        isSlice: node.type === 'SLICE',
        isVisible: node.visible !== false,
        isLocked: node.locked === true,
      })
      if (expanded && node.childIds.length > 0) {
        walk(node.id, indent + 1)
      }
    }
  }

  walk(pageId, 0)
  return out
}
