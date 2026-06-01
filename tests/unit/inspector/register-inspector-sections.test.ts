import { describe, expect, it, beforeEach } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'
import { createEditorStore, setActiveEditorStore, type EditorStore } from '@/stores/editor'
import {
  useInspectorRouter,
  clearInspectorSections
} from '@/composables/use-inspector-router'
import { registerInspectorSections } from '@/inspector/register-inspector-sections'

// Audit H1: the registry was empty in the live app (registerInspectorSection was never
// called outside tests), so the desktop inspector rendered nothing. These assert the
// boot bridge populates the router for real selections.
let store: EditorStore

function select(type: Parameters<EditorStore['graph']['createNode']>[0]): void {
  const id = store.graph.createNode(type, store.state.currentPageId, { name: 't' }).id
  store.select([id])
}

function activeIds(): string[] {
  return useInspectorRouter().activeSections.value.map((s) => s.id)
}

describe('registerInspectorSections', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    store = createEditorStore()
    setActiveEditorStore(store)
    clearInspectorSections()
    registerInspectorSections()
  })

  it('shows only the page section when nothing is selected', () => {
    expect(activeIds()).toEqual(['page'])
  })

  it('shows the full shape inspector for a RECTANGLE (no typography)', () => {
    select('RECTANGLE')
    const ids = activeIds()
    expect(ids).toEqual(['position', 'layout', 'appearance', 'boolean', 'fill', 'stroke', 'effects', 'export'])
    expect(ids).not.toContain('typography')
    expect(ids).not.toContain('page')
  })

  it('adds the typography section for a TEXT node', () => {
    select('TEXT')
    expect(activeIds()).toContain('typography')
  })

  it('is idempotent — double registration does not duplicate sections', () => {
    registerInspectorSections()
    select('RECTANGLE')
    const ids = activeIds()
    expect(new Set(ids).size).toBe(ids.length)
  })
})
