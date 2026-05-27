/**
 * usePageOperations — Cluster 06 Task 4b.
 *
 * PRD 06 §12.2 RATIFIED 2026-05-17: core's SceneGraph lacks
 * `reorderPage` + `duplicatePage` page-level primitives. Cluster 06 owns
 * these as composable wrappers over the existing `graph.reorderChild` +
 * `graph.cloneTree` primitives (no `packages/core/` mods — read-only per
 * CLAUDE.md).
 *
 * - reorderPage(fromIdx, toIdx): moves a page (CANVAS-type root child) to
 *   a new index in the rootId.childIds list.
 * - duplicatePage(pageId): deep-clones the CANVAS subtree (new ids) and
 *   appends as a new page with " copy" suffix.
 */
import { useEditorStore } from '@/stores/editor'

export interface PageOperations {
  reorderPage: (fromIdx: number, toIdx: number) => void
  duplicatePage: (pageId: string) => string
}

export function usePageOperations(): PageOperations {
  const editor = useEditorStore()

  function reorderPage(fromIdx: number, toIdx: number): void {
    const pages = editor.graph.getPages()
    if (
      fromIdx < 0 ||
      fromIdx >= pages.length ||
      toIdx < 0 ||
      toIdx >= pages.length
    ) {
      throw new Error('out_of_bounds')
    }
    if (fromIdx === toIdx) return

    const movedPageId = pages[fromIdx].id
    editor.graph.reorderChild(movedPageId, editor.graph.rootId, toIdx)
    editor.requestRender()
  }

  function duplicatePage(pageId: string): string {
    const source = editor.graph.getNode(pageId)
    if (!source || source.type !== 'CANVAS') {
      throw new Error('page_not_found')
    }

    const cloned = editor.graph.cloneTree(pageId, editor.graph.rootId, {
      name: `${source.name} copy`,
    })
    if (!cloned) {
      throw new Error('clone_failed')
    }

    editor.requestRender()
    return cloned.id
  }

  return { reorderPage, duplicatePage }
}
