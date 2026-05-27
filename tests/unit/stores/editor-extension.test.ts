/**
 * useEditorStore extensions — Cluster 06 Task 2.
 *
 * Adds 3-state showUI enum (hidden | minimized | full), panelsVisible per-side toggle,
 * and dropTargetId + dropTargetAction reactive state for Cluster 07b drop-overlay.
 */
import { describe, test, expect, beforeEach } from 'bun:test'
import { createEditorStore, setActiveEditorStore, useEditorStore } from '@/stores/editor'

describe('useEditorStore extensions (Cluster 06 Task 2)', () => {
  beforeEach(() => {
    setActiveEditorStore(createEditorStore())
  })

  test('showUI is 3-state enum, default "full"', () => {
    const store = useEditorStore()
    expect(store.state.showUI).toBe('full')

    store.setUIVisibility('minimized')
    expect(store.state.showUI).toBe('minimized')

    store.setUIVisibility('hidden')
    expect(store.state.showUI).toBe('hidden')

    store.setUIVisibility('full')
    expect(store.state.showUI).toBe('full')
  })

  test('panelsVisible.left + panelsVisible.right default true', () => {
    const store = useEditorStore()
    expect(store.state.panelsVisible.left).toBe(true)
    expect(store.state.panelsVisible.right).toBe(true)
  })

  test('togglePanel flips one side without affecting the other', () => {
    const store = useEditorStore()
    store.togglePanel('left')
    expect(store.state.panelsVisible.left).toBe(false)
    expect(store.state.panelsVisible.right).toBe(true)

    store.togglePanel('right')
    expect(store.state.panelsVisible.left).toBe(false)
    expect(store.state.panelsVisible.right).toBe(false)
  })

  test('setPanelVisible sets explicit value', () => {
    const store = useEditorStore()
    store.setPanelVisible('left', false)
    expect(store.state.panelsVisible.left).toBe(false)
    store.setPanelVisible('left', true)
    expect(store.state.panelsVisible.left).toBe(true)
  })

  test('dropTargetId and dropTargetAction default null', () => {
    const store = useEditorStore()
    expect(store.state.dropTargetId).toBeNull()
    expect(store.state.dropTargetAction).toBeNull()
  })

  test('setDropTarget(id, action) sets both', () => {
    const store = useEditorStore()
    store.setDropTarget('node-1', 'fill-replace')
    expect(store.state.dropTargetId).toBe('node-1')
    expect(store.state.dropTargetAction).toBe('fill-replace')
  })

  test('setDropTarget(id) without action defaults action to null', () => {
    const store = useEditorStore()
    store.setDropTarget('node-2')
    expect(store.state.dropTargetId).toBe('node-2')
    expect(store.state.dropTargetAction).toBeNull()
  })

  test('clearDropTarget resets both', () => {
    const store = useEditorStore()
    store.setDropTarget('node-3', 'stroke-replace')
    store.clearDropTarget()
    expect(store.state.dropTargetId).toBeNull()
    expect(store.state.dropTargetAction).toBeNull()
  })
})
