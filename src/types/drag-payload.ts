import * as v from 'valibot'

export const BrandColorPayloadSchema = v.object({
  hex: v.pipe(v.string(), v.regex(/^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/)),
  swatchId: v.pipe(v.string(), v.uuid()),
  brandId: v.pipe(v.string(), v.uuid()),
})

export const BrandFontPayloadSchema = v.object({
  family: v.pipe(v.string(), v.minLength(1), v.maxLength(128)),
  fontId: v.optional(v.pipe(v.string(), v.uuid())),
  fontFileUrl: v.optional(v.string()),
  brandId: v.pipe(v.string(), v.uuid()),
})

export const BrandAssetPayloadSchema = v.object({
  assetId: v.pipe(v.string(), v.uuid()),
  kind: v.picklist(['logo', 'wordmark', 'image']),
  url: v.string(),
  brandId: v.pipe(v.string(), v.uuid()),
})

export const SavedBlockPayloadSchema = v.object({
  blockId: v.pipe(v.string(), v.uuid()),
  blockData: v.object({
    label: v.string(),
    content: v.string(),
    type: v.picklist(['text', 'cta', 'footer']),
  }),
  brandId: v.pipe(v.string(), v.uuid()),
})

export const ToneSnippetPayloadSchema = v.object({
  snippetId: v.pipe(v.string(), v.uuid()),
  content: v.string(),
  brandId: v.pipe(v.string(), v.uuid()),
})

export type BrandColorPayload = v.InferOutput<typeof BrandColorPayloadSchema>
export type BrandFontPayload = v.InferOutput<typeof BrandFontPayloadSchema>
export type BrandAssetPayload = v.InferOutput<typeof BrandAssetPayloadSchema>
export type SavedBlockPayload = v.InferOutput<typeof SavedBlockPayloadSchema>
export type ToneSnippetPayload = v.InferOutput<typeof ToneSnippetPayloadSchema>

export const DRAG_MIME = {
  COLOR: 'application/x-kova-brand-color',
  FONT: 'application/x-kova-brand-font',
  ASSET: 'application/x-kova-brand-asset',
  SAVED_BLOCK: 'application/x-kova-saved-block',
  TONE_SNIPPET: 'application/x-kova-tone-snippet',
} as const
