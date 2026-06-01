import { describe, expect, it, beforeEach } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'
import type { SceneNode } from '@open-pencil/core'
import { useClipboardStore } from '@/stores/clipboard'

describe('useClipboardStore', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('starts with null copiedProps', () => {
    const store = useClipboardStore()
    expect(store.copiedProps).toBeNull()
  })

  it('copyProps stores the full Q23 prop set from a node', () => {
    const store = useClipboardStore()
    const node = {
      id: 'n1',
      type: 'RECTANGLE',
      fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0, a: 1 } }],
      strokes: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0, a: 1 } }],
      strokeWeight: 2,
      strokeAlign: 'INSIDE',
      effects: [],
      opacity: 0.8,
      blendMode: 'NORMAL',
      cornerRadius: 4,
      paddingLeft: 0,
      paddingRight: 0,
      paddingTop: 0,
      paddingBottom: 0,
      layoutMode: 'NONE',
    } as unknown as SceneNode
    store.copyProps(node)
    expect(store.copiedProps).not.toBeNull()
    expect(store.copiedProps!.sourceNodeId).toBe('n1')
    expect(store.copiedProps!.props.strokeWeight).toBe(2)
    expect(store.copiedProps!.props.strokeAlign).toBe('INSIDE')
  })

  it('clear resets copiedProps to null', () => {
    const store = useClipboardStore()
    store.copyProps({ id: 'n1', type: 'RECTANGLE' } as unknown as SceneNode)
    store.clear()
    expect(store.copiedProps).toBeNull()
  })

  // C-LOW07b.4: pasteProps must skip fields the target node type does not support
  it('pasteProps skips incompatible fields when source/target node types differ', () => {
    const store = useClipboardStore()
    const src = {
      id: 'rect-1',
      type: 'RECTANGLE',
      fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0, a: 1 } }],
      strokes: [],
      strokeWeight: 4,
      strokeAlign: 'CENTER',
      cornerRadius: 12, // rectangle-only — TextNode should NOT receive this
      opacity: 0.5,
      effects: [],
      blendMode: 'NORMAL',
    } as unknown as SceneNode
    store.copyProps(src)
    const tgt = {
      id: 'text-1',
      type: 'TEXT',
      fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0, a: 1 } }],
      opacity: 1,
      content: 'hi',
      fontSize: 14,
      // NOTE: no `cornerRadius` field on TEXT — paste must skip it
    } as Record<string, unknown>
    store.pasteProps([tgt as unknown as SceneNode])
    // compatible fields applied
    expect(tgt.fills).toEqual((src as unknown as Record<string, unknown>).fills)
    expect(tgt.opacity).toBe(0.5)
    // incompatible (rectangle-only) field NOT introduced on target
    expect('cornerRadius' in tgt).toBe(false)
  })

  it('pasteProps preserves text-only fields when overwriting text→text', () => {
    const store = useClipboardStore()
    const src = {
      id: 'text-a',
      type: 'TEXT',
      content: 'A',
      fontSize: 18,
      fills: [],
      opacity: 1,
    } as unknown as SceneNode
    store.copyProps(src)
    const tgt = {
      id: 'text-b',
      type: 'TEXT',
      content: 'B',
      fontSize: 12,
      fills: [],
      opacity: 1,
    } as Record<string, unknown>
    store.pasteProps([tgt as unknown as SceneNode])
    // fontSize is not in the Q23 paste set — verify it stays unchanged
    expect(tgt.fontSize).toBe(12)
    // content is intentionally NOT in the Q23 paste set — verify it stays unchanged
    expect(tgt.content).toBe('B')
    // fills IS in the Q23 set — empty array copied over
    expect(tgt.fills).toEqual([])
  })

  it('pasteProps is a no-op when clipboard is empty', () => {
    const store = useClipboardStore()
    const tgt = { id: 'n1', type: 'RECTANGLE', fills: [], opacity: 1 } as Record<string, unknown>
    const before = { ...tgt }
    store.pasteProps([tgt as unknown as SceneNode])
    expect(tgt).toEqual(before)
  })
})
