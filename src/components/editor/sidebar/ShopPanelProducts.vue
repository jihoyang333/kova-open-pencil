<script setup lang="ts">
/**
 * ShopPanelProducts — Cluster 06 Task 12 (reworked per Shopify spec §4.1 + §5.2).
 *
 * Product-reference model (NOT the ripped drag-place variant model):
 *  - lists PRODUCTS (not variants), 2-col grid, price-range from variants
 *  - whole-card multi-select (accent border + ✓ badge), no checkbox UI
 *  - search (debounced) + sort (A–Z / Price ↑ / Price ↓)
 *  - sticky bottom bar (≥1 selected): "Import N to chat" + "Clear"
 *  - emits `import` with the selected products → parent forwards to Cluster 10's
 *    useChatProductReferencesStore.importProducts; selection then clears
 *
 * Removed from the M9 version: `draggable`, `onDragStart`, `serializeShopPayload`,
 * variant-flat listing, In-stock/On-sale filter chips (spec §5.2).
 *
 * NOTE: collection-filter dropdown (spec §4.1 item 3) is deferred — the current
 * product/variant data model carries no product→collection mapping, so the
 * control would be inert. Re-add once the catalog exposes collection membership.
 */
import { computed, onMounted, ref } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { useShopifyProductsStore } from '@/stores/shopify-products'
import KovaIcon from '@/components/ui/KovaIcon.vue'

const props = defineProps<{ brandId: string }>()

export interface SelectedProduct {
  id: string
  title: string
  imageUrl: string | null
  priceLabel: string
}

const emit = defineEmits<{ import: [products: SelectedProduct[]] }>()

const store = useShopifyProductsStore()

const searchRaw = ref('')
const search = ref('')
const sortKey = ref<'title' | 'price-asc' | 'price-desc'>('title')
const selectedIds = ref<Set<string>>(new Set())

const updateSearch = useDebounceFn((val: string) => {
  search.value = val
}, 300)

function onSearchInput(e: Event): void {
  searchRaw.value = (e.target as HTMLInputElement).value
  updateSearch(searchRaw.value)
}

onMounted(() => {
  if (store.activeBrandId !== props.brandId) {
    void store.loadForBrand(props.brandId)
  }
})

interface ProductRow {
  id: string
  title: string
  imageUrl: string | null
  minPrice: number
  maxPrice: number
  priceLabel: string
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}

const rows = computed<ProductRow[]>(() => {
  const variants = [...store.variantsById.values()]
  const out: ProductRow[] = []
  for (const product of store.productsById.values()) {
    const own = variants.filter((v) => v.product_id === product.id)
    const prices = own.map((v) => v.price).filter((p) => typeof p === 'number')
    const minPrice = prices.length ? Math.min(...prices) : 0
    const maxPrice = prices.length ? Math.max(...prices) : 0
    const priceLabel =
      minPrice === maxPrice
        ? formatCurrency(minPrice)
        : `${formatCurrency(minPrice)} – ${formatCurrency(maxPrice)}`
    out.push({
      id: product.id,
      title: product.title,
      imageUrl: own.find((v) => v.image_url)?.image_url ?? null,
      minPrice,
      maxPrice,
      priceLabel,
    })
  }
  return out
})

const filtered = computed<ProductRow[]>(() => {
  let list = rows.value
  const q = search.value.trim().toLowerCase()
  if (q) list = list.filter((r) => r.title.toLowerCase().includes(q))
  if (sortKey.value === 'price-asc') list = [...list].sort((a, b) => a.minPrice - b.minPrice)
  else if (sortKey.value === 'price-desc') list = [...list].sort((a, b) => b.maxPrice - a.maxPrice)
  else list = [...list].sort((a, b) => a.title.localeCompare(b.title))
  return list
})

const selectedCount = computed(() => selectedIds.value.size)

function isSelected(id: string): boolean {
  return selectedIds.value.has(id)
}

