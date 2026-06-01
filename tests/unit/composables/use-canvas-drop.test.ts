/**
 * use-canvas-drop — Cluster 06 Task 8.
 *
 * Tests the pure dispatcher via createCanvasDropHandlers(adapter) so we can
 * mock the editor surface without booting the full SceneGraph. The DOM-wired
 * useCanvasDrop() wraps these same handlers + the M5 image-file fallback.
 */
import { describe, test, expect, beforeEach, mock } from 'bun:test'
import {
  createCanvasDropHandlers,
  type DropEditorAdapter,
} from '@/composables/use-canvas-drop'
import { DRAG_MIME } from '@/types/drag-payload'

const VALID_UUID_1 = '00000000-0000-4000-8000-000000000001'
const VALID_UUID_2 = '00000000-0000-4000-8000-000000000002'
const VALID_UUID_3 = '00000000-0000-4000-8000-000000000003'

function makeAdapter(opts: Partial<DropEditorAdapter> = {}): DropEditorAdapter {
  return {
    screenToCanvas: mock(() => ({ x: 100, y: 100 })),
    hitTestAt: mock(() => null),
    updateNode: mock(() => {}),
    readFills: mock(() => []),
    spawnRect: mock(() => 'new-rect-id'),
    spawnText: mock(() => 'new-text-id'),
    spawnImage: mock(() => 'new-image-id'),
    getBounds: mock(() => null),
    setDropTarget: mock(() => {}),
    clearDropTarget: mock(() => {}),
    ...opts,
  }
}

function makeDropEvent(
  types: string[],
  data: Record<string, string>,
  modifiers: { shift?: boolean; alt?: boolean } = {}
): DragEvent {
  const dt = {
    types,
    getData: (k: string) => data[k] ?? '',
    files: [] as unknown as FileList,
    items: [] as unknown as DataTransferItemList,
    dropEffect: 'copy',
  } as unknown as DataTransfer
  return {
    dataTransfer: dt,
    clientX: 100,
    clientY: 100,
    preventDefault: () => {},
    shiftKey: !!modifiers.shift,
    altKey: !!modifiers.alt,
  } as DragEvent
}

