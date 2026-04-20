import * as v from 'valibot'

export const ProductVariantBindingSchema = v.object({
  frame_id: v.string(),                           // OpenPencil scene-graph FRAME node id
  brand_id: v.pipe(v.string(), v.uuid()),
  shopify_variant_id: v.string(),                 // gid://shopify/ProductVariant/...
  bindings: v.object({
    image: v.picklist(['live', 'snapshot']),
    price: v.picklist(['live', 'snapshot']),
    title: v.picklist(['live', 'snapshot']),
    inventory: v.picklist(['live', 'snapshot']),
  }),
  snapshot: v.optional(v.object({
    title: v.string(),
    price: v.number(),
    currency: v.string(),
    image_url: v.string(),
    inventory: v.number(),
    captured_at: v.string(),
  })),
  // Convention: child node ids within the frame for each bound field.
  // Set at creation time; never reassigned without user action.
  child_ids: v.object({
    image_node_id: v.string(),
    title_node_id: v.string(),
    price_node_id: v.string(),
  }),
})

export type ProductVariantBinding = v.InferOutput<typeof ProductVariantBindingSchema>
