import { describe, expect, it } from 'bun:test'

import { sniffFileType, type AllowedType } from '../../../../api/_shared/file-type-sniff'

// Cluster 05 — file-type-sniff agreement helper (PRD §5.1, 2.B.5).

const FONTS: readonly AllowedType[] = [
  { mime: 'font/woff2', extensions: ['woff2'], contentTypes: ['font/woff2', 'application/octet-stream'] },
  { mime: 'font/ttf', extensions: ['ttf'], contentTypes: ['font/ttf', 'application/octet-stream'] },
]

const KB: readonly AllowedType[] = [
  { mime: 'application/pdf', extensions: ['pdf'], contentTypes: ['application/pdf'] },
  { mime: 'text/plain', extensions: ['txt'], contentTypes: ['text/plain'], magicless: true },
]

// Real magic bytes.
const WOFF2 = new Uint8Array([0x77, 0x4f, 0x46, 0x32, 0x00, 0x01, 0x00, 0x00, 0, 0, 0, 0]) // 'wOF2'
const TTF = new Uint8Array([0x00, 0x01, 0x00, 0x00, 0x00, 0, 0, 0, 0, 0, 0, 0])
const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]) // '%PDF-1.4'
const PLAIN_TEXT = new Uint8Array([0x68, 0x65, 0x6c, 0x6c, 0x6f]) // 'hello'

describe('sniffFileType', () => {
  it('accepts woff2 when magic + ext + content-type all agree', async () => {
    const r = await sniffFileType(WOFF2, 'brand.woff2', 'font/woff2', FONTS)
    expect(r).toEqual({ ok: true, mime: 'font/woff2' })
  })

  it('accepts ttf with octet-stream content-type', async () => {
    const r = await sniffFileType(TTF, 'brand.ttf', 'application/octet-stream', FONTS)
    expect(r).toEqual({ ok: true, mime: 'font/ttf' })
  })

  it('rejects when extension is not in the allow-list', async () => {
    const r = await sniffFileType(WOFF2, 'brand.exe', 'font/woff2', FONTS)
    expect(r.ok).toBe(false)
  })

  it('rejects when content-type disagrees with extension entry', async () => {
    const r = await sniffFileType(WOFF2, 'brand.woff2', 'image/png', FONTS)
    expect(r.ok).toBe(false)
  })

  it('rejects a polyglot — woff2 ext + content-type but TTF magic bytes', async () => {
    const r = await sniffFileType(TTF, 'brand.woff2', 'font/woff2', FONTS)
    expect(r.ok).toBe(false)
  })

  it('rejects when there is no detectable magic number for a binary type', async () => {
    const r = await sniffFileType(PLAIN_TEXT, 'brand.woff2', 'font/woff2', FONTS)
    expect(r.ok).toBe(false)
  })

  it('accepts pdf with positive magic match', async () => {
    const r = await sniffFileType(PDF, 'doc.pdf', 'application/pdf', KB)
    expect(r).toEqual({ ok: true, mime: 'application/pdf' })
  })

  it('accepts magicless plain text (no magic number)', async () => {
    const r = await sniffFileType(PLAIN_TEXT, 'notes.txt', 'text/plain', KB)
    expect(r).toEqual({ ok: true, mime: 'text/plain' })
  })

  it('rejects magicless entry when bytes are actually a known binary (polyglot)', async () => {
    const r = await sniffFileType(PDF, 'notes.txt', 'text/plain', KB)
    expect(r.ok).toBe(false)
  })

  it('rejects files with no extension', async () => {
    const r = await sniffFileType(PDF, 'noext', 'application/pdf', KB)
    expect(r.ok).toBe(false)
  })
})
