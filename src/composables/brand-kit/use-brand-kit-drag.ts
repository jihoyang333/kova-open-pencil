import { useBrandsStore } from '@/stores/brands'
import type { BrandColor, SavedBlock } from '@/types/brand-kit'

import {
  BRAND_KIT_MIME,
  type BrandAssetDragPayload,
  type BrandAssetKind,
  type BrandColorDragPayload,
  type BrandFontDragPayload,
  type SavedBlockDragPayload,
} from './brand-kit-dnd'

/**
 * Cluster 05 — drag-source handlers for Brand Kit assets (PRD §6.5).
 *
 * Each handler stamps the MIME type + JSON payload onto the DragEvent's
 * dataTransfer. The canvas-side receiver (use-canvas-drop) reads the same
 * MIME contract from `brand-kit-dnd.ts`.
 */
export function useBrandKitDrag(): {
  onColorDragStart: (color: BrandColor, event: DragEvent) => void
  onFontDragStart: (
    font: { family: string; fontId?: string; fontFileUrl?: string },
    event: DragEvent,
  ) => void
  onLogoDragStart: (
    logo: { assetId: string; kind: BrandAssetKind; url: string },
    event: DragEvent,
  ) => void
  onSavedBlockDragStart: (block: SavedBlock, event: DragEvent) => void
} {
  const brandsStore = useBrandsStore()

  function brandId(): string {
    const id = brandsStore.selectedBrand?.id
    if (!id) throw new Error('no_selected_brand')
    return id
  }

  function write(event: DragEvent, mime: string, payload: unknown): void {
    if (!event.dataTransfer) return
    event.dataTransfer.setData(mime, JSON.stringify(payload))
    event.dataTransfer.effectAllowed = 'copy'
  }

  function onColorDragStart(color: BrandColor, event: DragEvent): void {
    const payload: BrandColorDragPayload = {
      hex: color.hex,
      swatchId: color.id,
      brandId: brandId(),
    }
    write(event, BRAND_KIT_MIME.color, payload)
  }

  function onFontDragStart(
    font: { family: string; fontId?: string; fontFileUrl?: string },
    event: DragEvent,
  ): void {
    const payload: BrandFontDragPayload = {
      family: font.family,
      ...(font.fontId ? { fontId: font.fontId } : {}),
      ...(font.fontFileUrl ? { fontFileUrl: font.fontFileUrl } : {}),
      brandId: brandId(),
    }
    write(event, BRAND_KIT_MIME.font, payload)
  }

  function onLogoDragStart(
    logo: { assetId: string; kind: BrandAssetKind; url: string },
    event: DragEvent,
  ): void {
    const payload: BrandAssetDragPayload = {
      assetId: logo.assetId,
      kind: logo.kind,
      url: logo.url,
      brandId: brandId(),
    }
    write(event, BRAND_KIT_MIME.asset, payload)
  }

  function onSavedBlockDragStart(block: SavedBlock, event: DragEvent): void {
    const payload: SavedBlockDragPayload = {
      blockId: block.id,
      blockData: { label: block.label, content: block.content, type: block.type },
      brandId: brandId(),
    }
    write(event, BRAND_KIT_MIME.savedBlock, payload)
  }

  return { onColorDragStart, onFontDragStart, onLogoDragStart, onSavedBlockDragStart }
}
