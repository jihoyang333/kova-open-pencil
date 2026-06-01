import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { supabase } from '@/lib/supabase'
import { postWithProgress } from '@/lib/xhr-upload'
import type { BrandKbSource } from '@/types/brand-kit'

/**
 * Cluster 05 — useBrandKbSourcesStore (PRD §6.2).
 *
 * Per-brand knowledge-base file uploads (PDF/MD/TXT). Parallels
 * useBrandFontsStore minus the license attestation and Realtime emit
 * (KB sources are inert until the extraction worker runs — deferred).
 */
export const useBrandKbSourcesStore = defineStore('brand-kb-sources', () => {
  const sources = ref<BrandKbSource[]>([])
  const uploadProgress = ref<Map<string, number>>(new Map())
  const uploadErrors = ref<Map<string, string>>(new Map())

  const sourcesForBrand = (brandId: string): BrandKbSource[] =>
    sources.value.filter((s) => s.brand_id === brandId)

  const all = computed<BrandKbSource[]>(() => sources.value)

  async function fetchSources(brandId: string): Promise<void> {
    const { data, error } = await supabase
      .from('brand_kb_sources')
      .select('*')
      .eq('brand_id', brandId)
      .order('uploaded_at', { ascending: true })
    if (error) throw error
    sources.value = data as BrandKbSource[]
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

  async function uploadSource(
    brandId: string,
    file: File,
    fileName: string,
  ): Promise<BrandKbSource> {
    const key = `${fileName}:${file.name}`
    setProgress(key, 0)
    const cleared = new Map(uploadErrors.value)
    cleared.delete(key)
    uploadErrors.value = cleared

    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token ?? ''

    const form = new FormData()
    form.append('brand_id', brandId)
    form.append('file_name', fileName)
    form.append('file', file)

    try {
      const body = await postWithProgress('/api/brand-kb-sources/upload', form, token, (p) =>
        setProgress(key, p),
      )
      const result = body as {
        source_id: string
        file_path: string
        file_name: string
        mime_type: BrandKbSource['mime_type']
        file_size_bytes: number
      }
      const source: BrandKbSource = {
        id: result.source_id,
        brand_id: brandId,
        file_name: result.file_name,
        file_path: result.file_path,
        // Server-sniffed values, not the browser's unreliable file.type/size
        // (code-review MED-2).
        file_size_bytes: result.file_size_bytes,
        mime_type: result.mime_type,
        uploaded_at: new Date().toISOString(),
        uploaded_by: '',
        extracted_text: null,
      }
      sources.value = [...sources.value, source]
      clearProgress(key)
      return source
    } catch (e) {
      const message = e instanceof Error ? e.message : 'upload_failed'
      setError(key, message)
      clearProgress(key)
      throw e
    }
  }

  async function deleteSource(sourceId: string): Promise<void> {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token ?? ''
    const res = await fetch(`/api/brand-kb-sources/${sourceId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error(`http_${res.status}`)
    sources.value = sources.value.filter((s) => s.id !== sourceId)
  }

  return {
    sources,
    all,
    uploadProgress,
    uploadErrors,
    sourcesForBrand,
    fetchSources,
    uploadSource,
    deleteSource,
  }
})
