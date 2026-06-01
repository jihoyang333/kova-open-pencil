/**
 * Drop receiver end-to-end — Cluster 06 Task 19.
 *
 * Drives the pure drop dispatcher (createCanvasDropHandlers) through an adapter
 * wired to a REAL editor store (mirrors production makeEditorAdapter). Simulates
 * a drop for each of the 5 Cluster-05 MIME types and asserts the scene graph
 * mutated. screenToCanvas + hitTestAt are mocked deterministically.
 */
import { describe, test, expect, beforeEach } from 'bun:test'
import {
  createCanvasDropHandlers,
  type DropEditorAdapter,
} from '@/composables/use-canvas-drop'
import { DRAG_MIME } from '@/types/drag-payload'
import { createEditorStore } from '@/stores/editor'

const UUID = '11111111-1111-1111-1111-111111111111'

type Store = ReturnType<typeof createEditorStore>
let store: Store
let hitTarget: { id: string; type: string } | null

function adapterFor(s: Store): DropEditorAdapter {
  return {
    screenToCanvas: () => ({ x: 300, y: 300 }),
    hitTestAt: () => hitTarget,
    updateNode: (id, changes) =>
      s.updateNodeWithUndo(id, changes as Parameters<typeof s.updateNodeWithUndo>[1]),
    readFills: (id) => (s.graph.getNode(id)?.fills as unknown[]) ?? [],
    spawnRect: (x, y, w, h, hex) => {
      const id = s.createShape('RECTANGLE', x, y, w, h)
      s.updateNodeWithUndo(id, {
        fills: [{ type: 'SOLID', color: hexToColor(hex) }],
      } as Parameters<typeof s.updateNodeWithUndo>[1])
      return id
    },
    spawnText: (x, y, content, extras = {}) => {
      const parentId = extras.parentId ?? s.state.currentPageId
      return s.graph.createNode('TEXT', parentId, {
        x,
        y,
        width: 200,
        height: 40,
        characters: content,
        ...(extras.fontFamily ? { fontFamily: extras.fontFamily } : {}),
      }).id
    },
    spawnImage: (x, y, url) =>
      s.graph.createNode('RECTANGLE', s.state.currentPageId, {
        x,
        y,
        width: 200,
        height: 200,
        fills: [{ type: 'IMAGE', imageUrl: url, scaleMode: 'FILL' }],
      } as unknown as Parameters<typeof s.graph.createNode>[2]).id,
    getBounds: (id) => {
      const n = s.graph.getNode(id)
      return n ? { x: n.x, y: n.y, w: n.width, h: n.height } : null
    },
    setDropTarget: (id, action) => s.setDropTarget(id, action),
    clearDropTarget: () => s.clearDropTarget(),
  }
}

function hexToColor(hex: string) {
  const m = hex.replace('#', '')
  return {
    r: parseInt(m.slice(0, 2), 16) / 255,
    g: parseInt(m.slice(2, 4), 16) / 255,
    b: parseInt(m.slice(4, 6), 16) / 255,
    a: 1,
  }
}

function dropEvent(mime: string, raw: string, opts: { shift?: boolean; alt?: boolean } = {}): DragEvent {
  return {
    dataTransfer: {
      types: [mime],
      getData: (t: string) => (t === mime ? raw : ''),
      dropEffect: '',
    },
    shiftKey: opts.shift ?? false,
    altKey: opts.alt ?? false,
    clientX: 0,
    clientY: 0,
    preventDefault: () => {},
  } as unknown as DragEvent
}

function topLevelCount(): number {
  return store.graph.getChildren(store.state.currentPageId).length
}

let handlers: ReturnType<typeof createCanvasDropHandlers>

beforeEach(() => {
  store = createEditorStore()
  hitTarget = null
  handlers = createCanvasDropHandlers(adapterFor(store))
})

describe('drop receiver — 5 MIME types against real editor state', () => {
  test('COLOR on empty canvas spawns a 200×200 RECTANGLE (Q24)', async () => {
    const before = topLevelCount()
    const raw = JSON.stringify({ hex: '#ff0000', swatchId: UUID, brandId: UUID })
    await handlers.handleDrop(dropEvent(DRAG_MIME.COLOR, raw))
    expect(topLevelCount()).toBe(before + 1)
    const newNode = store.graph.getChildren(store.state.currentPageId).at(-1)!
    expect(newNode.type).toBe('RECTANGLE')
    expect((newNode.fills?.[0] as { color: { r: number } }).color.r).toBeCloseTo(1, 2)
  })

  test('COLOR on a target replaces its fill', async () => {
    const id = store.createShape('RECTANGLE', 0, 0, 100, 100)
    hitTarget = { id, type: 'RECTANGLE' }
    const raw = JSON.stringify({ hex: '#00ff00', swatchId: UUID, brandId: UUID })
    await handlers.handleDrop(dropEvent(DRAG_MIME.COLOR, raw))
    const fill = store.graph.getNode(id)?.fills?.[0] as { color: { g: number } }
    expect(fill.color.g).toBeCloseTo(1, 2)
  })

  test('FONT on a TEXT target applies fontFamily', async () => {
    const t = store.graph.createNode('TEXT', store.state.currentPageId, {
      x: 0,
      y: 0,
      width: 200,
      height: 40,
      characters: 'Hi',
    })
    hitTarget = { id: t.id, type: 'TEXT' }
    const raw = JSON.stringify({ family: 'Poppins', brandId: UUID })
    await handlers.handleDrop(dropEvent(DRAG_MIME.FONT, raw))
    expect(store.graph.getNode(t.id)?.fontFamily).toBe('Poppins')
  })

  test('ASSET on a fill-supporting target sets an IMAGE fill', async () => {
    const id = store.createShape('RECTANGLE', 0, 0, 100, 100)
    hitTarget = { id, type: 'RECTANGLE' }
    const raw = JSON.stringify({ assetId: UUID, kind: 'image', url: 'http://img/x.png', brandId: UUID })
    await handlers.handleDrop(dropEvent(DRAG_MIME.ASSET, raw))
    const fill = store.graph.getNode(id)?.fills?.[0] as { type: string; imageUrl: string }
    expect(fill.type).toBe('IMAGE')
    expect(fill.imageUrl).toBe('http://img/x.png')
  })

  test('SAVED_BLOCK cta on empty canvas spawns a wrap RECT + child TEXT', async () => {
    const before = topLevelCount()
    const raw = JSON.stringify({
      blockId: UUID,
      blockData: { label: 'Buy', content: 'Buy now', type: 'cta' },
      brandId: UUID,
    })
    await handlers.handleDrop(dropEvent(DRAG_MIME.SAVED_BLOCK, raw))
    // wrap RECT is a new top-level node; the TEXT is its child.
    expect(topLevelCount()).toBe(before + 1)
    const wrap = store.graph.getChildren(store.state.currentPageId).at(-1)!
    expect(wrap.type).toBe('RECTANGLE')
    expect(store.graph.getChildren(wrap.id).some((n) => n.type === 'TEXT')).toBe(true)
  })

  test('TONE_SNIPPET on empty canvas spawns a TEXT node with the snippet content', async () => {
    const before = topLevelCount()
    const raw = JSON.stringify({ snippetId: UUID, content: 'Friendly & bold', brandId: UUID })
    await handlers.handleDrop(dropEvent(DRAG_MIME.TONE_SNIPPET, raw))
    expect(topLevelCount()).toBe(before + 1)
    const node = store.graph.getChildren(store.state.currentPageId).at(-1)!
    expect(node.type).toBe('TEXT')
    expect(node.characters).toBe('Friendly & bold')
  })
})
