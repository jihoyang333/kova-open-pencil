<script setup lang="ts">
import ProductReferenceChip from '@/components/chat/ProductReferenceChip.vue'

import type { ChatProductReference } from '@/types/kova/chat'

const { references } = defineProps<{
  references: readonly ChatProductReference[]
}>()

const emit = defineEmits<{
  remove: [{ productId: string }]
}>()

function handleRemove(productId: string): void {
  emit('remove', { productId })
}
</script>

<template>
  <div
    v-if="references.length > 0"
    data-test-id="product-reference-chip-row"
    class="mb-2 flex flex-wrap gap-1.5"
  >
    <ProductReferenceChip
      v-for="ref in references"
      :key="ref.product_id"
      :reference="ref"
      @remove="handleRemove(ref.product_id)"
    />
  </div>
</template>
