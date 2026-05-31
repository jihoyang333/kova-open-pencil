<script setup lang="ts">
// Cluster 05 — BrandLogoRow.vue (A7.3.1)
// Logo row: thumbnail + filename meta + Replace/Upload button.
// Draggable when url present (MIME: brand-asset).

import KovaButton from '@/components/ui/KovaButton.vue'
import KovaIcon from '@/components/ui/KovaIcon.vue'
import { useBrandKitDrag } from '@/composables/brand-kit/use-brand-kit-drag'
import type { BrandAssetKind } from '@/composables/brand-kit/brand-kit-dnd'

const props = defineProps<{
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
  if (!props.url || !props.assetId) return
  onLogoDragStart({ assetId: props.assetId, kind: props.kind, url: props.url }, event)
}
</script>

<template>
  <div
    class="font-row"
    :draggable="!!url && !!assetId"
    @dragstart="onDragStart"
  >
    <div style="display: flex; align-items: center; gap: 12px">
      <div
        v-if="url"
        style="width: 48px; height: 48px; border-radius: 6px; border: 1px solid var(--line); overflow: hidden; background: var(--fill); flex-shrink: 0"
      >
        <img :src="url" :alt="label" style="width: 100%; height: 100%; object-fit: contain" />
      </div>
      <div
        v-else
        style="width: 48px; height: 48px; border-radius: 6px; border: 1px solid var(--line); display: grid; place-items: center; background: var(--fill); flex-shrink: 0"
      >
        <KovaIcon name="image" size="md" aria-hidden="true" />
      </div>
      <div>
        <div class="preview" style="font-size: 13px">{{ label }}</div>
        <div class="meta">
          <span v-if="url">Uploaded</span>
          <span v-else style="color: var(--ink-3)">Not uploaded</span>
        </div>
      </div>
    </div>
    <KovaButton variant="ghost" size="sm" @click="emit('upload')">
      {{ url ? 'Replace' : 'Upload' }}
    </KovaButton>
  </div>
</template>
