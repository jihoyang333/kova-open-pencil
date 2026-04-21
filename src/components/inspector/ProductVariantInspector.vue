<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useProductVariantBindingsStore } from '@/stores/product-variant-bindings'
import { useShopifyProductsStore } from '@/stores/shopify-products'
import { bindingStatus } from '@/canvas-extensions/product-variant/state'

const props = defineProps<{ frameId: string }>()
const bindings = useProductVariantBindingsStore()
const products = useShopifyProductsStore()
const { variantsByGid, variantsById } = storeToRefs(products)

const binding = computed(() => bindings.get(props.frameId))
const variant = computed(() => binding.value ? variantsByGid.value.get(binding.value.shopify_variant_id) : undefined)
const status  = computed(() => binding.value ? bindingStatus(binding.value, variant.value) : 'ok')
const siblingVariants = computed(() => {
  if (!variant.value) return []
  return [...variantsById.value.values()].filter((v) => v.product_id === variant.value?.product_id)
})

function swapTo(gid: string): void {
  const v = variantsByGid.value.get(gid)
  if (!binding.value || !v || !binding.value.snapshot) return
  bindings.set({
    ...binding.value,
    shopify_variant_id: v.shopify_variant_id,
    snapshot: { ...binding.value.snapshot, title: v.title, price: v.price, inventory: v.inventory_qty, image_url: v.image_url ?? '', captured_at: new Date().toISOString() },
  })
}
function remove(): void { bindings.remove(props.frameId) }
</script>

<template>
  <section class="flex flex-col gap-3 p-4" v-if="binding">
    <div class="flex items-center gap-2">
      <span v-if="status === 'unavailable'" class="rounded bg-red-100 px-2 py-0.5 text-xs text-red-700">Unavailable</span>
      <span v-else-if="status === 'oos'" class="rounded bg-yellow-100 px-2 py-0.5 text-xs text-yellow-800">Out of stock</span>
      <span v-else class="rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">In stock · {{ variant?.inventory_qty }}</span>
    </div>

    <label class="flex flex-col gap-1 text-xs text-neutral-600">
      Variant
      <select class="rounded border px-2 py-1 text-sm"
              :value="binding.shopify_variant_id"
              @change="(e) => swapTo((e.target as HTMLSelectElement).value)">
        <option v-for="v in siblingVariants" :key="v.id" :value="v.shopify_variant_id">{{ v.title }} · ${{ v.price }}</option>
      </select>
    </label>

    <div class="flex gap-2">
      <button class="rounded bg-neutral-900 px-3 py-1.5 text-xs text-white" @click="remove">Remove node</button>
    </div>
  </section>
</template>
