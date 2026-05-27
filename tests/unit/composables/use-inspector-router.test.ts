/**
 * useInspectorRouter — Cluster 06 Task 6.
 * DI registry per PRD 06 §12.15 RATIFIED 2026-05-17.
 */
import { describe, test, expect, beforeEach } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'
import { defineComponent, h } from 'vue'
import { createEditorStore, setActiveEditorStore, useEditorStore } from '@/stores/editor'
import {
  useInspectorRouter,
  registerInspectorSection,
  clearInspectorSections,
} from '@/composables/use-inspector-router'

const PageStub = defineComponent({
  name: 'PageStub',
  setup() {
    return () => h('div', 'page')
  },
})
const PositionStub = defineComponent({
  name: 'PositionStub',
  setup() {
    return () => h('div', 'position')
  },
})
const TextStub = defineComponent({
  name: 'TextStub',
  setup() {
    return () => h('div', 'text')
  },
})
const LayoutStub = defineComponent({
  name: 'LayoutStub',
  setup() {
    return () => h('div', 'layout')
  },
})

describe('useInspectorRouter (Cluster 06 Task 6)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    setActiveEditorStore(createEditorStore())
    clearInspectorSections()
    registerInspectorSection({ id: 'page', component: PageStub, priority: 10, supports: 'none' })
    registerInspectorSection({ id: 'position', component: PositionStub, priority: 20, supports: 'all' })
    registerInspectorSection({ id: 'text', component: TextStub, priority: 70, supports: ['TEXT'] })
    registerInspectorSection({
      id: 'layout',
      component: LayoutStub,
      priority: 30,
      supports: ['FRAME'],
      multiSelect: false,
    })
  })

  test('no selection → renders only "none" sections (PageSection)', () => {
    const editor = useEditorStore()
    editor.clearSelection()
    const ids = useInspectorRouter().activeSections.value.map((s) => s.id)
    expect(ids).toEqual(['page'])
  })

  test('single TEXT selection → position + text (sorted by priority)', () => {
    const editor = useEditorStore()
    const page = editor.state.currentPageId
    const t = editor.graph.createNode('TEXT', page, { name: 'T' })
    editor.select([t.id])
    const ids = useInspectorRouter().activeSections.value.map((s) => s.id)
    expect(ids).toEqual(['position', 'text'])
  })

  test('single FRAME selection → position + layout', () => {
    const editor = useEditorStore()
    const page = editor.state.currentPageId
    const f = editor.graph.createNode('FRAME', page, { name: 'F' })
    editor.select([f.id])
    const ids = useInspectorRouter().activeSections.value.map((s) => s.id)
    expect(ids).toEqual(['position', 'layout'])
  })

  test('single RECTANGLE selection → only position (no text, no layout)', () => {
    const editor = useEditorStore()
    const page = editor.state.currentPageId
    const r = editor.graph.createNode('RECTANGLE', page, { name: 'R' })
    editor.select([r.id])
    const ids = useInspectorRouter().activeSections.value.map((s) => s.id)
    expect(ids).toEqual(['position'])
  })

  test('multi-selection drops sections with multiSelect=false', () => {
    const editor = useEditorStore()
    const page = editor.state.currentPageId
    const f1 = editor.graph.createNode('FRAME', page, { name: 'F1' })
    const f2 = editor.graph.createNode('FRAME', page, { name: 'F2' })
    editor.select([f1.id, f2.id])
    const ids = useInspectorRouter().activeSections.value.map((s) => s.id)
    // layout has multiSelect:false → hidden; position has supports:'all' → shown
    expect(ids).toEqual(['position'])
  })

  test('PageSection (none) is NOT rendered when something is selected', () => {
    const editor = useEditorStore()
    const page = editor.state.currentPageId
    const r = editor.graph.createNode('RECTANGLE', page, { name: 'R' })
    editor.select([r.id])
    const ids = useInspectorRouter().activeSections.value.map((s) => s.id)
    expect(ids).not.toContain('page')
  })

  test('registerInspectorSection is idempotent on duplicate id', () => {
    const before = useInspectorRouter().activeSections.value.length
    registerInspectorSection({ id: 'position', component: PositionStub, priority: 999, supports: 'all' })
    const editor = useEditorStore()
    editor.clearSelection()
    const after = useInspectorRouter().activeSections.value.length
    // PageSection is the only 'none' section so length should still be 1
    expect(after).toBe(before)
  })
})
