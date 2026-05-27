/**
 * useLayerTree — Cluster 06 Task 5.
 *
 * Mask glyph variants (ALPHA/VECTOR/LUMINANCE per Q2), SLICE glyph,
 * expand/collapse, indent depth, reorder pass-through.
 */
import { describe, test, expect, beforeEach } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'
import { createEditorStore, setActiveEditorStore, useEditorStore } from '@/stores/editor'
import { useLayerTree } from '@/composables/use-layer-tree'

function seedPageTree(): {
  pageId: string
  frameId: string
  textId: string
  maskRectId: string
  sliceId: string
} {
  const editor = useEditorStore()
  const pageId = editor.state.currentPageId
  const frame = editor.graph.createNode('FRAME', pageId, { name: 'Hero' })
  const text = editor.graph.createNode('TEXT', frame.id, { name: 'Headline' })
  const maskRect = editor.graph.createNode('RECTANGLE', frame.id, {
    name: 'Mask BG',
    isMask: true,
    maskType: 'VECTOR',
  })
  const slice = editor.graph.createNode('SLICE', pageId, { name: 'Export region' })
  return { pageId, frameId: frame.id, textId: text.id, maskRectId: maskRect.id, sliceId: slice.id }
}

describe('useLayerTree (Cluster 06 Task 5)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    setActiveEditorStore(createEditorStore())
  })

  test('flatRows yields ordered rows with correct indent', () => {
    const seeded = seedPageTree()
    const tree = useLayerTree()
    const rows = tree.flatRows.value
    const ids = rows.map((r) => r.id)
    expect(ids).toEqual([seeded.frameId, seeded.textId, seeded.maskRectId, seeded.sliceId])
    expect(rows[0].indent).toBe(0)
    expect(rows[1].indent).toBe(1)
    expect(rows[2].indent).toBe(1)
    expect(rows[3].indent).toBe(0)
  })

  test('toggleExpand collapses children below the toggled node', () => {
    const seeded = seedPageTree()
    const tree = useLayerTree()
    tree.toggleExpand(seeded.frameId)
    const ids = tree.flatRows.value.map((r) => r.id)
    expect(ids).toEqual([seeded.frameId, seeded.sliceId])
  })

  test('mask glyph variant carries maskType (VECTOR here)', () => {
    const seeded = seedPageTree()
    const row = useLayerTree().flatRows.value.find((r) => r.id === seeded.maskRectId)
    expect(row?.isMask).toBe(true)
    expect(row?.maskGlyph).toBe('VECTOR')
  })

  test('non-mask node has maskGlyph = null', () => {
    const seeded = seedPageTree()
    const row = useLayerTree().flatRows.value.find((r) => r.id === seeded.textId)
    expect(row?.isMask).toBe(false)
    expect(row?.maskGlyph).toBeNull()
  })

  test('slice glyph rendered for SLICE NodeType', () => {
    const seeded = seedPageTree()
    const row = useLayerTree().flatRows.value.find((r) => r.id === seeded.sliceId)
    expect(row?.isSlice).toBe(true)
  })

  test('visibility + lock flags reflect node state', () => {
    const seeded = seedPageTree()
    const editor = useEditorStore()
    const tree = useLayerTree()
    const rowBefore = tree.flatRows.value.find((r) => r.id === seeded.textId)
    expect(rowBefore?.isVisible).toBe(true)
    expect(rowBefore?.isLocked).toBe(false)

    // toggleVisibility/toggleLock operate on current selection per editor.ts
    editor.select([seeded.textId])
    editor.toggleVisibility()
    editor.toggleLock()
    editor.requestRender()
    const rowAfter = tree.flatRows.value.find((r) => r.id === seeded.textId)
    expect(rowAfter?.isVisible).toBe(false)
    expect(rowAfter?.isLocked).toBe(true)
  })

  test('reorderLayer routes through editor.reorderChildWithUndo', () => {
    const seeded = seedPageTree()
    const editor = useEditorStore()
    useLayerTree().reorderLayer(seeded.textId, seeded.frameId, 1)
    const childIds = editor.graph.getNode(seeded.frameId)?.childIds ?? []
    expect(childIds[childIds.length - 1]).toBe(seeded.textId)
  })

  test('rowHeight constant is 28 (matches hi-fi)', () => {
    const tree = useLayerTree()
    expect(tree.rowHeight).toBe(28)
  })
})