describe('createCanvasDropHandlers — color MIME', () => {
  test('color drop on existing node → fill replace', async () => {
    const adapter = makeAdapter({
      hitTestAt: mock(() => ({ id: 'frame-1', type: 'FRAME' })),
    })
    const { handleDrop } = createCanvasDropHandlers(adapter)
    const evt = makeDropEvent(
      [DRAG_MIME.COLOR],
      {
        [DRAG_MIME.COLOR]: JSON.stringify({
          hex: '#FA5400',
          swatchId: VALID_UUID_1,
          brandId: VALID_UUID_2,
        }),
      }
    )
    await handleDrop(evt)
    const calls = (adapter.updateNode as ReturnType<typeof mock>).mock.calls
    expect(calls).toHaveLength(1)
    expect(calls[0][0]).toBe('frame-1')
    expect(calls[0][1]).toEqual({
      fills: [{ type: 'SOLID', color: { r: 250 / 255, g: 84 / 255, b: 0, a: 1 } }],
    })
  })

  test('Shift+color drop on existing node → stroke replace', async () => {
    const adapter = makeAdapter({
      hitTestAt: mock(() => ({ id: 'frame-1', type: 'FRAME' })),
    })
    const { handleDrop } = createCanvasDropHandlers(adapter)
    const evt = makeDropEvent(
      [DRAG_MIME.COLOR],
      {
        [DRAG_MIME.COLOR]: JSON.stringify({
          hex: '#FA5400',
          swatchId: VALID_UUID_1,
          brandId: VALID_UUID_2,
        }),
      },
      { shift: true }
    )
    await handleDrop(evt)
    const calls = (adapter.updateNode as ReturnType<typeof mock>).mock.calls
    expect(calls[0][1]).toHaveProperty('strokes')
    expect(calls[0][1]).not.toHaveProperty('fills')
  })

  test('Alt+color drop on existing node → fill additive (append)', async () => {
    const existingFill = { type: 'SOLID', color: { r: 0, g: 0, b: 0, a: 1 } }
    const adapter = makeAdapter({
      hitTestAt: mock(() => ({ id: 'frame-1', type: 'FRAME' })),
      readFills: mock(() => [existingFill]),
    })
    const { handleDrop } = createCanvasDropHandlers(adapter)
    const evt = makeDropEvent(
      [DRAG_MIME.COLOR],
      {
        [DRAG_MIME.COLOR]: JSON.stringify({
          hex: '#FA5400',
          swatchId: VALID_UUID_1,
          brandId: VALID_UUID_2,
        }),
      },
      { alt: true }
    )
    await handleDrop(evt)
    const calls = (adapter.updateNode as ReturnType<typeof mock>).mock.calls
    const fills = (calls[0][1] as { fills: unknown[] }).fills
    expect(fills).toHaveLength(2)
    expect(fills[0]).toEqual(existingFill)
  })

  test('color drop on empty canvas → spawn 200x200 rect at centered offset', async () => {
    const adapter = makeAdapter({
      screenToCanvas: mock(() => ({ x: 300, y: 200 })),
    })
    const { handleDrop } = createCanvasDropHandlers(adapter)
    const evt = makeDropEvent(
      [DRAG_MIME.COLOR],
      {
        [DRAG_MIME.COLOR]: JSON.stringify({
          hex: '#0066FF',
          swatchId: VALID_UUID_1,
          brandId: VALID_UUID_2,
        }),
      }
    )
    await handleDrop(evt)
    const calls = (adapter.spawnRect as ReturnType<typeof mock>).mock.calls
    expect(calls).toHaveLength(1)
    expect(calls[0]).toEqual([200, 100, 200, 200, '#0066FF']) // x-100, y-100, w, h, hex
  })

  test('invalid color payload → no editor mutation + onParseError fires', async () => {
    const adapter = makeAdapter({
      hitTestAt: mock(() => ({ id: 'frame-1', type: 'FRAME' })),
    })
    const onParseError = mock(() => {})
    const { handleDrop } = createCanvasDropHandlers(adapter, { onParseError })
    const evt = makeDropEvent([DRAG_MIME.COLOR], {
      [DRAG_MIME.COLOR]: JSON.stringify({ wrong: 'shape' }),
    })
    await handleDrop(evt)
    expect((adapter.updateNode as ReturnType<typeof mock>).mock.calls).toHaveLength(0)
    expect((adapter.spawnRect as ReturnType<typeof mock>).mock.calls).toHaveLength(0)
    expect(onParseError.mock.calls).toHaveLength(1)
    expect(onParseError.mock.calls[0]).toEqual([DRAG_MIME.COLOR])
  })

  test('truncated JSON rejected (C-MED18) → onParseError fires, no crash', async () => {
    const adapter = makeAdapter()
    const onParseError = mock(() => {})
    const { handleDrop } = createCanvasDropHandlers(adapter, { onParseError })
    const evt = makeDropEvent([DRAG_MIME.COLOR], {
      [DRAG_MIME.COLOR]: '{"hex":"#FA5400","swat',
    })
    await handleDrop(evt)
    expect((adapter.updateNode as ReturnType<typeof mock>).mock.calls).toHaveLength(0)
    expect((adapter.spawnRect as ReturnType<typeof mock>).mock.calls).toHaveLength(0)
    expect(onParseError.mock.calls).toHaveLength(1)
  })
})

describe('createCanvasDropHandlers — font MIME', () => {
  test('font drop on TEXT → fontFamily update', async () => {
    const adapter = makeAdapter({
      hitTestAt: mock(() => ({ id: 'text-1', type: 'TEXT' })),
    })
    const { handleDrop } = createCanvasDropHandlers(adapter)
    const evt = makeDropEvent([DRAG_MIME.FONT], {
      [DRAG_MIME.FONT]: JSON.stringify({
        family: 'Inter',
        brandId: VALID_UUID_2,
      }),
    })
    await handleDrop(evt)
    const calls = (adapter.updateNode as ReturnType<typeof mock>).mock.calls
    expect(calls).toHaveLength(1)
    expect(calls[0]).toEqual(['text-1', { fontFamily: 'Inter' }])
  })

  test('font drop on non-TEXT or empty → spawn TEXT', async () => {
    const adapter = makeAdapter()
    const { handleDrop } = createCanvasDropHandlers(adapter)
    const evt = makeDropEvent([DRAG_MIME.FONT], {
      [DRAG_MIME.FONT]: JSON.stringify({
        family: 'Inter',
        brandId: VALID_UUID_2,
      }),
    })
    await handleDrop(evt)
    const calls = (adapter.spawnText as ReturnType<typeof mock>).mock.calls
    expect(calls).toHaveLength(1)
    expect(calls[0][2]).toBe('Edit text')
    expect(calls[0][3]).toEqual({ fontFamily: 'Inter' })
  })
})

