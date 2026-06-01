import { describe, expect, it } from 'bun:test'
import * as Y from 'yjs'
import { encodeCanvasSnapshot, decodeCanvasSnapshot } from '@/composables/version-history/use-snapshot-codec'

function fakeEditor(pages: Y.Doc[]): { snapshotPage: (id: string) => Uint8Array; pageIds: string[] } {
  return {
    pageIds: pages.map((_, i) => `p${i}`),
    snapshotPage: (id: string) => Y.encodeStateAsUpdate(pages[parseInt(id.slice(1))]),
  }
}

describe('use-snapshot-codec', () => {
  it('round-trips a single-page Yjs doc through the envelope + compression', async () => {
    const doc = new Y.Doc()
    doc.getMap('test').set('hello', 'world')
    const editor = fakeEditor([doc])

    const { bytes, size_bytes } = await encodeCanvasSnapshot(editor)
    expect(bytes.byteLength).toBe(size_bytes)
    expect(size_bytes).toBeGreaterThan(0)

    const decoded = await decodeCanvasSnapshot(bytes)
    expect(decoded.format_version).toBe(1)
    expect(decoded.pages).toHaveLength(1)

    const restored = new Y.Doc()
    Y.applyUpdate(restored, decoded.pages[0].bytes)
    expect(restored.getMap('test').get('hello')).toBe('world')
  })

  it('round-trips a multi-page doc', async () => {
    const docs = [new Y.Doc(), new Y.Doc(), new Y.Doc()]
    docs.forEach((dd, i) => dd.getMap('m').set('i', i))
    const editor = fakeEditor(docs)

    const { bytes } = await encodeCanvasSnapshot(editor)
    const decoded = await decodeCanvasSnapshot(bytes)
    expect(decoded.pages).toHaveLength(3)
    decoded.pages.forEach((p, i) => {
      const r = new Y.Doc()
      Y.applyUpdate(r, p.bytes)
      expect(r.getMap('m').get('i')).toBe(i)
    })
  })

  it('throws malformed_snapshot for non-envelope bytes', async () => {
    const fake = new Uint8Array([99, 0, 0, 0])
    await expect(decodeCanvasSnapshot(fake)).rejects.toThrow(/format_version_unsupported|malformed_snapshot/)
  })
})
