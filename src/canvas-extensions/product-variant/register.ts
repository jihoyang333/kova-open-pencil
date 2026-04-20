import { startProductVariantSync } from './sync'
import { useProductVariantBindingsStore } from '@/stores/product-variant-bindings'
import { useShopifyProductsStore } from '@/stores/shopify-products'

export function registerProductVariantOverlay(): void {
  useProductVariantBindingsStore()
  useShopifyProductsStore()
  startProductVariantSync()
}
