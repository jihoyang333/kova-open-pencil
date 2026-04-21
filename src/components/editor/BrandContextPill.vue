<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  TooltipContent,
  TooltipPortal,
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
} from 'reka-ui'

import { supabase } from '@/lib/supabase'
import { useBrandsStore } from '@/stores/brands'
import { timeAgo } from '@/utils/time-ago'

const props = defineProps<{ brandId: string }>()

const brandsStore = useBrandsStore()

const brand = computed(() => brandsStore.brands.find((b) => b.id === props.brandId) ?? null)

interface ShopifyConnection {
  shop_domain: string
  last_synced_at: string | null
}

const connection = ref<ShopifyConnection | null>(null)

onMounted(async () => {
  const { data } = await supabase
    .from('shopify_connections')
    .select('shop_domain,last_synced_at')
    .eq('brand_id', props.brandId)
    .eq('status', 'active')
    .maybeSingle()

  if (data) {
    connection.value = data as ShopifyConnection
  }
})

defineExpose({ connection })
</script>

<template>
  <TooltipProvider :delay-duration="200">
    <TooltipRoot>
      <TooltipTrigger as-child>
        <div
          data-test-id="brand-context-pill"
          class="flex cursor-default items-center gap-1.5 rounded-full border border-border bg-panel px-2.5 py-0.5 text-xs text-muted select-none"
        >
          <icon-lucide-tag class="size-3 shrink-0" />
          <span data-test-id="brand-context-pill-name">{{ brand?.name ?? '—' }}</span>
        </div>
      </TooltipTrigger>
      <TooltipPortal>
        <TooltipContent
          data-test-id="brand-context-pill-tooltip"
          class="z-50 max-w-56 rounded bg-neutral-800 px-2.5 py-2 text-xs text-white shadow-lg"
          :side-offset="6"
          side="bottom"
        >
          <template v-if="connection">
            <div data-test-id="brand-context-pill-shop-domain" class="font-medium">
              {{ connection.shop_domain }}
            </div>
            <div data-test-id="brand-context-pill-last-sync" class="mt-0.5 text-neutral-400">
              {{ timeAgo(connection.last_synced_at) }}
            </div>
            <div class="mt-1.5 border-t border-neutral-700 pt-1.5 text-neutral-300">
              This canvas is linked to {{ brand?.name }}.
            </div>
          </template>
          <template v-else>
            <div class="text-neutral-300">
              This canvas is linked to {{ brand?.name }}.
            </div>
          </template>
        </TooltipContent>
      </TooltipPortal>
    </TooltipRoot>
  </TooltipProvider>
</template>
