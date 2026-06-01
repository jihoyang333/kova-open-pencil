import { describe, expect, it, beforeEach } from 'bun:test'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import type { EditorStore } from '@/stores/editor'
import { createEditorStore, setActiveEditorStore } from '@/stores/editor'
import BooleanOpsRow from '@/components/inspector/BooleanOpsRow.vue'

// Adapted per handoff R2/R6 + exec-doc #5:
//  - no `figma.booleanOperation(op)` singleton — the real op is FigmaAPI.booleanOperation
//    (op, ids), reached via makeFigmaFromStore; it reparents ≥2 nodes into a GROUP.
//  - shortcuts are ⌥⇧U/S/I/E (W5a fix), NOT ⌘⌥U/S/I/X.
//  - no mock.module (process-global in Bun); use the real editor store + createNode/select.
let store: EditorStore

function seedSelected(count: number): void {
  const pageId = store.state.currentPageId
  const ids: string[] = []
  for (let i = 0; i < count; i++) {
    ids.push(store.graph.createNode('RECTANGLE', pageId, { name: `r${i}`, width: 10, height: 10 }).id)
  }
  store.select(ids)
}

function hasGroup(): boolean {
  return [...store.graph.getAllNodes()].some((n) => n.type === 'GROUP')
}

describe('BooleanOpsRow', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    store = createEditorStore()
    setActiveEditorStore(store)
  })

  it('renders 4 buttons (Union/Subtract/Intersect/Exclude)', () => {
    seedSelected(2)
    const wrapper = mount(BooleanOpsRow)
    expect(wrapper.findAll('button')).toHaveLength(4)
  })

  it('shows the ⌥⇧ shortcut in each tooltip', () => {
    seedSelected(2)
    const wrapper = mount(BooleanOpsRow)
    const titles = wrapper.findAll('button').map((b) => b.attributes('title'))
    expect(titles[0]).toContain('⌥⇧U')
    expect(titles[1]).toContain('⌥⇧S')
    expect(titles[2]).toContain('⌥⇧I')
    expect(titles[3]).toContain('⌥⇧E')
  })

  it('clicking Union with 2+ selected creates a boolean GROUP', async () => {
    seedSelected(2)
    const wrapper = mount(BooleanOpsRow)
    expect(hasGroup()).toBe(false)
    await wrapper.findAll('button')[0].trigger('click')
    expect(hasGroup()).toBe(true)
  })

  // C-LOW07b.2: disabled when selection < 2
  it('all 4 buttons disabled when selection has 0 nodes', () => {
    seedSelected(0)
    const wrapper = mount(BooleanOpsRow)
    for (const btn of wrapper.findAll('button')) {
      expect(btn.attributes('disabled')).toBeDefined()
    }
  })

  it('all 4 buttons disabled when selection has 1 node', () => {
    seedSelected(1)
    const wrapper = mount(BooleanOpsRow)
    for (const btn of wrapper.findAll('button')) {
      expect(btn.attributes('disabled')).toBeDefined()
    }
  })

  it('buttons enabled when selection has 2+ nodes', () => {
    seedSelected(2)
    const wrapper = mount(BooleanOpsRow)
    for (const btn of wrapper.findAll('button')) {
      expect(btn.attributes('disabled')).toBeUndefined()
    }
  })

  it('clicking a disabled button does NOT create a GROUP', async () => {
    seedSelected(1)
    const wrapper = mount(BooleanOpsRow)
    await wrapper.findAll('button')[0].trigger('click')
    expect(hasGroup()).toBe(false)
  })
})
