import { watch } from 'vue'
import { useShopifyProductsStore } from '@/stores/shopify-products'
import { useProductVariantBindingsStore } from '@/stores/product-variant-bindings'
import { setText, setImage } from '@/engine/tool-calls'

let started = false

export function _resetSyncForTest(): void { started = false }

export function startProductVariantSync(): void {
  if (started) return
  started = true
  const products = useShopifyProductsStore()
  const bindings = useProductVariantBindingsStore()

  watch(() => products.variantsByGid, async (map) => {
    for (const binding of bindings.byFrameId.values()) {
      const variant = map.get(binding.shopify_variant_id)
      if (!variant) continue
      if (binding.bindings.title === 'live') await setText(binding.child_ids.title_node_id, variant.title)
      if (binding.bindings.price === 'live') await setText(binding.child_ids.price_node_id, formatPrice(variant.price, binding.snapshot?.currency ?? 'USD'))
      if (binding.bindings.image === 'live' && variant.image_url) await setImage(binding.child_ids.image_node_id, variant.image_url)
    }
  }, { deep: true })
}

function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)
}
