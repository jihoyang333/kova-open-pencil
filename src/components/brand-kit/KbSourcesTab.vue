<script setup lang="ts">
// Cluster 05 — KbSourcesTab.vue (PRD §3.8, A7.3.7, B8.7/B8.8)
// Upload PDF/MD/TXT files + multi-state list.

import { computed, onMounted, ref } from 'vue'

import EmptyState from '@/components/ui/EmptyState.vue'
import KovaSkeleton from '@/components/ui/KovaSkeleton.vue'
import KbSourceDropzone from './kb-sources/KbSourceDropzone.vue'
import KbSourceRow from './kb-sources/KbSourceRow.vue'
import { useBrandKitStore } from '@/stores/brand-kit'
import { useBrandKbSourcesStore } from '@/stores/brand-kb-sources'
import { useKbSourceUpload } from '@/composables/brand-kit/use-kb-source-upload'
import { useConfirm } from '@/composables/use-confirm'
import { toast } from '@/composables/use-toast'
import type { BrandKbSource } from '@/types/brand-kit'

const brandKitStore = useBrandKitStore()
const sourcesStore = useBrandKbSourcesStore()
const kbUpload = useKbSourceUpload()
const confirm = useConfirm()

const loading = ref(true)
const loadError = ref<string | null>(null)

const brandId = computed(() => brandKitStore.brandId)
const sources = computed<BrandKbSource[]>(() =>
  brandId.value ? sourcesStore.sourcesForBrand(brandId.value) : [],
)

onMounted(async () => {
  if (!brandId.value) { loading.value = false; return }
  try {
    await sourcesStore.fetchSources(brandId.value)
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : 'Failed to load sources'
  } finally {
    loading.value = false
  }
})

async function onUpload(file: File): Promise<void> {
  if (!brandId.value) return
  try {
    await kbUpload.upload(brandId.value, file, file.name)
    toast.show(`${file.name} uploaded.`)
  } catch (e) {
    toast.show(e instanceof Error ? e.message : 'Upload failed', 'error')
  }
}

async function onDelete(id: string): Promise<void> {
  const src = sources.value.find((s) => s.id === id)
  const ok = await confirm({
    title: 'Delete this source?',
    body: src ? `"${src.file_name}" will be removed.` : undefined,
    confirmLabel: 'Delete',
    destructive: true,
  })
  if (!ok) return
  try {
    await sourcesStore.deleteSource(id)
    toast.show('Source deleted.')
  } catch (e) {
    toast.show(e instanceof Error ? e.message : 'Failed to delete', 'error')
  }
}

function rowState(src: BrandKbSource): 'success' | 'in-progress' | 'error' | 'queued' {
  const key = `${src.file_name}:${src.file_name}`
  if (sourcesStore.uploadErrors.get(key)) return 'error'
  if ((sourcesStore.uploadProgress.get(key) ?? 0) > 0) return 'in-progress'
  return 'success'
}
</script>

<template>
  <div class="bk-pane">
    <template v-if="loading">
      <KovaSkeleton height="80px" variant="card" />
      <KovaSkeleton height="44px" variant="card" />
      <KovaSkeleton height="44px" variant="card" />
    </template>

    <template v-else-if="loadError">
      <EmptyState icon="alert-triangle" headline="Failed to load sources" :body="loadError" />
    </template>

    <template v-else>
      <KbSourceDropzone :compact="sources.length > 0" @upload="onUpload" />

      <template v-if="sources.length > 0">
        <div class="upl-list">
          <KbSourceRow
            v-for="src in sources"
            :key="src.id"
            :source="src"
            :state="rowState(src)"
            @delete="onDelete"
            @retry="onUpload(new File([], src.file_name))"
          />
        </div>
      </template>

      <EmptyState
        v-else
        icon="file-text"
        headline="No sources yet"
        body="Upload PDFs or text files as knowledge-base context for AI chat."
      />
    </template>
  </div>
</template>
