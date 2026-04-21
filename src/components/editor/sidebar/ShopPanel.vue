<script setup lang="ts">
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from 'reka-ui'

import ShopPanelCollections from './ShopPanelCollections.vue'
import ShopPanelDiscounts from './ShopPanelDiscounts.vue'
import ShopPanelProducts from './ShopPanelProducts.vue'

defineProps<{ brandId: string }>()
</script>

<template>
  <TabsRoot
    default-value="products"
    class="flex min-h-0 flex-1 flex-col overflow-hidden"
    data-test-id="shop-panel"
  >
    <TabsList class="flex shrink-0 border-b border-border">
      <TabsTrigger
        value="products"
        data-test-id="shop-tab-products"
        class="flex-1 px-2 py-1.5 text-xs transition-colors outline-none select-none data-[state=active]:border-b-2 data-[state=active]:border-accent data-[state=active]:text-surface data-[state=inactive]:text-muted data-[state=inactive]:hover:text-surface"
      >
        Products
      </TabsTrigger>
      <TabsTrigger
        value="collections"
        data-test-id="shop-tab-collections"
        class="flex-1 px-2 py-1.5 text-xs transition-colors outline-none select-none data-[state=active]:border-b-2 data-[state=active]:border-accent data-[state=active]:text-surface data-[state=inactive]:text-muted data-[state=inactive]:hover:text-surface"
      >
        Collections
      </TabsTrigger>
      <TabsTrigger
        value="discounts"
        data-test-id="shop-tab-discounts"
        class="flex-1 px-2 py-1.5 text-xs transition-colors outline-none select-none data-[state=active]:border-b-2 data-[state=active]:border-accent data-[state=active]:text-surface data-[state=inactive]:text-muted data-[state=inactive]:hover:text-surface"
      >
        Discounts
      </TabsTrigger>
    </TabsList>

    <TabsContent value="products" class="flex min-h-0 flex-1 flex-col overflow-hidden">
      <ShopPanelProducts :brand-id="brandId" />
    </TabsContent>
    <TabsContent value="collections" class="flex min-h-0 flex-1 flex-col overflow-hidden">
      <ShopPanelCollections :brand-id="brandId" />
    </TabsContent>
    <TabsContent value="discounts" class="flex min-h-0 flex-1 flex-col overflow-hidden">
      <ShopPanelDiscounts :brand-id="brandId" />
    </TabsContent>
  </TabsRoot>
</template>
