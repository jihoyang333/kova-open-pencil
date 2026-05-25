<script setup lang="ts">
import { ref } from 'vue'

import KovaIcon from '@/components/ui/KovaIcon.vue'

// PRD 02 §3.1 + Plan T15 — A1.01.e brand kit upload + AI extraction promise.

const ACCEPTED_MIME = [
  'application/pdf',
  'text/html',
  'message/rfc822',
  'image/png',
  'image/jpeg',
]
const MAX_BYTES = 25 * 1024 * 1024

const files = ref<File[]>([])
const rejectedFiles = ref<Array<{ name: string; reason: 'too-large' | 'wrong-type' }>>([])
const guidelines = ref('')

const emit = defineEmits<{
  skip: []
  commit: [payload: { files: File[]; guidelines: string }]
}>()

function onFiles(incoming: File[]): void {
  for (const f of incoming) {
    if (f.size > MAX_BYTES) {
      rejectedFiles.value = [...rejectedFiles.value, { name: f.name, reason: 'too-large' }]
      continue
    }
    if (!ACCEPTED_MIME.includes(f.type)) {
      rejectedFiles.value = [...rejectedFiles.value, { name: f.name, reason: 'wrong-type' }]
      continue
    }
    files.value = [...files.value, f]
  }
}

function onDrop(e: DragEvent): void {
  e.preventDefault()
  if (!e.dataTransfer) return
  onFiles(Array.from(e.dataTransfer.files))
}

function openPicker(): void {
  const input = document.createElement('input')
  input.type = 'file'
  input.multiple = true
  input.accept = ACCEPTED_MIME.join(',')
  input.onchange = () => onFiles(Array.from(input.files ?? []))
  input.click()
}

function removeFile(file: File): void {
  files.value = files.value.filter((f) => f !== file)
}

defineExpose({ onFiles, rejectedFiles, files, guidelines })
</script>

<template>
  <div data-test-id="onboarding-brand-kit-step" class="onb-card wide">
    <div class="onb-eyebrow">Brand kit</div>
    <h1>Teach Kova your brand.</h1>
    <p class="onb-lede">
      Drop in past emails, brand guidelines, or anything that captures voice. Kova
      extracts colors, fonts, tone, and writing rules. You can refine everything later
      in Brand Kit.
    </p>

    <div
      data-test-id="brand-kit-drop"
      class="onb-drop"
      @dragover.prevent
      @drop="onDrop"
      @click="openPicker"
    >
      <div class="ic-circle">
        <KovaIcon name="upload" size="md" />
      </div>
      <div class="h">
        Drop files here, or
        <span class="underline cursor-pointer">browse</span>
      </div>
      <div class="types">PDF · HTML · .EML · PNG · JPG · up to 25 MB each</div>
    </div>

    <div v-if="files.length" class="onb-files">
      <div v-for="f in files" :key="f.name" class="file">
        <KovaIcon name="file-text" size="sm" />
        <div class="nm">{{ f.name }}</div>
        <div class="sz">{{ (f.size / 1024 / 1024).toFixed(1) }} MB</div>
        <button class="x" aria-label="Remove file" @click="removeFile(f)">
          <KovaIcon name="x" size="sm" />
        </button>
      </div>
    </div>

    <div class="onb-field">
      <label for="brand-guidelines-textarea" class="lbl">
        Or paste brand guidelines
        <span class="opt">Optional</span>
      </label>
      <textarea
        id="brand-guidelines-textarea"
        v-model="guidelines"
        data-test-id="brand-kit-guidelines"
        class="onb-textarea"
        placeholder="e.g. Don't use bolds in body copy. Highlight futuristic, lightweight aspects — not materials. Avoid yellow."
      />
    </div>

    <div class="onb-ai">
      <div class="top">
        <KovaIcon name="sparkles" size="sm" class="ic" />
        <span>Kova will extract</span>
        <span class="pill">AI</span>
      </div>
      <ul class="checks">
        <li><KovaIcon name="check" size="sm" class="ic" /><span>Brand colors and gradients</span></li>
        <li><KovaIcon name="check" size="sm" class="ic" /><span>Typography pairings</span></li>
        <li><KovaIcon name="check" size="sm" class="ic" /><span>Voice and tone snippets</span></li>
        <li class="pending"><KovaIcon name="circle-dashed" size="sm" class="ic" /><span>Writing rules from your notes</span></li>
        <li class="pending"><KovaIcon name="circle-dashed" size="sm" class="ic" /><span>Seed memories</span></li>
      </ul>
    </div>

    <div class="onb-actions">
      <button data-test-id="brand-kit-skip" class="btn" @click="emit('skip')">
        Do this later
      </button>
      <button
        data-test-id="brand-kit-commit"
        class="btn primary"
        @click="emit('commit', { files, guidelines })"
      >
        <KovaIcon name="sparkles" size="sm" class="ic" />
        Extract and continue
      </button>
    </div>
  </div>
</template>
