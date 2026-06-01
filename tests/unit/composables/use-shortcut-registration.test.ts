import { describe, expect, it, beforeEach, afterEach } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'
import { defineComponent } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import type { EditorStore } from '@/stores/editor'
import { createEditorStore, setActiveEditorStore } from '@/stores/editor'
import { useFindStore } from '@/stores/find'
import { useShortcutRegistration } from '@/composables/use-shortcut-registration'
import { parseKeys } from '@/composables/use-shortcuts-fallback'

// Adapted per R2 + W5a: Cluster 08's registry is not shipped (gate false), so the real
// path is the Phase-A window keydown fallback. We drive it with real KeyboardEvents and
// assert effects on the real stores — no mock of a non-existent useShortcutsStore.
let store: EditorStore

const Harness = defineComponent({
  setup() {
    useShortcutRegistration()
    return () => null
  }
})

function press(code: string, mods: Partial<KeyboardEventInit> = {}): void {
  window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true, ...mods }))
}

// Track mounts so each test's window keydown listener is removed (onBeforeUnmount),
// otherwise accumulated listeners double-fire and cancel out toggles.
const wrappers: VueWrapper[] = []
function mountTracked(comp = Harness): VueWrapper {
  const w = mount(comp)
  wrappers.push(w)
  return w
}
afterEach(() => {
  while (wrappers.length) wrappers.pop()?.unmount()
})

describe('parseKeys', () => {
  it('maps tokens to e.code + modifier flags', () => {
    expect(parseKeys('alt+shift+u')).toEqual({
      code: 'KeyU',
      alt: true,
      shift: true,
      meta: false,
      ctrl: false
    })
    expect(parseKeys('shift+quote').code).toBe('Quote')
    expect(parseKeys('cmd+f')).toMatchObject({ code: 'KeyF', meta: true })
  })
})

describe('useShortcutRegistration (Phase-A fallback)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    store = createEditorStore()
    setActiveEditorStore(store)
  })

  it('Cmd+F opens find', () => {
    const find = useFindStore()
    mountTracked()
    expect(find.active).toBe(false)
    press('KeyF', { metaKey: true })
    expect(find.active).toBe(true)
  })

  it("Shift+' toggles the pixel grid", () => {
    mountTracked()
    const before = store.state.overlays.pixelGrid
    press('Quote', { shiftKey: true })
    expect(store.state.overlays.pixelGrid).toBe(!before)
  })

  it('⌥⇧U unions when 2+ nodes are selected', () => {
    const page = store.state.currentPageId
    const a = store.graph.createNode('RECTANGLE', page, { name: 'a', width: 10, height: 10 })
    const b = store.graph.createNode('RECTANGLE', page, { name: 'b', width: 10, height: 10 })
    store.select([a.id, b.id])
    mountTracked()
    expect([...store.graph.getAllNodes()].some((n) => n.type === 'GROUP')).toBe(false)
    press('KeyU', { altKey: true, shiftKey: true })
    expect([...store.graph.getAllNodes()].some((n) => n.type === 'GROUP')).toBe(true)
  })

  it('⌥⇧U does nothing with fewer than 2 nodes selected', () => {
    const page = store.state.currentPageId
    const a = store.graph.createNode('RECTANGLE', page, { name: 'a', width: 10, height: 10 })
    store.select([a.id])
    mountTracked()
    press('KeyU', { altKey: true, shiftKey: true })
    expect([...store.graph.getAllNodes()].some((n) => n.type === 'GROUP')).toBe(false)
  })

  it('exposes ⌥⇧ boolean bindings + find open/close ids', () => {
    let bindings: ReturnType<typeof useShortcutRegistration> = []
    mountTracked(
      defineComponent({
        setup() {
          bindings = useShortcutRegistration()
          return () => null
        }
      })
    )
    const byId = Object.fromEntries(bindings.map((b) => [b.id, b.keys]))
    expect(byId['boolean.union']).toBe('alt+shift+u')
    expect(byId['boolean.exclude']).toBe('alt+shift+e')
    expect(byId['find.open']).toBe('cmd+f')
    expect(byId['find.close']).toBe('escape')
  })
})
