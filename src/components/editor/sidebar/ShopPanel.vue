<script setup lang="ts">
/**
 * ShopPanel — Cluster 06 Task 12 (reworked per Shopify spec §5.2).
 *
 * Products-only panel (per D4) — the 3-tab TabsRoot (Products / Collections /
 * Discounts) collapsed to render ShopPanelProducts directly. Collections +
 * Discounts panels were ripped in Task 13.
 *
 * Forwards the product-import emit upward; EditorView wires it to Cluster 10's
 * useChatProductReferencesStore.importProducts.
 */
import ShopPanelProducts, {
  type SelectedProduct,
} from './ShopPanelProducts.vue'

defineProps<{ brandId: string }>()

const emit = defineEmits<{ import: [products: SelectedProduct[]] }>()
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col overflow-hidden" data-testid="shop-panel">
    <ShopPanelProducts :brand-id="brandId" @import="emit('import', $event)" />
  </div>
</template>
