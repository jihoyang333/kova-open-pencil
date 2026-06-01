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
    const copied = store.copiedProps
    expect(copied).not.toBeNull()
    expect(copied?.sourceNodeId).toBe('n1')
    expect(copied?.props.strokeWeight).toBe(2)
    expect(copied?.props.strokeAlign).toBe('INSIDE')
  })

  it('clear resets copiedProps to null', () => {
    const store = useClipboardStore()
    store.copyProps({ id: 'n1', type: 'RECTANGLE' } as unknown as SceneNode)
    store.clear()
    expect(store.copiedProps).toBeNull()
  })

  // C-LOW07b.4: buildPasteChanges must drop fields the target node type does not support
  it('buildPasteChanges drops incompatible fields when source/target node types differ', () => {
    const store = useClipboardStore()
    const src = {
      id: 'rect-1',
      type: 'RECTANGLE',
      fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0, a: 1 } }],
      strokes: [],
      strokeWeight: 4,
      strokeAlign: 'CENTER',
      cornerRadius: 12, // rectangle-only — TEXT target should NOT receive this
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
    const tgtBefore = structuredClone(tgt)

    const changes = store.buildPasteChanges([tgt as unknown as SceneNode])

    expect(changes).toHaveLength(1)
    expect(changes[0].id).toBe('text-1')
    // compatible fields present in the change set
    expect((changes[0].changes as Record<string, unknown>).fills).toEqual(
      (src as unknown as Record<string, unknown>).fills
    )
    expect((changes[0].changes as Record<string, unknown>).opacity).toBe(0.5)
    // incompatible (rectangle-only) field NOT in the change set
    expect('cornerRadius' in changes[0].changes).toBe(false)
    // PURE: the target node itself is never mutated (audit C3 — no direct mutation)
    expect(tgt).toEqual(tgtBefore)
  })

  it('buildPasteChanges keeps only Q23 fields for text→text', () => {
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

    const changes = store.buildPasteChanges([tgt as unknown as SceneNode])
    const applied = changes[0].changes as Record<string, unknown>

    // fontSize / content are NOT in the Q23 paste set — absent from the change set
    expect('fontSize' in applied).toBe(false)
    expect('content' in applied).toBe(false)
    // fills IS in the Q23 set
    expect(applied.fills).toEqual([])
  })

  it('buildPasteChanges returns [] when clipboard is empty', () => {
    const store = useClipboardStore()
    const tgt = { id: 'n1', type: 'RECTANGLE', fills: [], opacity: 1 } as Record<string, unknown>
    expect(store.buildPasteChanges([tgt as unknown as SceneNode])).toEqual([])
  })
})
