import { describe, expect, test } from 'bun:test'

import { BRAND_KIT_MIME } from '@/composables/brand-kit/brand-kit-dnd'
import {
  dropGhostLabel,
  hasBrandKitDrag,
  resolveBrandKitDrop,
  type BrandKitDrop,
} from '@/composables/brand-kit/resolve-brand-kit-drop'

class FakeDataTransfer {
  private store = new Map<string, string>()
  get types(): string[] {
    return [...this.store.keys()]
  }
  setData(type: string, data: string): void {
    this.store.set(type, data)
  }
  getData(type: string): string {
    return this.store.get(type) ?? ''
  }
}

function dt(entries: Record<string, unknown>): DataTransfer {
  const d = new FakeDataTransfer()
  for (const [mime, payload] of Object.entries(entries)) d.setData(mime, JSON.stringify(payload))
  return d as unknown as DataTransfer
}

describe('resolveBrandKitDrop', () => {
  test('parses color payload', () => {
    const drop = resolveBrandKitDrop(dt({ [BRAND_KIT_MIME.color]: { hex: '#f00', swatchId: 'c', brandId: 'b' } }))
    expect(drop?.kind).toBe('color')
    if (drop?.kind === 'color') expect(drop.payload.hex).toBe('#f00')
  })

  test('parses saved-block payload with nested blockData', () => {
    const drop = resolveBrandKitDrop(
      dt({
        [BRAND_KIT_MIME.savedBlock]: {
          blockId: 'sb',
          blockData: { label: 'L', content: 'Shop now', type: 'cta' },
          brandId: 'b',
        },
      }),
    )
    expect(drop?.kind).toBe('savedBlock')
    if (drop?.kind === 'savedBlock') expect(drop.payload.blockData.type).toBe('cta')
  })

  test('returns null for empty / non-brand-kit DataTransfer', () => {
    expect(resolveBrandKitDrop(dt({ 'text/plain': 'hi' }))).toBeNull()
    expect(resolveBrandKitDrop(null)).toBeNull()
  })

  test('returns null on malformed JSON', () => {
    const d = new FakeDataTransfer()
    d.setData(BRAND_KIT_MIME.color, '{not json')
    expect(resolveBrandKitDrop(d as unknown as DataTransfer)).toBeNull()
  })

  test('saved-block wins when multiple MIME present (most specific first)', () => {
    const drop = resolveBrandKitDrop(
      dt({
        [BRAND_KIT_MIME.color]: { hex: '#f00', swatchId: 'c', brandId: 'b' },
        [BRAND_KIT_MIME.savedBlock]: { blockId: 'sb', blockData: { label: 'L', content: 'c', type: 'text' }, brandId: 'b' },
      }),
    )
    expect(drop?.kind).toBe('savedBlock')
  })

  test('hasBrandKitDrag detects brand-kit MIME', () => {
    expect(hasBrandKitDrag(dt({ [BRAND_KIT_MIME.font]: { family: 'Inter', brandId: 'b' } }))).toBe(true)
    expect(hasBrandKitDrag(dt({ 'image/png': '' }))).toBe(false)
    expect(hasBrandKitDrag(null)).toBe(false)
  })
})

describe('dropGhostLabel (PRD §6.5 copy)', () => {
  const color: BrandKitDrop = { kind: 'color', payload: { hex: '#f00', swatchId: 'c', brandId: 'b' } }
  const font: BrandKitDrop = { kind: 'font', payload: { family: 'Inter', brandId: 'b' } }
  const asset: BrandKitDrop = { kind: 'asset', payload: { assetId: 'a', kind: 'logo', url: 'u', brandId: 'b' } }
  const block: BrandKitDrop = { kind: 'savedBlock', payload: { blockId: 'sb', blockData: { label: 'L', content: 'c', type: 'cta' }, brandId: 'b' } }
  const tone: BrandKitDrop = { kind: 'toneSnippet', payload: { snippetId: 's', content: 'c', brandId: 'b' } }
  const none = { shift: false, alt: false }

  test('color over layer = fill; shift = stroke; alt = additive; empty = spawn rect', () => {
    expect(dropGhostLabel(color, none, true)).toBe('Will apply as fill')
    expect(dropGhostLabel(color, { shift: true, alt: false }, true)).toBe('Will replace stroke (Shift)')
    expect(dropGhostLabel(color, { shift: false, alt: true }, true)).toBe('Will add to fill stack (Alt)')
    expect(dropGhostLabel(color, none, false)).toBe('Will spawn rect')
  })

  test('font / asset / block / tone labels', () => {
    expect(dropGhostLabel(font, none, true)).toBe('Will replace font')
    expect(dropGhostLabel(font, none, false)).toBe('Will spawn TEXT')
    expect(dropGhostLabel(asset, none, false)).toBe('Will spawn image')
    expect(dropGhostLabel(block, none, true)).toBe('Will spawn TEXT')
    expect(dropGhostLabel(tone, none, true)).toBe('Will replace text')
    expect(dropGhostLabel(tone, none, false)).toBe('Will spawn TEXT')
  })
})
