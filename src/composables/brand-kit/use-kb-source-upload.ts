import { computed, ref, type ComputedRef } from 'vue'

import { useBrandKbSourcesStore } from '@/stores/brand-kb-sources'
import type { BrandKbSource } from '@/types/brand-kit'

/**
 * Cluster 05 — useKbSourceUpload (PRD §6.3). Parallels useFontUpload.
 */
export function useKbSourceUpload(): {
  upload: (brandId: string, file: File, fileName: string) => Promise<BrandKbSource>
  progress: ComputedRef<number>
  error: ComputedRef<string | null>
} {
  const store = useBrandKbSourcesStore()
  const activeKey = ref<string | null>(null)

  const progress = computed<number>(() =>
    activeKey.value ? (store.uploadProgress.get(activeKey.value) ?? 0) : 0,
  )
  const error = computed<string | null>(() =>
    activeKey.value ? (store.uploadErrors.get(activeKey.value) ?? null) : null,
  )

  async function upload(brandId: string, file: File, fileName: string): Promise<BrandKbSource> {
    activeKey.value = `${fileName}:${file.name}`
    return store.uploadSource(brandId, file, fileName)
  }

  return { upload, progress, error }
}