function toggle(id: string): void {
  const next = new Set(selectedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selectedIds.value = next
}

function clearSelection(): void {
  selectedIds.value = new Set()
}

function importSelected(): void {
  if (selectedIds.value.size === 0) return
  const byId = new Map(filtered.value.map((r) => [r.id, r]))
  const products: SelectedProduct[] = [...selectedIds.value]
    .map((id) => byId.get(id))
    .filter((r): r is ProductRow => r !== undefined)
    .map((r) => ({ id: r.id, title: r.title, imageUrl: r.imageUrl, priceLabel: r.priceLabel }))
  emit('import', products)
  clearSelection()
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col" data-testid="shop-panel-products">
    <!-- Search + sort -->
    <div class="flex shrink-0 items-center gap-1.5 px-[14px] pt-2.5 pb-2">
      <input
        data-testid="shop-products-search"
        type="search"
        placeholder="Search products…"
        class="min-w-0 flex-1 rounded-md border border-line bg-fill px-2 py-1 text-[12.5px] text-ink placeholder:text-ink-3 outline-none focus:border-ink-3"
        :value="searchRaw"
        @input="onSearchInput"
      />
      <select
        data-testid="shop-products-sort"
        class="shrink-0 rounded-md border border-line bg-fill px-1.5 py-1 text-[12px] text-ink-2 outline-none"
        :value="sortKey"
        @change="sortKey = ($event.target as HTMLSelectElement).value as typeof sortKey"
      >
        <option value="title">A–Z</option>
        <option value="price-asc">Price ↑</option>
        <option value="price-desc">Price ↓</option>
      </select>
    </div>

    <!-- Product grid -->
    <div class="min-h-0 flex-1 overflow-y-auto px-[14px] pb-2">
      <div
        v-if="filtered.length === 0"
        class="py-6 text-center text-[12.5px] text-ink-3"
        data-testid="shop-products-empty"
      >
        No products found
      </div>
      <div v-else class="grid grid-cols-2 gap-2">
        <button
          v-for="row in filtered"
          :key="row.id"
          type="button"
          data-testid="shop-product-card"
          :data-selected="isSelected(row.id)"
          :aria-pressed="isSelected(row.id)"
          class="relative flex flex-col overflow-hidden rounded-md border bg-fill text-left transition-colors"
          :class="isSelected(row.id) ? 'border-accent' : 'border-line hover:border-ink-3'"
          @click="toggle(row.id)"
        >
          <span
            v-if="isSelected(row.id)"
            class="absolute right-1.5 top-1.5 z-10 grid size-4 place-items-center rounded-full bg-accent text-ink-on-primary"
            data-testid="shop-product-check"
            aria-hidden="true"
          >
            <KovaIcon name="check" size="xs" />
          </span>
          <span class="grid aspect-square w-full place-items-center overflow-hidden bg-line-2">
            <img
              v-if="row.imageUrl"
              :src="row.imageUrl"
              :alt="row.title"
              class="size-full object-cover"
            />
            <KovaIcon v-else name="image" size="md" class="text-ink-3" />
          </span>
          <span class="flex flex-col gap-0.5 p-1.5">
            <span class="truncate text-[12px] font-medium text-ink">{{ row.title }}</span>
            <span class="text-[11px] text-ink-3">{{ row.priceLabel }}</span>
          </span>
        </button>
      </div>
    </div>

    <!-- Sticky import bar -->
    <div
      v-if="selectedCount > 0"
      class="flex shrink-0 items-center gap-2 border-t border-line bg-rail px-[14px] py-2.5"
      data-testid="shop-import-bar"
    >
      <button
        type="button"
        data-testid="shop-import-button"
        class="flex-1 rounded-md bg-accent px-3 py-1.5 text-[12.5px] font-medium text-ink-on-primary hover:opacity-90"
        @click="importSelected"
      >
        Import {{ selectedCount }} to chat
      </button>
      <button
        type="button"
        data-testid="shop-clear-button"
        class="rounded-md border border-line px-3 py-1.5 text-[12.5px] text-ink-2 hover:text-ink"
        @click="clearSelection"
      >
        Clear
      </button>
    </div>
  </div>
</template>