describe('createCanvasDropHandlers — asset MIME', () => {
  test('asset drop on fill-supporting node → image fill replace', async () => {
    const adapter = makeAdapter({
      hitTestAt: mock(() => ({ id: 'frame-1', type: 'FRAME' })),
    })
    const { handleDrop } = createCanvasDropHandlers(adapter)
    const evt = makeDropEvent([DRAG_MIME.ASSET], {
      [DRAG_MIME.ASSET]: JSON.stringify({
        assetId: VALID_UUID_1,
        kind: 'logo',
        url: 'https://kova.app/logo.png',
        brandId: VALID_UUID_2,
      }),
    })
    await handleDrop(evt)
    const calls = (adapter.updateNode as ReturnType<typeof mock>).mock.calls
    expect(calls[0][1]).toEqual({
      fills: [
        { type: 'IMAGE', imageUrl: 'https://kova.app/logo.png', scaleMode: 'FILL' },
      ],
    })
  })

  test('asset drop on empty canvas → spawn image', async () => {
    const adapter = makeAdapter({
      screenToCanvas: mock(() => ({ x: 50, y: 50 })),
    })
    const { handleDrop } = createCanvasDropHandlers(adapter)
    const evt = makeDropEvent([DRAG_MIME.ASSET], {
      [DRAG_MIME.ASSET]: JSON.stringify({
        assetId: VALID_UUID_1,
        kind: 'image',
        url: 'https://kova.app/photo.jpg',
        brandId: VALID_UUID_2,
      }),
    })
    await handleDrop(evt)
    expect((adapter.spawnImage as ReturnType<typeof mock>).mock.calls).toHaveLength(1)
  })
})

describe('createCanvasDropHandlers — saved-block MIME', () => {
  test('text-type saved-block → spawn plain TEXT', async () => {
    const adapter = makeAdapter()
    const { handleDrop } = createCanvasDropHandlers(adapter)
    const evt = makeDropEvent([DRAG_MIME.SAVED_BLOCK], {
      [DRAG_MIME.SAVED_BLOCK]: JSON.stringify({
        blockId: VALID_UUID_3,
        blockData: { label: 'Greeting', content: 'Hello there', type: 'text' },
        brandId: VALID_UUID_2,
      }),
    })
    await handleDrop(evt)
    const calls = (adapter.spawnText as ReturnType<typeof mock>).mock.calls
    expect(calls).toHaveLength(1)
    expect(calls[0][2]).toBe('Hello there')
  })

  test('cta-type saved-block → spawn wrap rect + child TEXT', async () => {
    const adapter = makeAdapter()
    const { handleDrop } = createCanvasDropHandlers(adapter)
    const evt = makeDropEvent([DRAG_MIME.SAVED_BLOCK], {
      [DRAG_MIME.SAVED_BLOCK]: JSON.stringify({
        blockId: VALID_UUID_3,
        blockData: { label: 'CTA', content: 'Shop now', type: 'cta' },
        brandId: VALID_UUID_2,
      }),
    })
    await handleDrop(evt)
    expect((adapter.spawnRect as ReturnType<typeof mock>).mock.calls).toHaveLength(1)
    const textCalls = (adapter.spawnText as ReturnType<typeof mock>).mock.calls
    expect(textCalls).toHaveLength(1)
    expect(textCalls[0][2]).toBe('Shop now')
    expect(textCalls[0][3]).toEqual({ parentId: 'new-rect-id' })
  })

  test('footer-type saved-block on FRAME → snap to bottom of frame', async () => {
    const adapter = makeAdapter({
      hitTestAt: mock(() => ({ id: 'frame-1', type: 'FRAME' })),
      getBounds: mock(() => ({ x: 0, y: 0, w: 600, h: 800 })),
    })
    const { handleDrop } = createCanvasDropHandlers(adapter)
    const evt = makeDropEvent([DRAG_MIME.SAVED_BLOCK], {
      [DRAG_MIME.SAVED_BLOCK]: JSON.stringify({
        blockId: VALID_UUID_3,
        blockData: { label: 'Footer', content: '© Kova', type: 'footer' },
        brandId: VALID_UUID_2,
      }),
    })
    await handleDrop(evt)
    const calls = (adapter.spawnText as ReturnType<typeof mock>).mock.calls
    // y should snap to frame.y + frame.h - 40 = 760
    expect(calls[0][1]).toBe(760)
  })
})

