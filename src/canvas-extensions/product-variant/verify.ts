import type { InferOutput } from 'valibot'
import type { ProductVariantBindingSchema } from './schema'
import { useProductVariantBindingsStore } from '@/stores/product-variant-bindings'
import { useShopifyProductsStore } from '@/stores/shopify-products'

type Binding = InferOutput<typeof ProductVariantBindingSchema>
export interface VerifyOptions { strictMode?: boolean }
export interface VerifyResult { ok: boolean; broken: Binding[]; oos: Binding[] }

export async function verifyProductVariantsOnCanvas(
  canvasId: string, options: VerifyOptions = {},
): Promise<VerifyResult> {
  const bindings = useProductVariantBindingsStore().forCanvas(canvasId)
  const products = useShopifyProductsStore()
  const broken: Binding[] = []
  const oos: Binding[] = []
  for (const b of bindings) {
    const v = products.variantsByGid.get(b.shopify_variant_id)
    if (!v) { broken.push(b); continue }
    if (v.inventory_qty <= 0 || !v.available) {
      if (options.strictMode) broken.push(b)
      else oos.push(b)
    }
  }
  return { ok: broken.length === 0, broken, oos }
}
