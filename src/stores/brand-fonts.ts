import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { supabase } from '@/lib/supabase'
import { postWithProgress } from '@/lib/xhr-upload'
import type { BrandFont } from '@/types/brand-kit'

/**
 * Cluster 05 — useBrandFontsStore (PRD §6.2).
 *
 * Owns the per-brand uploaded-font list, upload progress, and upload errors.
 * Upload goes through POST /api/brand-fonts/upload (multipart) via XHR so we
 * get real upload-progress events (fetch has none). Realtime keeps the list
 * fresh when another client uploads/removes a font.
 */
export const useBrandFontsStore = defineStore('brand-fonts', () => {
  const fonts = ref<BrandFont[]>([])
  const uploadProgress = ref<Map<string, number>>(new Map())
  const uploadErrors = ref<Map<string, string>>(new Map())

  const fontsForBrand = (brandId: string): BrandFont[] =>
    fonts.value.filter((f) => f.brand_id === brandId)

  const all = computed<BrandFont[]>(() => fonts.value)

  async function fetchFonts(brandId: string): Promise<void> {
    const { data, error } = await supabase
      .from('brand_fonts')
      .select('*')
      .eq('brand_id', brandId)
      .order('uploaded_at', { ascending: true })
    if (error) throw error
    fonts.value = data as BrandFont[]
  }

  function setProgress(key: string, value: number): void {
    const next = new Map(uploadProgress.value)
    next.set(key, value)
    uploadProgress.value = next
  }

  function clearProgress(key: string): void {
    const next = new Map(uploadProgress.value)
    next.delete(key)
    uploadProgress.value = next
  }

  function setError(key: string, message: string): void {
    const next = new Map(uploadErrors.value)
    next.set(key, message)
    uploadErrors.value = next
  }

  async function uploadFont(
    brandId: string,
    file: File,
    familyName: string,
    licenseAttested: boolean,
  ): Promise<BrandFont> {
    const key = `${familyName}:${file.name}`
    setProgress(key, 0)
    const next = new Map(uploadErrors.value)
    next.delete(key)
    uploadErrors.value = next

    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token ?? ''

    const form = new FormData()
    form.append('brand_id', brandId)
    form.append('family_name', familyName)
    form.append('license_attested', licenseAttested ? 'true' : 'false')
    form.append('file', file)

    try {
      const body = await postWithProgress('/api/brand-fonts/upload', form, token, (p) =>
        setProgress(key, p),
      )
      const result = body as {
        font_id: string
        file_path: string
        family_name: string
        mime_type: BrandFont['mime_type']
        file_size_bytes: number
      }
      const font: BrandFont = {
        id: result.font_id,
        brand_id: brandId,
        family_name: result.family_name,
        file_path: result.file_path,
        // Server-sniffed values, not the browser's unreliable file.type/size
        // (code-review MED-2).
        file_size_bytes: result.file_size_bytes,
        mime_type: result.mime_type,
        license_attested: true,
        uploaded_at: new Date().toISOString(),
        uploaded_by: '',
      }
      fonts.value = [...fonts.value, font]
      clearProgress(key)
      return font
    } catch (e) {
      const message = e instanceof Error ? e.message : 'upload_failed'
      setError(key, message)
      clearProgress(key)
      throw e
    }
  }

  async function deleteFont(fontId: string): Promise<void> {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token ?? ''
    const res = await fetch(`/api/brand-fonts/${fontId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error(`http_${res.status}`)
    fonts.value = fonts.value.filter((f) => f.id !== fontId)
  }

  function subscribeRealtime(brandId: string): () => void {
    const channel = supabase
      .channel(`brand:${brandId}:fonts`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'brand_fonts', filter: `brand_id=eq.${brandId}` },
        () => {
          void fetchFonts(brandId)
        },
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }

  return {
    fonts,
    all,
    uploadProgress,
    uploadErrors,
    fontsForBrand,
    fetchFonts,
    uploadFont,
    deleteFont,
    subscribeRealtime,
  }
})
