import { deflateSync, inflateSync } from 'fflate'

// Snapshot codec: packs a canvas's per-page Yjs updates into a single compressed
// blob and unpacks it back.
//
// Wire format (pre-compression):
//   MAGIC(4 = "KOVA") || format_version(u8) || pageCount(u32 BE)
//   then per page: pageIdLen(u16 BE) || pageId UTF-8 || byteLen(u32 BE) || bytes
// The whole buffer is deflate-compressed (fflate). The page payloads are already
// Yjs binary updates, so the outer envelope is intentionally minimal.
//
// NOTE: the PRD says "Zstd"; the repo ships fzstd (decompress-only) + fflate. We
// compress with fflate deflate (already a dependency, sync, no wasm init) since the
// snapshot blob is our own internal format, not a figma .fig file.

export interface SnapshotEditorAPI {
  pageIds: string[]
  snapshotPage: (pageId: string) => Uint8Array
}

export interface DecodedPage {
  pageId: string
  bytes: Uint8Array
}

export interface DecodedSnapshot {
  format_version: number
  pages: DecodedPage[]
}

export const SNAPSHOT_FORMAT_VERSION = 1
const MAGIC = new Uint8Array([0x4b, 0x4f, 0x56, 0x41]) // "KOVA"

export async function encodeCanvasSnapshot(
  editor: SnapshotEditorAPI,
): Promise<{ bytes: Uint8Array; size_bytes: number }> {
  const enc = new TextEncoder()
  const pages = editor.pageIds.map((id) => ({ idBytes: enc.encode(id), bytes: editor.snapshotPage(id) }))

  let size = MAGIC.byteLength + 1 + 4
  for (const p of pages) size += 2 + p.idBytes.byteLength + 4 + p.bytes.byteLength

  const buf = new Uint8Array(size)
  const view = new DataView(buf.buffer)
  let off = 0
  buf.set(MAGIC, off)
  off += MAGIC.byteLength
  view.setUint8(off, SNAPSHOT_FORMAT_VERSION)
  off += 1
  view.setUint32(off, pages.length, false)
  off += 4
  for (const p of pages) {
    view.setUint16(off, p.idBytes.byteLength, false)
    off += 2
    buf.set(p.idBytes, off)
    off += p.idBytes.byteLength
    view.setUint32(off, p.bytes.byteLength, false)
    off += 4
    buf.set(p.bytes, off)
    off += p.bytes.byteLength
  }

  const compressed = deflateSync(buf)
  return { bytes: compressed, size_bytes: compressed.byteLength }
}

export async function decodeCanvasSnapshot(compressed: Uint8Array): Promise<DecodedSnapshot> {
  let raw: Uint8Array
  try {
    raw = inflateSync(compressed)
  } catch {
    throw new Error('malformed_snapshot')
  }
  if (raw.byteLength < MAGIC.byteLength + 5) throw new Error('malformed_snapshot')
  const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength)
  let off = 0
  for (let i = 0; i < MAGIC.byteLength; i++) {
    if (raw[off + i] !== MAGIC[i]) throw new Error('malformed_snapshot')
  }
  off += MAGIC.byteLength
  const fv = view.getUint8(off)
  off += 1
  if (fv !== SNAPSHOT_FORMAT_VERSION) throw new Error('format_version_unsupported')
  const pageCount = view.getUint32(off, false)
  off += 4
  const dec = new TextDecoder()
  const pages: DecodedPage[] = []
  for (let i = 0; i < pageCount; i++) {
    const idLen = view.getUint16(off, false)
    off += 2
    const pageId = dec.decode(raw.subarray(off, off + idLen))
    off += idLen
    const byteLen = view.getUint32(off, false)
    off += 4
    const bytes = raw.slice(off, off + byteLen)
    off += byteLen
    pages.push({ pageId, bytes })
  }
  return { format_version: fv, pages }
}
