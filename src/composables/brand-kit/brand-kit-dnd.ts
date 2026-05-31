// Cluster 05 — Brand Kit drag-and-drop MIME contract (PRD §6.5, Q24).
//
// This module is the single source of truth for the MIME type strings and
// JSON payload shapes. Drag sources (use-brand-kit-drag) and the canvas
// receiver dispatcher (use-canvas-drop) both import from here so the wire
// contract can never drift.

import type { SavedBlockType } from '@/types/brand-kit'

export const BRAND_KIT_MIME = {
  color: 'application/x-kova-brand-color',
  font: 'application/x-kova-brand-font',
  asset: 'application/x-kova-brand-asset',
  savedBlock: 'application/x-kova-saved-block',
  toneSnippet: 'application/x-kova-tone-snippet',
} as const

export type BrandKitMime = (typeof BRAND_KIT_MIME)[keyof typeof BRAND_KIT_MIME]

export interface BrandColorDragPayload {
  hex: string
  swatchId: string
  brandId: string
}

export interface BrandFontDragPayload {
  family: string
  fontId?: string
  fontFileUrl?: string
  brandId: string
}

export type BrandAssetKind = 'logo' | 'wordmark' | 'image'

export interface BrandAssetDragPayload {
  assetId: string
  kind: BrandAssetKind
  url: string
  brandId: string
}

export interface SavedBlockDragPayload {
  blockId: string
  blockData: { label: string; content: string; type: SavedBlockType }
  brandId: string
}

export interface ToneSnippetDragPayload {
  snippetId: string
  content: string
  brandId: string
}
