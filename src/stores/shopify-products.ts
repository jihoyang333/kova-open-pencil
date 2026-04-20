import { defineStore } from 'pinia'
import { ref, shallowReactive } from 'vue'
import { supabase } from '@/lib/supabase'

interface Product { id: string; brand_id: string; handle: string; title: string; status: string }
interface Variant { id: string; product_id: string; shopify_variant_id: string; title: string; price: number; inventory_qty: number; available: boolean; image_url?: string }
interface Collection { id: string; brand_id: string; title: string; handle: string; products_count: number }
interface Discount { id: string; brand_id: string; code: string | null; title: string; status: string }

export const useShopifyProductsStore = defineStore('shopify-products', () => {
  const activeBrandId = ref<string | null>(null)
  const productsById = shallowReactive(new Map<string, Product>())
  const variantsById = shallowReactive(new Map<string, Variant>())
  const variantsByGid = shallowReactive(new Map<string, Variant>())
  const collectionsById = shallowReactive(new Map<string, Collection>())
  const discountsById = shallowReactive(new Map<string, Discount>())
  const syncMode = ref<'realtime' | 'polling'>('realtime')
  let realtimeChannel: ReturnType<typeof supabase.channel> | null = null
  let pollingHandle: number | null = null

  function reset(): void {
    productsById.clear()
    variantsById.clear()
    variantsByGid.clear()
    collectionsById.clear()
    discountsById.clear()
  }

  async function loadForBrand(brandId: string): Promise<void> {
    reset()
    activeBrandId.value = brandId
    const [p, v, c, d] = await Promise.all([
      supabase.from('shopify_products').select('*').eq('brand_id', brandId),
      supabase.from('shopify_variants').select('*').eq('brand_id', brandId),
      supabase.from('shopify_collections').select('*').eq('brand_id', brandId),
      supabase.from('shopify_discounts').select('*').eq('brand_id', brandId),
    ])
    for (const row of (p.data ?? []) as Product[]) productsById.set(row.id, row)
    for (const row of (v.data ?? []) as Variant[]) {
      variantsById.set(row.id, row)
      variantsByGid.set(row.shopify_variant_id, row)
    }
    for (const row of (c.data ?? []) as Collection[]) collectionsById.set(row.id, row)
    for (const row of (d.data ?? []) as Discount[]) discountsById.set(row.id, row)
    subscribeRealtime(brandId)
  }

  function subscribeRealtime(brandId: string): void {
    realtimeChannel?.unsubscribe().catch(() => null)
    realtimeChannel = supabase
      .channel(`shopify-${brandId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shopify_variants', filter: `brand_id=eq.${brandId}` },
        (payload) => { if (payload.new) variantsById.set((payload.new as Variant).id, payload.new as Variant) })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shopify_products', filter: `brand_id=eq.${brandId}` },
        (payload) => { if (payload.new) productsById.set((payload.new as Product).id, payload.new as Product) })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') switchToPolling(brandId)
      })
  }

  function switchToPolling(brandId: string): void {
    syncMode.value = 'polling'
    if (pollingHandle !== null) clearInterval(pollingHandle)
    pollingHandle = window.setInterval(() => { void loadForBrand(brandId) }, 30_000)
  }

  function findVariant(gid: string): Variant | undefined {
    return variantsByGid.get(gid)
  }

  function _setVariantsForTest(vs: Variant[]): void {
    for (const v of vs) {
      variantsById.set(v.id, v)
      variantsByGid.set(v.shopify_variant_id, v)
    }
  }

  function _simulateRealtimeFailureForTest(): void {
    if (activeBrandId.value) switchToPolling(activeBrandId.value)
  }

  return {
    activeBrandId,
    productsById,
    variantsById,
    variantsByGid,
    collectionsById,
    discountsById,
    syncMode,
    loadForBrand,
    findVariant,
    _setVariantsForTest,
    _simulateRealtimeFailureForTest,
  }
})
