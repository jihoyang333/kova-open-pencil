// PRD 04 §6.3 — useBrandPicker.
//
// Founder-locked precedence (D-12 2026-05-17): URL query > Q5 Layer-2
// preference > alphabetical first. 3-mode render (D-17): empty (0 brands),
// static-label (1 brand, no chevron), dropdown (2+).

import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { supabase } from '@/lib/supabase'

export type BrandPickerMode = 'empty' | 'static-label' | 'dropdown'

export interface BrandLite {
  id: string
  name: string
}

export function useBrandPicker() {
  const route = useRoute()
  const router = useRouter()
  const brands = ref<readonly BrandLite[]>([])
  const isLoading = ref(false)
  const lastActiveBrandId = ref<string | null>(null)

  const sortedBrands = computed<readonly BrandLite[]>(() =>
    [...brands.value].sort((a, b) => a.name.localeCompare(b.name))
  )

  const mode = computed<BrandPickerMode>(() => {
    if (sortedBrands.value.length === 0) return 'empty'
    if (sortedBrands.value.length === 1) return 'static-label'
    return 'dropdown'
  })

  function selectedFromUrl(): string | null {
    const raw = route.query.brand
    return typeof raw === 'string' && raw !== '' ? raw : null
  }

  const selectedBrandId = computed<string | null>(() => {
    const urlPick = selectedFromUrl()
    if (urlPick !== null && sortedBrands.value.some(b => b.id === urlPick)) return urlPick
    if (lastActiveBrandId.value !== null && sortedBrands.value.some(b => b.id === lastActiveBrandId.value)) {
      return lastActiveBrandId.value
    }
    return sortedBrands.value[0]?.id ?? null
  })

  const selectedBrand = computed<BrandLite | null>(() => {
    if (selectedBrandId.value === null) return null
    return sortedBrands.value.find(b => b.id === selectedBrandId.value) ?? null
  })

  async function load(): Promise<void> {
    isLoading.value = true
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user === null) return
      const [{ data: brandsData }, { data: userRow }] = await Promise.all([
        supabase.from('brands').select('id, name').eq('user_id', user.id),
        supabase.from('users').select('preferences').eq('id', user.id).maybeSingle(),
      ])
      brands.value = (brandsData ?? []) as BrandLite[]
      const prefs = (userRow?.preferences as Record<string, unknown> | null) ?? {}
      const last = prefs.lastActiveBrandId
      lastActiveBrandId.value = typeof last === 'string' && last !== '' ? last : null
    } finally {
      isLoading.value = false
    }
  }

  async function selectBrand(brandId: string): Promise<void> {
    await router.replace({ query: { ...route.query, brand: brandId } })
    // Atomic single-key write via set_user_preference RPC (audit M-1).
    // Avoids read-modify-write race when two tabs update at once.
    const { error } = await supabase.rpc('set_user_preference', {
      p_key: 'lastActiveBrandId',
      p_value: brandId,
    })
    if (error) {
      console.warn(`[useBrandPicker] persist lastActiveBrandId failed (${error.code}): ${error.message}`)
      return
    }
    lastActiveBrandId.value = brandId
  }

  // Keep URL in sync when selection falls back to alphabetical first
  watch(selectedBrandId, () => {
    // no-op; consumers may use selectedBrandId directly
  })

  return {
    brands: sortedBrands,
    isLoading,
    mode,
    selectedBrandId,
    selectedBrand,
    load,
    selectBrand,
  }
}
