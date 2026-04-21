<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useDebounceFn } from '@vueuse/core'

import { supabase } from '@/lib/supabase'
import { serializeShopPayload } from '@/composables/use-shop-drop'

const props = defineProps<{ brandId: string }>()

interface Variant {
  id: string
  shopify_variant_id: string
  title: string
  price: number
  compare_at_price: number | null
  currency: string
  inventory_qty: number | null
  available: boolean
  product: { title: string; status: string } | null
  media: { url: string; position: number }[]
}

const variants = ref<Variant[]>([])
const isLoading = ref(false)
const searchRaw = ref('')
const search = ref('')
const filterInStock = ref(false)
const filterOnSale = ref(false)
const sortKey = ref<'title' | 'price-asc' | 'price-desc'>('title')

const updateSearch = useDebounceFn((val: string) => {
  search.value = val
}, 300)

function onSearchInput(e: Event) {
  searchRaw.value = (e.target as HTMLInputElement).value
  updateSearch(searchRaw.value)
}

async function fetchVariants(): Promise<void> {
  isLoading.value = true
  try {
    const { data, error } = await supabase
      .from('shopify_variants')
      .select(
        'id, shopify_variant_id, title, price, compare_at_price, currency, inventory_qty, available, product:shopify_products(title, status), media:shopify_media(url, position)'
      )
      .eq('brand_id', props.brandId)
      .order('title')
    if (error) throw error
    variants.value = (data ?? []) as Variant[]
  } finally {
    isLoading.value = false
  }
}

onMounted(fetchVariants)

const filtered = computed(() => {
  let list = variants.value

  if (search.value.trim()) {
    const q = search.value.toLowerCase()
    list = list.filter(
      (v) =>
        v.title.toLowerCase().includes(q) ||
        v.product?.title.toLowerCase().includes(q)
    )
  }

  if (filterInStock.value) {
    list = list.filter((v) => v.available)
  }

  if (filterOnSale.value) {
    list = list.filter(
      (v) => v.compare_at_price !== null && v.compare_at_price > v.price
    )
  }

  if (sortKey.value === 'price-asc') {
    list = [...list].sort((a, b) => a.price - b.price)
  } else if (sortKey.value === 'price-desc') {
    list = [...list].sort((a, b) => b.price - a.price)
  } else {
    list = [...list].sort((a, b) => a.title.localeCompare(b.title))
  }

  return list
})

function imageUrl(v: Variant): string | null {
  const sorted = [...v.media].sort((a, b) => a.position - b.position)
  return sorted[0]?.url ?? null
}

function formattedPrice(v: Variant): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: v.currency || 'USD',
  }).format(v.price)
}

function onDragStart(event: DragEvent, v: Variant): void {
  const payload = serializeShopPayload({
    type: 'shopify-variant',
    variant_id: v.shopify_variant_id,
    title: v.product?.title ?? v.title,
    price: v.price,
    currency: v.currency || 'USD',
    image_url: imageUrl(v) ?? undefined,
    brand_id: props.brandId,
  })
  event.dataTransfer?.setData('application/json', payload)
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'copy'
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden p-2">
    <!-- Search -->
    <input
      data-test-id="shop-products-search"
      type="search"
      placeholder="Search products…"
      class="w-full rounded border border-border bg-input px-2 py-1 text-xs text-surface outline-none focus:border-accent"
      :value="searchRaw"
      @input="onSearchInput"
    />

    <!-- Filter chips -->
    <div class="flex flex-wrap gap-1">
      <button
        data-test-id="shop-products-filter-in-stock"
        class="rounded-full border px-2 py-0.5 text-xs transition-colors"
        :class="filterInStock
          ? 'border-accent bg-accent text-white'
          : 'border-border text-muted hover:border-accent hover:text-surface'"
        @click="filterInStock = !filterInStock"
      >
        In stock
      </button>
      <button
        data-test-id="shop-products-filter-on-sale"
        class="rounded-full border px-2 py-0.5 text-xs transition-colors"
        :class="filterOnSale
          ? 'border-accent bg-accent text-white'
          : 'border-border text-muted hover:border-accent hover:text-surface'"
        @click="filterOnSale = !filterOnSale"
      >
        On sale
      </button>

      <!-- Sort -->
      <select
        data-test-id="shop-products-sort"
        class="ml-auto rounded border border-border bg-input px-1.5 py-0.5 text-xs text-surface outline-none"
        :value="sortKey"
        @change="sortKey = ($event.target as HTMLSelectElement).value as typeof sortKey"
      >
        <option value="title">A–Z</option>
        <option value="price-asc">Price ↑</option>
        <option value="price-desc">Price ↓</option>
      </select>
    </div>

    <!-- Product list -->
    <div class="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
      <div
        v-if="isLoading"
        class="py-4 text-center text-xs text-muted"
        data-test-id="shop-products-loading"
      >
        Loading…
      </div>

      <div
        v-else-if="filtered.length === 0"
        class="py-4 text-center text-xs text-muted"
        data-test-id="shop-products-empty"
      >
        No products found
      </div>

      <div
        v-for="v in filtered"
        :key="v.id"
        draggable="true"
        data-test-id="shop-product-card"
        class="flex cursor-grab items-center gap-2 rounded border border-border bg-panel p-1.5 transition-colors hover:border-accent active:cursor-grabbing"
        @dragstart="onDragStart($event, v)"
      >
        <div class="size-10 shrink-0 overflow-hidden rounded bg-hover">
          <img
            v-if="imageUrl(v)"
            :src="imageUrl(v)!"
            :alt="v.title"
            class="size-full object-cover"
          />
          <div v-else class="flex size-full items-center justify-center">
            <icon-lucide-image class="size-4 text-muted" />
          </div>
        </div>
        <div class="min-w-0 flex-1">
          <div class="truncate text-xs font-medium text-surface">
            {{ v.product?.title ?? v.title }}
          </div>
          <div class="text-[10px] text-muted">{{ formattedPrice(v) }}</div>
        </div>
        <icon-lucide-grip-vertical class="size-3.5 shrink-0 text-muted" />
      </div>
    </div>
  </div>
</template>
