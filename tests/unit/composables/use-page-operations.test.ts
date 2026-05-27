/**
 * usePageOperations — Cluster 06 Task 4b.
 * Covers PRD 06 §12.2 RATIFIED 2026-05-17 (no core mods, composable wrappers).
 */
import { describe, test, expect, beforeEach } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'
import { createEditorStore, setActiveEditorStore, useEditorStore } from '@/stores/editor'
import { usePageOperations } from '@/composables/use-page-operations'

describe('usePageOperations (Cluster 06 Task 4b)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    setActiveEditorStore(createEditorStore())
  })

  test('reorderPage moves page from index 0 to index 2', () => {
    const editor = useEditorStore()
    editor.addPage('Page 2')
    editor.addPage('Page 3')
    const initial = editor.graph.getPages()
    expect(initial).toHaveLength(3)
    const firstId = initial[0].id

    usePageOperations().reorderPage(0, 2)

    const after = editor.graph.getPages()
    expect(after).toHaveLength(3)
    expect(after[2].id).toBe(firstId)
  })

  test('reorderPage is a no-op when fromIdx === toIdx', () => {
    const editor = useEditorStore()
    editor.addPage('Page 2')
    const before = editor.graph.getPages().map((p) => p.id)

    usePageOperations().reorderPage(1, 1)

    expect(editor.graph.getPages().map((p) => p.id)).toEqual(before)
  })

  test('reorderPage throws on out-of-bounds index', () => {
    const editor = useEditorStore()
    editor.addPage('Page 2')
    const ops = usePageOperations()
    expect(() => ops.reorderPage(0, 99)).toThrow('out_of_bounds')
    expect(() => ops.reorderPage(-1, 0)).toThrow('out_of_bounds')
    expect(() => ops.reorderPage(0, -1)).toThrow('out_of_bounds')
  })

  test('duplicatePage clones with " copy" suffix and new id', () => {
    const editor = useEditorStore()
    const sourceId = editor.graph.getPages()[0].id
    editor.renamePage(sourceId, 'Hero')

    const newId = usePageOperations().duplicatePage(sourceId)

    const pages = editor.graph.getPages()
    expect(pages).toHaveLength(2)
    expect(newId).not.toBe(sourceId)
    const cloned = editor.graph.getNode(newId)
    expect(cloned?.name).toBe('Hero copy')
    expect(cloned?.type).toBe('CANVAS')
  })

  test('duplicatePage throws when target page id not found', () => {
    const ops = usePageOperations()
    expect(() => ops.duplicatePage('nonexistent-id')).toThrow('page_not_found')
  })

  test('duplicatePage throws when target id is not a CANVAS-type node', () => {
    const editor = useEditorStore()
    const rootId = editor.graph.rootId
    const ops = usePageOperations()
    expect(() => ops.duplicatePage(rootId)).toThrow('page_not_found')
  })
})
