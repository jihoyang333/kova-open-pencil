<script setup lang="ts">
// Cluster 05 — KbSourceDropzone.vue (B8.1, A7.3.7)
// Upload zone for KB sources (PDF/MD/TXT).

import { ref } from 'vue'

import KovaIcon from '@/components/ui/KovaIcon.vue'

const ALLOWED_TYPES = ['application/pdf', 'text/plain', 'text/markdown']
const ALLOWED_EXTS = ['.pdf', '.txt', '.md']
const MAX_BYTES = 10 * 1024 * 1024

const { compact } = defineProps<{
  /** compact = single-line zone shown when list has rows */
  compact?: boolean
}>()

const emit = defineEmits<{
  (e: 'upload', file: File): void
}>()

const isDragOver = ref(false)
const validationError = ref<string | null>(null)

function validateFile(file: File): string | null {
  const okExt = ALLOWED_EXTS.some((e) => file.name.toLowerCase().endsWith(e))
  if (!okExt) return `Unsupported format. Use ${ALLOWED_EXTS.join(', ')}.`
  if (file.size > MAX_BYTES) return `File exceeds 10 MB limit.`
  return null
}

function handleFile(file: File): void {
  const err = validateFile(file)
  if (err) { validationError.value = err; return }
  validationError.value = null
  emit('upload', file)
}

function onDrop(event: DragEvent): void {
  event.preventDefault()
  isDragOver.value = false
  const file = event.dataTransfer?.files[0]
  if (file) handleFile(file)
}

function onDragOver(event: DragEvent): void {
  event.preventDefault()
  isDragOver.value = true
}

function onDragLeave(): void {
  isDragOver.value = false
}

function onFileInput(event: Event): void {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) handleFile(file)
  target.value = ''
}

function triggerPicker(): void {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = ALLOWED_EXTS.join(',')
  input.onchange = onFileInput
  input.click()
}
</script>

<template>
  <div>
    <div
      class="upl-zone"
      :class="{ 'drag-over': isDragOver }"
      :style="compact ? { padding: '16px 24px' } : {}"
      role="button"
      tabindex="0"
      aria-label="Drop file or click to browse"
      @drop="onDrop"
      @dragover="onDragOver"
      @dragleave="onDragLeave"
      @click="triggerPicker"
      @keydown.enter="triggerPicker"
      @keydown.space.prevent="triggerPicker"
    >
      <div v-if="!compact" class="ic-tile">
        <KovaIcon name="upload-cloud" size="md" aria-hidden="true" />
      </div>
      <div class="h">
        <KovaIcon v-if="compact" name="upload-cloud" size="sm" aria-hidden="true" />
        Drop file or <span class="browse">browse</span>
      </div>
      <div v-if="!compact" class="types">{{ ALLOWED_EXTS.join(', ') }} · max 10 MB</div>
    </div>
    <div v-if="validationError" role="alert" class="bk-err">
      {{ validationError }}
    </div>
  </div>
</template>
