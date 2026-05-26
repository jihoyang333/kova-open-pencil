import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
// C-MED8: consume the module-scope singleton — do NOT call
// useLocalStorage('kova:ui:last-brand', ...) here. Two separate refs on the
// same key are not synchronized in-tab.
import { lastActiveBrandIdRef } from '@/stores/ui-state'

import type { Brand, BrandColors, BrandFonts } from '@/types/kova/database'

export interface ShopifyBrandKit {
  primaryColor?: string
  secondaryColor?: string
  headingFont?: string
  bodyFont?: string
  logoUrl?: string
}

export interface ProposedBrandKit {
  brandId: string
  kit: ShopifyBrandKit
}

export const useBrandsStore = defineStore('brands', () => {
  const brands = ref<Brand[]>([])
  const isLoading = ref(false)
  const selectedBrandId = lastActiveBrandIdRef
  const proposedBrandKit = ref<ProposedBrandKit | null>(null)

  const sortedBrands = computed(() =>
    [...brands.value].sort((a, b) => a.name.localeCompare(b.name))
  )

  // Most-recent-first, excluding archived. The Brand type does not currently
  // expose `archived_at`, so this is structural — when the column ships the
  // filter starts removing archived rows without a code change.
  const sortedActiveBrands = computed<Brand[]>(() =>
    [...brands.value]
      .filter((b) => !isArchived(b))
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
  )

  const selectedBrand = computed(
    () => brands.value.find((b) => b.id === selectedBrandId.value) ?? null
  )

  function isArchived(b: Brand): boolean {
    const raw = (b as unknown as { archived_at?: string | null }).archived_at
    return raw != null
  }

  function selectBrand(id: string | null): void {
    selectedBrandId.value = id
  }

  // Onboarding + auth-callback fallback: pick the persisted brand if still
  // valid, otherwise drop to the most-recent active brand. Returns null when
  // the user has zero brands (caller routes to /onboarding).
  async function ensureSelectedBrand(): Promise<Brand | null> {
    if (brands.value.length === 0) {
      await fetchBrands()
    }
    const persisted = brands.value.find((b) => b.id === selectedBrandId.value)
    if (persisted && !isArchived(persisted)) {
      return persisted
    }
    const fallback = sortedActiveBrands.value[0] ?? null
    selectedBrandId.value = fallback?.id ?? null
    return fallback
  }

  async function fetchBrands(): Promise<void> {
    isLoading.value = true
    try {
      const { data, error } = await supabase.from('brands').select('*')
      if (error) throw error
      brands.value = data ?? []
    } finally {
      isLoading.value = false
    }
  }

  async function createBrand(name: string): Promise<Brand> {
    const authStore = useAuthStore()
    const userId = authStore.user?.id
    if (!userId) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('brands')
      .insert({ user_id: userId, name })
      .select()
      .single()

    if (error) throw error
    brands.value = [...brands.value, data]
    return data
  }

  async function updateBrand(
    id: string,
    updates: Partial<Omit<Brand, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
  ): Promise<void> {
    const { data, error } = await supabase
      .from('brands')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    brands.value = brands.value.map((b) => (b.id === id ? data : b))
  }

  async function deleteBrand(id: string): Promise<void> {
    const authStore = useAuthStore()
    const userId = authStore.user?.id
    if (!userId) throw new Error('Not authenticated')

    // Delete media storage files for this brand
    const { data: mediaRows } = await supabase
      .from('media')
      .select('storage_path')
      .eq('brand_id', id)

    if (mediaRows?.length) {
      const mediaPaths = mediaRows.map((r) => r.storage_path)
      await supabase.storage.from('media-assets').remove(mediaPaths)
    }
    // DB rows cascade-delete via FK, but storage files need manual cleanup

    // Delete thumbnails for all canvases under this brand
    const { data: canvasRows } = await supabase.from('canvases').select('id').eq('brand_id', id)

    if (canvasRows && canvasRows.length > 0) {
      const paths = canvasRows.map((c) => `${userId}/${c.id}.png`)
      await supabase.storage.from('thumbnails').remove(paths)
    }

    // Delete brand (cascades to canvases via FK)
    const { error } = await supabase.from('brands').delete().eq('id', id)
    if (error) throw error

    brands.value = brands.value.filter((b) => b.id !== id)
    if (selectedBrandId.value === id) {
      selectedBrandId.value = null
    }
  }

  interface CreateBrandFullInput {
    name: string
    colors?: BrandColors | null
    fonts?: BrandFonts | null
    logoFile?: File | null
    logoUrl?: string | null
    voice?: string | null
    industry?: string | null
    url?: string | null
  }

  async function createBrandFull(input: CreateBrandFullInput): Promise<Brand> {
    const authStore = useAuthStore()
    const userId = authStore.user?.id
    if (!userId) throw new Error('Not authenticated')

    const insertData: Record<string, unknown> = {
      user_id: userId,
      name: input.name
    }
    if (input.colors) insertData.colors = input.colors
    if (input.fonts) insertData.fonts = input.fonts
    if (input.voice) insertData.voice = input.voice
    if (input.industry) insertData.industry = input.industry
    if (input.url) insertData.url = input.url
    if (input.logoUrl && !input.logoFile) insertData.logo_url = input.logoUrl

    const { data, error } = await supabase.from('brands').insert(insertData).select().single()

    if (error) throw error

    let finalBrand = data

    // Upload logo file if provided
    if (input.logoFile) {
      const ext = input.logoFile.name.split('.').pop() ?? 'png'
      const path = `${userId}/${data.id}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('brand-logos')
        .upload(path, input.logoFile, { upsert: true })

      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('brand-logos').getPublicUrl(path)

        const { data: updated, error: updateError } = await supabase
          .from('brands')
          .update({ logo_url: urlData.publicUrl })
          .eq('id', data.id)
          .select()
          .single()

        if (!updateError && updated) {
          finalBrand = updated
        }
      }
    }

    brands.value = [...brands.value, finalBrand]
    return finalBrand
  }

  function proposeFromShopify(brandId: string, kit: Readonly<ShopifyBrandKit>): void {
    proposedBrandKit.value = { brandId, kit: { ...kit } }
  }

  async function applyShopifyMerge(brandId: string, chosen: Readonly<ShopifyBrandKit>): Promise<void> {
    await applyKitSelection(brandId, chosen)
  }

  async function applyKitSelection(brandId: string, kit: Readonly<ShopifyBrandKit>): Promise<void> {
    const brand = brands.value.find((b) => b.id === brandId)
    const updates: Partial<Omit<Brand, 'id' | 'user_id' | 'created_at' | 'updated_at'>> = {}

    const hasColorUpdate = kit.primaryColor !== undefined || kit.secondaryColor !== undefined
    if (hasColorUpdate) {
      const existing = brand?.colors ?? { primary: '', secondary: '', accent: '', background: '' }
      updates.colors = {
        ...existing,
        ...(kit.primaryColor !== undefined ? { primary: kit.primaryColor } : {}),
        ...(kit.secondaryColor !== undefined ? { secondary: kit.secondaryColor } : {}),
      }
    }

    const hasFontUpdate = kit.headingFont !== undefined || kit.bodyFont !== undefined
    if (hasFontUpdate) {
      const existing = brand?.fonts ?? { heading: '', body: '' }
      updates.fonts = {
        ...existing,
        ...(kit.headingFont !== undefined ? { heading: kit.headingFont } : {}),
        ...(kit.bodyFont !== undefined ? { body: kit.bodyFont } : {}),
      }
    }

    if (kit.logoUrl !== undefined) {
      updates.logo_url = kit.logoUrl
    }

    if (Object.keys(updates).length > 0) {
      await updateBrand(brandId, updates)
    }

    proposedBrandKit.value = null
  }

  return {
    brands,
    isLoading,
    selectedBrandId,
    proposedBrandKit,
    sortedBrands,
    sortedActiveBrands,
    selectedBrand,
    selectBrand,
    ensureSelectedBrand,
    fetchBrands,
    createBrand,
    updateBrand,
    deleteBrand,
    createBrandFull,
    proposeFromShopify,
    applyShopifyMerge,
    applyKitSelection
  }
})
