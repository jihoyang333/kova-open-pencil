<script setup lang="ts">
import { onMounted, ref } from 'vue'

import { supabase } from '@/lib/supabase'
import { useBrandsStore } from '@/stores/brands'

const props = defineProps<{ brandId: string }>()

interface Discount {
  id: string
  code: string | null
  title: string
  status: string
  value_type: string | null
  value: number | null
  ends_at: string | null
}

const discounts = ref<Discount[]>([])
const isLoading = ref(false)
const brandsStore = useBrandsStore()

async function fetchDiscounts(): Promise<void> {
  isLoading.value = true
  try {
    const { data, error } = await supabase
      .from('shopify_discounts')
      .select('id, code, title, status, value_type, value, ends_at')
      .eq('brand_id', props.brandId)
      .eq('status', 'active')
      .order('title')
    if (error) throw error
    discounts.value = (data ?? []) as Discount[]
  } finally {
    isLoading.value = false
  }
}

onMounted(fetchDiscounts)

function formattedValue(d: Discount): string {
  if (d.value === null) return ''
  if (d.value_type === 'percentage') return `${d.value}% off`
  return `$${d.value} off`
}

function onDragStart(event: DragEvent, d: Discount): void {
  const brand = brandsStore.brands.find((b) => b.id === props.brandId)
  const payload = JSON.stringify({
    type: 'shopify-discount',
    discount_id: d.id,
    code: d.code ?? d.title,
    title: d.title,
    value: formattedValue(d),
    heading_font: brand?.fonts?.heading ?? '',
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
      data-test-id="shop-discounts-loading"
    >
      Loading…
    </div>

    <div
      v-else-if="discounts.length === 0"
      class="py-4 text-center text-xs text-muted"
      data-test-id="shop-discounts-empty"
    >
      No active discounts
    </div>

    <div
      v-for="d in discounts"
      :key="d.id"
      draggable="true"
      data-test-id="shop-discount-card"
      class="flex cursor-grab items-center gap-2 rounded border border-border bg-panel p-1.5 transition-colors hover:border-accent active:cursor-grabbing"
      @dragstart="onDragStart($event, d)"
    >
      <div class="flex size-10 shrink-0 items-center justify-center rounded bg-hover">
        <icon-lucide-tag class="size-4 text-muted" />
      </div>
      <div class="min-w-0 flex-1">
        <div class="truncate text-xs font-medium font-mono text-surface">
          {{ d.code ?? d.title }}
        </div>
        <div class="text-[10px] text-muted">{{ formattedValue(d) }}</div>
      </div>
      <icon-lucide-grip-vertical class="size-3.5 shrink-0 text-muted" />
    </div>
  </div>
</template>
