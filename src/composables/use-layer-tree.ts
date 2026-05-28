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
const expansionState = ref<Map<string, boolean>>(new Map())

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
