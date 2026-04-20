import * as v from 'valibot'
import { ProductVariantBindingSchema } from './schema'
import { useProductVariantBindingsStore } from '@/stores/product-variant-bindings'
import { createNode, setLayout, setText, setImage } from '@/engine/tool-calls'

interface Variant {
  id: string
  shopify_variant_id: string
  title: string
  price: number
  inventory_qty: number
  image_url?: string
}

interface CreateInput {
  variant: Variant
  brand_id: string
  currency?: string
}

export async function createProductVariantFrame(
  input: CreateInput,
): Promise<{ frame_id: string; child_ids: v.InferOutput<typeof ProductVariantBindingSchema>['child_ids'] }> {
  const frame_id = await createNode({ type: 'FRAME', name: `Product: ${input.variant.title}` })
  await setLayout(frame_id, { direction: 'VERTICAL', gap: 8, padding: 12 })

  const image_node_id = await createNode({ type: 'FRAME', parent: frame_id, name: 'Image' })
  await setLayout(image_node_id, { direction: 'HORIZONTAL', width: 320, height: 320 })
  if (input.variant.image_url) await setImage(image_node_id, input.variant.image_url)

  const title_node_id = await createNode({ type: 'TEXT', parent: frame_id, name: 'Title' })
  await setText(title_node_id, input.variant.title)

  const price_node_id = await createNode({ type: 'TEXT', parent: frame_id, name: 'Price' })
  await setText(price_node_id, formatPrice(input.variant.price, input.currency ?? 'USD'))

  const binding: v.InferOutput<typeof ProductVariantBindingSchema> = {
    frame_id,
    brand_id: input.brand_id,
    shopify_variant_id: input.variant.shopify_variant_id,
    bindings: { image: 'live', price: 'live', title: 'live', inventory: 'live' },
    snapshot: {
      title: input.variant.title,
      price: input.variant.price,
      currency: input.currency ?? 'USD',
      image_url: input.variant.image_url ?? '',
      inventory: input.variant.inventory_qty,
      captured_at: new Date().toISOString(),
    },
    child_ids: { image_node_id, title_node_id, price_node_id },
  }
  useProductVariantBindingsStore().set(binding)
  return { frame_id, child_ids: binding.child_ids }
}

function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)
}
