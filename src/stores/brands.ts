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

export interface CreateBrandInput {
  name: string
  url: string | null
  description: string | null
}

interface ArchiveResult {
  brand: Brand
  nextBrandId: string | null
}

async function postBrandApi<TResp>(
  endpoint: string,
  body: object,
  method: 'POST' | 'DELETE' = 'POST'
): Promise<TResp> {
  const session = await supabase.auth.getSession()
  const token = session.data.session?.access_token
  if (!token) throw new Error('Not authenticated')

  const res = await fetch(`/api/brands/${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Idempotency-Key': crypto.randomUUID().replace(/-/g, ''),
    },
    body: JSON.stringify(body),
  })

  const json = (await res.json()) as { error?: string } & TResp
  if (!res.ok) {
    const code = json.error ?? `http_${res.status}`
    throw new BrandApiError(code, res.status)
  }
  return json
}

export class BrandApiError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number
  ) {
    super(`brand api error: ${code} (${status})`)
    this.name = 'BrandApiError'
  }
}

export const useBrandsStore = defineStore('brands', () => {
  const brands = ref<Brand[]>([])
  const isLoading = ref(false)
  const isMutating = ref(false)
  const archivedFetchedAt = ref<number | null>(null)
  const selectedBrandId = lastActiveBrandIdRef
  const proposedBrandKit = ref<ProposedBrandKit | null>(null)

  const sortedBrands = computed(() =>
    [...brands.value].sort((a, b) => a.name.localeCompare(b.name))
  )

  const activeBrands = computed<Brand[]>(() => brands.value.filter((b) => !isArchived(b)))

  const archivedBrands = computed<Brand[]>(() => brands.value.filter((b) => isArchived(b)))

  const sortedActiveBrands = computed<Brand[]>(() =>
    [...activeBrands.value].sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    )
  )

  const selectedBrand = computed(
    () => brands.value.find((b) => b.id === selectedBrandId.value) ?? null
  )

  function isArchived(b: Brand): boolean {
    return b.archived_at != null
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
      brands.value = (data ?? []) as Brand[]
    } finally {
      isLoading.value = false
    }
  }

  async function fetchArchivedBrands(force = false): Promise<void> {
    const FRESH_MS = 60_000
    if (!force && archivedFetchedAt.value && Date.now() - archivedFetchedAt.value < FRESH_MS) {
      return
    }
    const { data, error } = await supabase.rpc('list_archived_brands')
    if (error) throw error
    const rows = (data ?? []) as Brand[]
    // Merge into brands[] without duplicating active rows.
    const archivedIds = new Set(rows.map((r) => r.id))
    brands.value = [
      ...brands.value.filter((b) => !archivedIds.has(b.id)),
      ...rows,
    ]
    archivedFetchedAt.value = Date.now()
  }

  // ---- LEGACY create — preserved for callers still on .createBrand(name) ----
  // Plan 03 supersedes this with the full Edge-Function-backed create. Kept
  // as a thin wrapper that calls the new flow with url/description defaulted.
  async function createBrand(name: string): Promise<Brand> {
    return createBrandFromInput({ name, url: null, description: null })
  }

  async function createBrandFromInput(input: CreateBrandInput): Promise<Brand> {
    isMutating.value = true
    try {
      const { brand } = await postBrandApi<{ brand: Brand }>('create', input)
      brands.value = [...brands.value, brand]
      return brand
    } finally {
      isMutating.value = false
    }
  }

  async function renameBrand(id: string, name: string): Promise<Brand> {
    isMutating.value = true
    try {
      const { brand } = await postBrandApi<{ brand: Brand }>('rename', { brand_id: id, name })
      brands.value = brands.value.map((b) => (b.id === id ? brand : b))
      return brand
    } finally {
      isMutating.value = false
    }
  }

  async function archiveBrand(id: string): Promise<ArchiveResult> {
    isMutating.value = true
    try {
      const { brand, next_brand_id } = await postBrandApi<{
        brand: Brand
        next_brand_id: string | null
      }>('archive', { brand_id: id })
      brands.value = brands.value.map((b) => (b.id === id ? brand : b))
      if (selectedBrandId.value === id) {
        selectedBrandId.value = next_brand_id
      }
      return { brand, nextBrandId: next_brand_id }
    } finally {
      isMutating.value = false
    }
  }

  async function restoreBrand(id: string): Promise<Brand> {
    isMutating.value = true
    try {
      const { brand } = await postBrandApi<{ brand: Brand }>('restore', { brand_id: id })
      brands.value = brands.value.map((b) => (b.id === id ? brand : b))
      return brand
    } finally {
      isMutating.value = false
    }
  }

  async function deleteBrand(id: string, typedConfirm: string): Promise<void> {
    isMutating.value = true
    try {
      await postBrandApi<{ success: true; deleted_brand_name: string }>(
        'delete',
        { brand_id: id, confirm_typed: typedConfirm },
        'POST'
      )
      brands.value = brands.value.filter((b) => b.id !== id)
      if (selectedBrandId.value === id) {
        selectedBrandId.value = sortedActiveBrands.value[0]?.id ?? null
      }
    } finally {
      isMutating.value = false
    }
  }

  // ---- LEGACY-COMPAT updateBrand: keep until C05 brand-kit takes over ----
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
    brands.value = brands.value.map((b) => (b.id === id ? (data as Brand) : b))
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
    description?: string | null
  }

  // Onboarding-flow legacy. Reach for createBrandFromInput in new code unless
  // you need the logo-upload + kit-merge path baked into a single call.
  async function createBrandFull(input: CreateBrandFullInput): Promise<Brand> {
    const authStore = useAuthStore()
    const userId = authStore.user?.id
    if (!userId) throw new Error('Not authenticated')

    // First, create the brand record via the canonical Edge Function so we
    // pick up auto-color + slug + audit + idempotency.
    const created = await createBrandFromInput({
      name: input.name,
      url: input.url ?? null,
      description: input.description ?? null,
    })

    // Then layer kit metadata on top (legacy direct table update — Cluster 05
    // will replace with /api/brand-kit endpoints).
    const updates: Partial<Omit<Brand, 'id' | 'user_id' | 'created_at' | 'updated_at'>> = {}
    if (input.colors) updates.colors = input.colors
    if (input.fonts) updates.fonts = input.fonts
    if (input.voice) updates.voice = input.voice
    if (input.industry) updates.industry = input.industry
    if (input.logoUrl && !input.logoFile) updates.logo_url = input.logoUrl

    if (Object.keys(updates).length > 0) {
      await updateBrand(created.id, updates)
    }

    if (input.logoFile) {
      const ext = input.logoFile.name.split('.').pop() ?? 'png'
      const path = `${userId}/${created.id}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('brand-logos')
        .upload(path, input.logoFile, { upsert: true })
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('brand-logos').getPublicUrl(path)
        await updateBrand(created.id, { logo_url: urlData.publicUrl })
      }
    }

    return brands.value.find((b) => b.id === created.id) ?? created
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
    isMutating,
    selectedBrandId,
    proposedBrandKit,
    sortedBrands,
    activeBrands,
    archivedBrands,
    sortedActiveBrands,
    selectedBrand,
    selectBrand,
    ensureSelectedBrand,
    fetchBrands,
    fetchArchivedBrands,
    createBrand,
    createBrandFromInput,
    renameBrand,
    archiveBrand,
    restoreBrand,
    deleteBrand,
    updateBrand,
    createBrandFull,
    proposeFromShopify,
    applyShopifyMerge,
    applyKitSelection,
  }
})
