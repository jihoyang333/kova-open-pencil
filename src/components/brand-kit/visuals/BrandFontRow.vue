<script setup lang="ts">
// Cluster 05 — BrandFontRow.vue (A7.3.1, B8)
// Displays a single uploaded brand font row. Draggable (MIME: brand-font).

import KovaButton from '@/components/ui/KovaButton.vue'
import { useBrandKitDrag } from '@/composables/brand-kit/use-brand-kit-drag'
import type { BrandFont } from '@/types/brand-kit'

const props = defineProps<{
  font: BrandFont
  /** upload-progress 0–100, undefined = not uploading */
  progress?: number
  error?: string
}>()

const emit = defineEmits<{
  (e: 'delete', fontId: string): void
}>()

const { onFontDragStart } = useBrandKitDrag()

function onDragStart(event: DragEvent): void {
  onFontDragStart({ family: props.font.family_name, fontId: props.font.id }, event)
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}
</script>

<template>
  <div class="font-row" draggable="true" @dragstart="onDragStart">
    <div>
      <div class="preview" :style="{ fontFamily: font.family_name }">
        {{ font.family_name }}
      </div>
      <div class="meta">
        <span class="mono">{{ font.mime_type }}</span>
        <span>{{ formatBytes(font.file_size_bytes) }}</span>
        <span v-if="font.license_attested" class="mono">License attested</span>
      </div>
      <div v-if="error" class="meta" style="color: var(--warn)">{{ error }}</div>
    </div>
    <div v-if="progress !== undefined" class="upl-bar-track" style="width: 120px">
      <div class="upl-bar-fill" :style="{ width: `${progress}%` }" />
    </div>
    <KovaButton
      variant="ghost"
      size="sm"
      icon="trash-2"
      icon-only
      aria-label="Delete font"
      @click="emit('delete', font.id)"
    />
  </div>
</template>
