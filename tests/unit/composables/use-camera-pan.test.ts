import { describe, expect, it, beforeEach } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'
import type { EditorStore } from '@/stores/editor'
import { createEditorStore, setActiveEditorStore } from '@/stores/editor'
import { useCameraPan } from '@/composables/use-camera-pan'
import { CAMERA_PAN } from '@/constants/overlays'

// Adapted per handoff R: the plan's `figma.viewport` / `figma.getNodeById` are fictional.
// Real camera pan drives the editor store's `state.{panX,panY,zoom}` (screen = canvas *
// zoom + pan). We seed a real node and assert its canvas center maps to the viewport
// center after the animation, with viewport dims read from the live window (happy-dom).
let store: EditorStore

function seedNode(x: number, y: number, w: number, h: number): string {
  const pageId = store.state.currentPageId
  return store.graph.createNode('RECTANGLE', pageId, {
    name: 'r',
    x,
    y,
    width: w,
    height: h
  }).id
}

const PAD = 1 - CAMERA_PAN.PADDING_PCT / 100

describe('useCameraPan', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    store = createEditorStore()
    setActiveEditorStore(store)
  })

  it('panToNode animates over DURATION_MS then resolves', async () => {
    const id = seedNode(1000, 500, 200, 100)
    const { panToNode } = useCameraPan()
    const start = performance.now()
    await panToNode(id)
    const elapsed = performance.now() - start
    expect(elapsed).toBeGreaterThanOrEqual(CAMERA_PAN.DURATION_MS - 30)
    expect(elapsed).toBeLessThan(CAMERA_PAN.DURATION_MS + 250)
  })

  it('panToNode centers the node in the viewport', async () => {
    const id = seedNode(1000, 500, 200, 100)
    const { panToNode } = useCameraPan()
    await panToNode(id)
    const cx = 1000 + 100 // bbox center x
    const cy = 500 + 50 // bbox center y
    expect(store.state.panX + cx * store.state.zoom).toBeCloseTo(window.innerWidth / 2, 0)
    expect(store.state.panY + cy * store.state.zoom).toBeCloseTo(window.innerHeight / 2, 0)
  })

  it('panToNode fits the node with PADDING_PCT padding', async () => {
    const id = seedNode(0, 0, 200, 100)
    const { panToNode } = useCameraPan()
    await panToNode(id)
    const expected = Math.min((window.innerWidth * PAD) / 200, (window.innerHeight * PAD) / 100)
    expect(store.state.zoom).toBeCloseTo(expected, 2)
  })

  it('cancel-safe: a second panToNode supersedes the first', async () => {
    const id1 = seedNode(1000, 500, 200, 100)
    const id2 = seedNode(0, 0, 100, 100)
    const { panToNode } = useCameraPan()
    const p1 = panToNode(id1)
    await new Promise((r) => setTimeout(r, 40))
    const p2 = panToNode(id2)
    await Promise.all([p1, p2])
    expect(store.state.panX + 50 * store.state.zoom).toBeCloseTo(window.innerWidth / 2, 0)
    expect(store.state.panY + 50 * store.state.zoom).toBeCloseTo(window.innerHeight / 2, 0)
  })

  it('isAnimating is true during pan, false after', async () => {
    const id = seedNode(1000, 500, 200, 100)
    const { panToNode, isAnimating } = useCameraPan()
    expect(isAnimating.value).toBe(false)
    const p = panToNode(id)
    await new Promise((r) => setTimeout(r, 40))
    expect(isAnimating.value).toBe(true)
    await p
    expect(isAnimating.value).toBe(false)
  })

  it('panToNode on a missing node resolves without animating', async () => {
    const { panToNode, isAnimating } = useCameraPan()
    await panToNode('missing')
    expect(isAnimating.value).toBe(false)
  })
})
