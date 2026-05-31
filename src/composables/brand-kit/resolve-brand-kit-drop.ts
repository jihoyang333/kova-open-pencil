// Cluster 05 — Brand Kit drop resolver (PRD §6.5 / §7).
//
// Cluster 05 owns the drag PAYLOAD contract; Cluster 06 owns the canvas drop
// dispatcher (use-canvas-drop.ts). This module is the shared seam: a PURE
// function that parses a DataTransfer carrying a brand-kit MIME into a typed
// drop intent, plus the ghost-preview label copy. It touches NO editor-engine
// state, so it is fully unit-testable and never conflicts with Cluster 06's
// event wiring — the dispatcher calls `resolveBrandKitDrop` then performs the
// node mutation against the engine.

import {
  BRAND_KIT_MIME,
  type BrandAssetDragPayload,
  type BrandColorDragPayload,
  type BrandFontDragPayload,
  type SavedBlockDragPayload,
  type ToneSnippetDragPayload,
} from './brand-kit-dnd'

export interface DropModifiers {
  shift: boolean
  alt: boolean
}

export type BrandKitDrop =
  | { kind: 'color'; payload: BrandColorDragPayload }
  | { kind: 'font'; payload: BrandFontDragPayload }
  | { kind: 'asset'; payload: BrandAssetDragPayload }
  | { kind: 'savedBlock'; payload: SavedBlockDragPayload }
  | { kind: 'toneSnippet'; payload: ToneSnippetDragPayload }

/** Ordered so the most specific contract wins if several are present. */
const MIME_ORDER: ReadonlyArray<{ mime: string; kind: BrandKitDrop['kind'] }> = [
  { mime: BRAND_KIT_MIME.savedBlock, kind: 'savedBlock' },
  { mime: BRAND_KIT_MIME.toneSnippet, kind: 'toneSnippet' },
  { mime: BRAND_KIT_MIME.color, kind: 'color' },
  { mime: BRAND_KIT_MIME.font, kind: 'font' },
  { mime: BRAND_KIT_MIME.asset, kind: 'asset' },
]

/** True when the DataTransfer carries any brand-kit MIME (cheap dragover check). */
export function hasBrandKitDrag(dataTransfer: DataTransfer | null): boolean {
  if (!dataTransfer) return false
  return MIME_ORDER.some(({ mime }) => dataTransfer.types.includes(mime))
}

/** Parse the brand-kit payload from a DataTransfer, or null if none/malformed. */
export function resolveBrandKitDrop(dataTransfer: DataTransfer | null): BrandKitDrop | null {
  if (!dataTransfer) return null
  for (const { mime, kind } of MIME_ORDER) {
    const raw = dataTransfer.getData(mime)
    if (!raw) continue
    const obj = safeParse(raw)
    if (obj === null) return null
    // Validate required fields per kind before handing to the Cluster 06
    // dispatcher, which trusts the typed shape (code-review HIGH-3).
    return narrow(kind, obj)
  }
  return null
}

function safeParse(raw: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(raw)
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : null
  } catch {
    return null
  }
}

type Obj = Record<string, unknown>
const isStr = (v: unknown): v is string => typeof v === 'string'

const VALIDATORS: { [K in BrandKitDrop['kind']]: (o: Obj) => BrandKitDrop | null } = {
  color: (o) =>
    isStr(o['hex']) && isStr(o['swatchId']) && isStr(o['brandId'])
      ? { kind: 'color', payload: { hex: o['hex'], swatchId: o['swatchId'], brandId: o['brandId'] } }
      : null,
  font: (o) =>
    isStr(o['family']) && isStr(o['brandId'])
      ? {
          kind: 'font',
          payload: {
            family: o['family'],
            brandId: o['brandId'],
            ...(isStr(o['fontId']) ? { fontId: o['fontId'] } : {}),
            ...(isStr(o['fontFileUrl']) ? { fontFileUrl: o['fontFileUrl'] } : {}),
          },
        }
      : null,
  asset: (o) => {
    const k = o['kind']
    const validKind = k === 'logo' || k === 'wordmark' || k === 'image'
    return isStr(o['assetId']) && validKind && isStr(o['url']) && isStr(o['brandId'])
      ? { kind: 'asset', payload: { assetId: o['assetId'], kind: k, url: o['url'], brandId: o['brandId'] } }
      : null
  },
  savedBlock: (o) => {
    const bd = o['blockData']
    if (typeof bd !== 'object' || bd === null) return null
    const b = bd as Obj
    return isStr(o['blockId']) && isStr(o['brandId']) && isStr(b['label']) && isStr(b['content']) && isStr(b['type'])
      ? ({ kind: 'savedBlock', payload: { blockId: o['blockId'], brandId: o['brandId'], blockData: b } } as Extract<
          BrandKitDrop,
          { kind: 'savedBlock' }
        >)
      : null
  },
  toneSnippet: (o) =>
    isStr(o['snippetId']) && isStr(o['content']) && isStr(o['brandId'])
      ? { kind: 'toneSnippet', payload: { snippetId: o['snippetId'], content: o['content'], brandId: o['brandId'] } }
      : null,
}

function narrow(kind: BrandKitDrop['kind'], o: Obj): BrandKitDrop | null {
  return VALIDATORS[kind](o)
}

/**
 * Ghost-preview label copy (PRD §6.5). `overLayer` = drop target is an existing
 * layer (vs empty canvas); modifiers select stroke (Shift) / additive (Alt).
 */
export function dropGhostLabel(drop: BrandKitDrop, mods: DropModifiers, overLayer: boolean): string {
  switch (drop.kind) {
    case 'color':
      if (!overLayer) return 'Will spawn rect'
      if (mods.shift) return 'Will replace stroke (Shift)'
      if (mods.alt) return 'Will add to fill stack (Alt)'
      return 'Will apply as fill'
    case 'font':
      return overLayer ? 'Will replace font' : 'Will spawn TEXT'
    case 'asset':
      return overLayer ? 'Will apply as fill' : 'Will spawn image'
    case 'toneSnippet':
      return overLayer ? 'Will replace text' : 'Will spawn TEXT'
    case 'savedBlock':
    default:
      return 'Will spawn TEXT'
  }
}
