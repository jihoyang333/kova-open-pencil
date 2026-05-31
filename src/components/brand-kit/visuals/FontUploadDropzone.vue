<script setup lang="ts">
// Cluster 05 — FontUploadDropzone.vue (B8.2/B8.4/B8.6 + PRD §3.2)
// Drag-over / file-picker drop zone for .woff2/.ttf/.otf uploads.
// License checkbox GATES the upload button — must be ticked before upload.

import { ref } from 'vue'

import KovaButton from '@/components/ui/KovaButton.vue'
import KovaIcon from '@/components/ui/KovaIcon.vue'

const ALLOWED_TYPES = ['font/woff2', 'font/ttf', 'font/otf']
const ALLOWED_EXTS = ['.woff2', '.ttf', '.otf']
const MAX_BYTES = 5 * 1024 * 1024

const props = defineProps<{
  brandId: string
  /** upload progress 0–100; undefined = idle */
  progress?: number
  error?: string
}>()

const emit = defineEmits<{
  (e: 'upload', file: File, familyName: string, licenseAttested: boolean): void
}>()

const isDragOver = ref(false)
const licenseChecked = ref(false)
const validationError = ref<string | null>(null)
const pendingFile = ref<File | null>(null)
const familyName = ref('')

function validateFile(file: File): string | null {
  const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'))
  const okMime = ALLOWED_TYPES.includes(file.type)
  const okExt = ALLOWED_EXTS.some((e) => file.name.toLowerCase().endsWith(e))
  if (!okMime && !okExt) return `Unsupported format. Use ${ALLOWED_EXTS.join(', ')}.`
  if (file.size > MAX_BYTES) return `File exceeds 5 MB limit (${(file.size / 1048576).toFixed(1)} MB).`
  return null
}

function handleFile(file: File): void {
  const err = validateFile(file)
  if (err) {
    validationError.value = err
    pendingFile.value = null
    return
  }
  validationError.value = null
  pendingFile.value = file
  // Derive family name from filename as default (user can't edit inline — keep simple)
  familyName.value = file.name.replace(/\.(woff2|ttf|otf)$/i, '')
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

function doUpload(): void {
  const file = pendingFile.value
  if (!file || !licenseChecked.value) return
  emit('upload', file, familyName.value, true)
  pendingFile.value = null
  licenseChecked.value = false
  familyName.value = ''
}
</script>

<template>
  <div>
    <div
      class="upl-zone"
      :class="{ 'drag-over': isDragOver }"
      role="button"
      tabindex="0"
      aria-label="Drop font file or click to browse"
      @drop="onDrop"
      @dragover="onDragOver"
      @dragleave="onDragLeave"
      @click="triggerPicker"
      @keydown.enter="triggerPicker"
      @keydown.space.prevent="triggerPicker"
    >
      <div class="ic-tile">
        <KovaIcon name="upload-cloud" size="md" aria-hidden="true" />
      </div>
      <div class="h">
        Drop font here or <span class="browse">browse</span>
      </div>
      <div class="types">{{ ALLOWED_EXTS.join(', ') }} · max 5 MB</div>
    </div>

    <div v-if="validationError" class="err-inline" role="alert" style="margin-top: 6px; font-size: 12px; color: var(--warn)">
      {{ validationError }}
    </div>

    <div v-if="props.error" class="err-inline" role="alert" style="margin-top: 6px; font-size: 12px; color: var(--warn)">
      {{ props.error }}
    </div>

    <div v-if="progress !== undefined" class="upl-bar-panel" style="margin-top: 8px">
      <div class="row1">
        <div class="file-glyph">
          <KovaIcon name="file-text" size="sm" aria-hidden="true" />
        </div>
        <div class="meta">
          <div class="nm">{{ pendingFile?.name ?? 'Uploading…' }}</div>
          <div class="sub">{{ progress }}% complete</div>
        </div>
      </div>
      <div class="upl-bar-track">
        <div class="upl-bar-fill" :style="{ width: `${progress}%` }" />
      </div>
    </div>

    <div v-else-if="pendingFile" style="margin-top: 10px">
      <label class="checkbox-row" style="margin-bottom: 10px">
        <input
          v-model="licenseChecked"
          type="checkbox"
          aria-label="I have the right to use this font commercially"
        />
        <span class="checkbox" :class="{ checked: licenseChecked }">
          <KovaIcon v-if="licenseChecked" name="check" size="xs" aria-hidden="true" class="ic" />
        </span>
        <span>I have the right to use this font commercially</span>
      </label>
      <KovaButton
        variant="accent"
        size="sm"
        :disabled="!licenseChecked"
        @click="doUpload"
      >
        Upload {{ pendingFile.name }}
      </KovaButton>
    </div>
  </div>
</template>
