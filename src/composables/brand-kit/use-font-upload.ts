import { computed, ref, type ComputedRef } from 'vue'

import { useBrandFontsStore } from '@/stores/brand-fonts'
import type { BrandFont } from '@/types/brand-kit'

/**
 * Cluster 05 — useFontUpload (PRD §6.3).
 *
 * Thin wrapper over useBrandFontsStore.uploadFont exposing single-flight
 * `progress` (0–1) + `error` reactive views for FontUploadDropzone.vue.
 */
export function useFontUpload(): {
  upload: (
    brandId: string,
    file: File,
    familyName: string,
    licenseAttested: boolean,
  ) => Promise<BrandFont>
  progress: ComputedRef<number>
  error: ComputedRef<string | null>
} {
  const store = useBrandFontsStore()
  const activeKey = ref<string | null>(null)

  const progress = computed<number>(() =>
    activeKey.value ? (store.uploadProgress.get(activeKey.value) ?? 0) : 0,
  )
  const error = computed<string | null>(() =>
    activeKey.value ? (store.uploadErrors.get(activeKey.value) ?? null) : null,
  )

  async function upload(
    brandId: string,
    file: File,
    familyName: string,
    licenseAttested: boolean,
  ): Promise<BrandFont> {
    activeKey.value = `${familyName}:${file.name}`
    return store.uploadFont(brandId, file, familyName, licenseAttested)
  }

  return { upload, progress, error }
}
