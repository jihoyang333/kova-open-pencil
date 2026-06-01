import { ref } from 'vue'

import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { useBrandsStore } from '@/stores/brands'

/**
 * Cluster 05 — useLogoUpload (PRD §3.2 Visuals · Logo).
 *
 * Uploads a brand logo to the existing `brand-logos` bucket (created by M3
 * onboarding; public read, RLS write-scoped to `{uid}/…`) and persists the
 * public URL onto `brands.logo_url` via `useBrandsStore.updateBrand` — the same
 * write path onboarding and the Shopify merge use. No dedicated RPC.
 *
 * Only the primary mark is wired: `brands` has a single `logo_url` column, so a
 * distinct wordmark needs a Cluster 03 schema column first (deferred).
 */

const ACCEPTED_TYPES: readonly string[] = [
  'image/png',
  'image/jpeg',
  'image/svg+xml',
  'image/webp',
]
const MAX_BYTES = 2 * 1024 * 1024

export function useLogoUpload() {
  const uploading = ref(false)
  const error = ref<string | null>(null)

  async function upload(brandId: string, file: File): Promise<string> {
    error.value = null

    if (!ACCEPTED_TYPES.includes(file.type)) {
      error.value = 'Unsupported image type (PNG, JPG, SVG, or WebP)'
      throw new Error('unsupported_type')
    }
    if (file.size > MAX_BYTES) {
      error.value = 'Logo too large (max 2 MB)'
      throw new Error('file_too_large')
    }

    const userId = useAuthStore().user?.id
    if (!userId) {
      error.value = 'Not authenticated'
      throw new Error('unauthenticated')
    }

    const brandsStore = useBrandsStore()
    uploading.value = true
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png'
      // RLS requires the first path segment to equal auth.uid().
      const path = `${userId}/${brandId}-logo-${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('brand-logos')
        .upload(path, file, { upsert: true, contentType: file.type })
      if (upErr) throw upErr

      const { data } = supabase.storage.from('brand-logos').getPublicUrl(path)
      const url = data.publicUrl
      await brandsStore.updateBrand(brandId, { logo_url: url })
      return url
    } catch (e) {
      if (error.value === null) {
        error.value = e instanceof Error ? e.message : 'upload_failed'
      }
      throw e
    } finally {
      uploading.value = false
    }
  }

  return { upload, uploading, error }
}