describe('createCanvasDropHandlers — tone-snippet MIME', () => {
  test('tone-snippet drop on TEXT → characters replace', async () => {
    const adapter = makeAdapter({
      hitTestAt: mock(() => ({ id: 'text-1', type: 'TEXT' })),
    })
    const { handleDrop } = createCanvasDropHandlers(adapter)
    const evt = makeDropEvent([DRAG_MIME.TONE_SNIPPET], {
      [DRAG_MIME.TONE_SNIPPET]: JSON.stringify({
        snippetId: VALID_UUID_3,
        content: 'Friendly tone copy',
        brandId: VALID_UUID_2,
      }),
    })
    await handleDrop(evt)
    const calls = (adapter.updateNode as ReturnType<typeof mock>).mock.calls
    expect(calls[0]).toEqual(['text-1', { characters: 'Friendly tone copy' }])
  })

  test('tone-snippet drop on empty → spawn TEXT with snippet content', async () => {
    const adapter = makeAdapter()
    const { handleDrop } = createCanvasDropHandlers(adapter)
    const evt = makeDropEvent([DRAG_MIME.TONE_SNIPPET], {
      [DRAG_MIME.TONE_SNIPPET]: JSON.stringify({
        snippetId: VALID_UUID_3,
        content: 'Snappy tagline',
        brandId: VALID_UUID_2,
      }),
    })
    await handleDrop(evt)
    expect((adapter.spawnText as ReturnType<typeof mock>).mock.calls[0][2]).toBe(
      'Snappy tagline'
    )
  })
})

describe('createCanvasDropHandlers — dragover preview', () => {
  beforeEach(() => {})

  test('color dragover with target → fill-replace action set', () => {
    const adapter = makeAdapter({
      hitTestAt: mock(() => ({ id: 'frame-1', type: 'FRAME' })),
    })
    const { handleDragOver } = createCanvasDropHandlers(adapter)
    const evt = makeDropEvent([DRAG_MIME.COLOR], {})
    handleDragOver(evt)
    const calls = (adapter.setDropTarget as ReturnType<typeof mock>).mock.calls
    expect(calls).toHaveLength(1)
    expect(calls[0]).toEqual(['frame-1', 'fill-replace'])
  })

  test('color dragover with Shift → stroke-replace', () => {
    const adapter = makeAdapter({
      hitTestAt: mock(() => ({ id: 'frame-1', type: 'FRAME' })),
    })
    const { handleDragOver } = createCanvasDropHandlers(adapter)
    const evt = makeDropEvent([DRAG_MIME.COLOR], {}, { shift: true })
    handleDragOver(evt)
    expect(
      (adapter.setDropTarget as ReturnType<typeof mock>).mock.calls[0][1]
    ).toBe('stroke-replace')
  })

  test('color dragover on empty canvas → spawn-rect', () => {
    const adapter = makeAdapter()
    const { handleDragOver } = createCanvasDropHandlers(adapter)
    const evt = makeDropEvent([DRAG_MIME.COLOR], {})
    handleDragOver(evt)
    expect(
      (adapter.setDropTarget as ReturnType<typeof mock>).mock.calls[0]
    ).toEqual([null, 'spawn-rect'])
  })

  test('non-Kova dragover (image files) → no setDropTarget call', () => {
    const adapter = makeAdapter()
    const { handleDragOver } = createCanvasDropHandlers(adapter)
    const evt = makeDropEvent(['Files'], {})
    handleDragOver(evt)
    expect(
      (adapter.setDropTarget as ReturnType<typeof mock>).mock.calls
    ).toHaveLength(0)
  })

  test('dragleave clears drop target', () => {
    const adapter = makeAdapter()
    const { handleDragLeave } = createCanvasDropHandlers(adapter)
    handleDragLeave(makeDropEvent([DRAG_MIME.COLOR], {}))
    expect(
      (adapter.clearDropTarget as ReturnType<typeof mock>).mock.calls
    ).toHaveLength(1)
  })
})

describe('createCanvasDropHandlers — empty / no-op drops', () => {
  test('drop with no MIME match is a silent no-op', async () => {
    const adapter = makeAdapter()
    const { handleDrop } = createCanvasDropHandlers(adapter)
    const evt = makeDropEvent(['text/plain'], { 'text/plain': 'lol' })
    await handleDrop(evt)
    expect((adapter.updateNode as ReturnType<typeof mock>).mock.calls).toHaveLength(0)
    expect((adapter.spawnRect as ReturnType<typeof mock>).mock.calls).toHaveLength(0)
    expect((adapter.spawnText as ReturnType<typeof mock>).mock.calls).toHaveLength(0)
  })

  test('drop with no dataTransfer is a silent no-op', async () => {
    const adapter = makeAdapter()
    const { handleDrop } = createCanvasDropHandlers(adapter)
    await handleDrop({ dataTransfer: null } as unknown as DragEvent)
    expect((adapter.updateNode as ReturnType<typeof mock>).mock.calls).toHaveLength(0)
  })
})
