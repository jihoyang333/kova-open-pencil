import { watch } from 'vue'
import type { SceneNode } from '@open-pencil/core'
import { useFindStore } from '@/stores/find'
import { useEditorStore } from '@/stores/editor'
import { FIND_CONFIG } from '@/constants/overlays'

/**
 * Find-search composable (PRD §12.12 — Cluster 07b owns find end-to-end).
 *
 * Adapted per handoff: the plan's `figma.currentPage.findAll` does not exist. Real find
 * walks the active page subtree via the editor store's scene graph and matches
 * case-insensitively on node `name` OR text content. Writes `matchedNodeIds`; auto-
 * focuses on a single match (drives useCameraPan via `focusedNodeId`). Debounced by
 * `FIND_CONFIG.QUERY_DEBOUNCE_MS`, capped at `FIND_CONFIG.RESULTS_MAX`.
 */
let debounceTimer: ReturnType<typeof setTimeout> | null = null

export function useFindSearch() {
  const findStore = useFindStore()
  const editor = useEditorStore()

  /** Document-ordered DFS over the current page subtree. */
  function collectPageNodes(): SceneNode[] {
    const out: SceneNode[] = []
    const visit = (id: string): void => {
      for (const child of editor.graph.getChildren(id)) {
        out.push(child)
        visit(child.id)
      }
    }
    visit(editor.state.currentPageId)
    return out
  }

  function matches(node: SceneNode, needle: string): boolean {
    if (node.name.toLowerCase().includes(needle)) return true
    return node.type === 'TEXT' && node.text.toLowerCase().includes(needle)
  }

  function execute(query: string): void {
    const needle = query.trim().toLowerCase()
    if (needle.length === 0) {
      findStore.matchedNodeIds = []
      findStore.focusedNodeId = null
      return
    }
    const found: string[] = []
    for (const node of collectPageNodes()) {
      if (matches(node, needle)) {
        found.push(node.id)
        if (found.length >= FIND_CONFIG.RESULTS_MAX) break
      }
    }
    findStore.matchedNodeIds = found
    if (found.length === 1) {
      findStore.focusNode(found[0])
    } else {
      findStore.focusedNodeId = null
    }
  }

  function runQuery(query: string): void {
    if (debounceTimer !== null) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => execute(query), FIND_CONFIG.QUERY_DEBOUNCE_MS)
  }

  function cancel(): void {
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
  }

  // Auto-wire: store.setQuery(q) updates `query`; run the search on change.
  watch(
    () => findStore.query,
    (q) => runQuery(q)
  )

  return { runQuery, cancel }
}
