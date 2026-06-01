<script setup lang="ts">
// Cluster 05 — BrandLogoRow.vue (A7.3.1)
// Logo row: thumbnail + filename meta + Replace/Upload button.
// Draggable when url present (MIME: brand-asset).

import KovaButton from '@/components/ui/KovaButton.vue'
import KovaIcon from '@/components/ui/KovaIcon.vue'
import { useBrandKitDrag } from '@/composables/brand-kit/use-brand-kit-drag'
import type { BrandAssetKind } from '@/composables/brand-kit/brand-kit-dnd'

const { kind, label, url, assetId } = defineProps<{
  kind: BrandAssetKind
  label: string
  url: string | null
  assetId?: string
}>()

const emit = defineEmits<{
  (e: 'upload'): void
}>()

const { onLogoDragStart } = useBrandKitDrag()

function onDragStart(event: DragEvent): void {
  if (!url || !assetId) return
  onLogoDragStart({ assetId, kind, url }, event)
}
</script>

<template>
  <div
    class="font-row"
    :draggable="!!url && !!assetId"
    @dragstart="onDragStart"
  >
    <div class="bk-logo-main">
      <div
        v-if="url"
        class="bk-logo-thumb"
      >
        <img :src="url" :alt="label" class="bk-logo-img" />
      </div>
      <div
        v-else
        class="bk-logo-thumb bk-logo-thumb--empty"
      >
        <KovaIcon name="image" size="md" aria-hidden="true" />
      </div>
      <div>
        <div class="preview bk-logo-name">{{ label }}</div>
        <div class="meta">
          <span v-if="url">Uploaded</span>
          <span v-else class="bk-muted">Not uploaded</span>
        </div>
      </div>
    </div>
    <KovaButton variant="ghost" size="sm" @click="emit('upload')">
      {{ url ? 'Replace' : 'Upload' }}
    </KovaButton>
  </div>
</template>
