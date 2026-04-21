<script setup lang="ts">
import { onMounted, ref } from 'vue'

import { supabase } from '@/lib/supabase'

const props = defineProps<{ brandId: string }>()

interface Collection {
  id: string
  shopify_collection_id: string
  title: string
  products_count: number
  image_url: string | null
}

const collections = ref<Collection[]>([])
const isLoading = ref(false)

async function fetchCollections(): Promise<void> {
  isLoading.value = true
  try {
    const { data, error } = await supabase
      .from('shopify_collections')
      .select('id, shopify_collection_id, title, products_count, image_url')
      .eq('brand_id', props.brandId)
      .order('title')
    if (error) throw error
    collections.value = (data ?? []) as Collection[]
  } finally {
    isLoading.value = false
  }
}

onMounted(fetchCollections)

function onDragStart(event: DragEvent, c: Collection): void {
  const payload = JSON.stringify({
    type: 'shopify-collection',
    collection_id: c.id,
    title: c.title,
    brand_id: props.brandId,
  })
  event.dataTransfer?.setData('application/json', payload)
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'copy'
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-2">
    <div
      v-if="isLoading"
      class="py-4 text-center text-xs text-muted"
      data-test-id="shop-collections-loading"
    >
      Loading…
    </div>

    <div
      v-else-if="collections.length === 0"
      class="py-4 text-center text-xs text-muted"
      data-test-id="shop-collections-empty"
    >
      No collections found
    </div>

    <div
      v-for="c in collections"
      :key="c.id"
      draggable="true"
      data-test-id="shop-collection-card"
      class="flex cursor-grab items-center gap-2 rounded border border-border bg-panel p-1.5 transition-colors hover:border-accent active:cursor-grabbing"
      @dragstart="onDragStart($event, c)"
    >
      <div class="size-10 shrink-0 overflow-hidden rounded bg-hover">
        <img
          v-if="c.image_url"
          :src="c.image_url"
          :alt="c.title"
          class="size-full object-cover"
        />
        <div v-else class="flex size-full items-center justify-center">
          <icon-lucide-layout-grid class="size-4 text-muted" />
        </div>
      </div>
      <div class="min-w-0 flex-1">
        <div class="truncate text-xs font-medium text-surface">{{ c.title }}</div>
        <div class="text-[10px] text-muted">{{ c.products_count }} products</div>
      </div>
      <icon-lucide-grip-vertical class="size-3.5 shrink-0 text-muted" />
    </div>
  </div>
</template>
