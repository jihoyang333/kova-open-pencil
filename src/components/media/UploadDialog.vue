<script setup lang="ts">
import { ref } from 'vue'
import { useFileDialog } from '@vueuse/core'
import {
  DialogRoot,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
  TabsRoot,
  TabsList,
  TabsTrigger,
  TabsContent,
} from 'reka-ui'
import { useMediaStore } from '@/stores/media'
import { toast } from '@/composables/use-toast'
import { MEDIA_ACCEPT_STRING, MEDIA_MAX_SIZE_BYTES, MEDIA_ACCEPTED_TYPES } from '@/types/kova/media'
import type { MediaAcceptedType } from '@/types/kova/media'

const props = defineProps<{
  open: boolean
  brandId: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const mediaStore = useMediaStore()
const activeTab = ref('upload')
const isUploading = ref(false)
const urlInput = ref('')
const urlPreview = ref<string | null>(null)
const dragOver = ref(false)

// File picker
const { open: openFilePicker, onChange } = useFileDialog({
  accept: MEDIA_ACCEPT_STRING,
  multiple: true,
})

onChange(async (files) => {
  if (!files?.length) return
  await uploadFiles(Array.from(files))
})

function validateFiles(files: File[]): File[] {
  return files.filter((f) => {
    if (!MEDIA_ACCEPTED_TYPES.includes(f.type as MediaAcceptedType)) return false
    if (f.size > MEDIA_MAX_SIZE_BYTES) {
      toast.show(`${f.name} exceeds 5 MB limit`, 'error')
      return false
    }
    return true
  })
}

async function uploadFiles(files: File[]): Promise<void> {
  const valid = validateFiles(files)
  if (valid.length === 0) return

  isUploading.value = true
  try {
    const results = await Promise.allSettled(
      valid.map((file) => mediaStore.uploadImage(props.brandId, file))
    )
    const succeeded = results.filter((r) => r.status === 'fulfilled').length
    const failed = results.filter((r) => r.status === 'rejected').length

    if (succeeded > 0) {
      toast.show(`${succeeded} image${succeeded > 1 ? 's' : ''} uploaded`)
    }
    if (failed > 0) {
      toast.show(`${failed} upload${failed > 1 ? 's' : ''} failed`, 'error')
    }
    if (failed === 0) {
      emit('update:open', false)
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Upload failed'
    toast.show(msg, 'error')
  } finally {
    isUploading.value = false
  }
}

// Drag-and-drop
function handleDrop(e: DragEvent): void {
  e.preventDefault()
  dragOver.value = false
  const files = Array.from(e.dataTransfer?.files ?? [])
  if (files.length) {
    void uploadFiles(files)
  }
}

// URL upload
async function uploadFromUrl(): Promise<void> {
  if (!urlInput.value.trim()) return
  isUploading.value = true
  try {
    await mediaStore.uploadImageFromUrl(props.brandId, urlInput.value.trim())
    toast.show('Image uploaded from URL')
    urlInput.value = ''
    urlPreview.value = null
    emit('update:open', false)
  } catch {
    toast.show('Failed to upload from URL', 'error')
  } finally {
    isUploading.value = false
  }
}

function previewUrl(): void {
  const url = urlInput.value.trim()
  urlPreview.value = (url.startsWith('https://') || url.startsWith('http://')) ? url : null
}

function handleOpenChange(open: boolean): void {
  emit('update:open', open)
  if (!open) {
    urlInput.value = ''
    urlPreview.value = null
    activeTab.value = 'upload'
  }
}
</script>

<template>
  <DialogRoot :open="props.open" @update:open="handleOpenChange">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-40 bg-black/50" />
      <DialogContent
        data-test-id="upload-dialog"
        class="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-xl"
      >
        <DialogTitle class="text-base font-semibold text-gray-900">
          Upload Images
        </DialogTitle>
        <DialogDescription class="mt-1 text-sm text-gray-500">
          Upload images from your device or paste a URL.
        </DialogDescription>

        <TabsRoot v-model="activeTab" class="mt-4">
          <TabsList class="flex gap-1 rounded-lg bg-gray-100 p-1">
            <TabsTrigger
              value="upload"
              data-test-id="upload-tab-upload"
              class="flex-1 rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm"
            >
              Upload
            </TabsTrigger>
            <TabsTrigger
              value="url"
              data-test-id="upload-tab-url"
              class="flex-1 rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm"
            >
              From URL
            </TabsTrigger>
          </TabsList>

          <!-- Upload tab -->
          <TabsContent value="upload" class="mt-4">
            <div
              data-test-id="upload-dropzone"
              class="flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-10 text-center transition-colors"
              :class="
                dragOver
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 bg-gray-50'
              "
              @dragover.prevent="dragOver = true"
              @dragleave="dragOver = false"
              @drop="handleDrop"
            >
              <icon-lucide-upload-cloud class="mb-3 size-10 text-gray-400" />
              <p class="text-sm text-gray-600">
                Drag & drop images here, or
              </p>
              <button
                data-test-id="upload-pick-files"
                class="mt-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
                :disabled="isUploading"
                @click="openFilePicker"
              >
                {{ isUploading ? 'Uploading\u2026' : 'Browse Files' }}
              </button>
              <p class="mt-2 text-xs text-gray-400">
                JPEG, PNG, GIF, WEBP, SVG — max 5 MB
              </p>
            </div>
          </TabsContent>

          <!-- URL tab -->
          <TabsContent value="url" class="mt-4 space-y-4">
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700">
                Image URL
              </label>
              <input
                v-model="urlInput"
                data-test-id="upload-url-input"
                type="url"
                placeholder="https://example.com/image.png"
                class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                @blur="previewUrl"
                @keydown.enter="uploadFromUrl"
              />
            </div>

            <!-- URL preview -->
            <div
              v-if="urlPreview"
              class="flex items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50"
            >
              <img
                :src="urlPreview"
                alt="Preview"
                class="max-h-40 object-contain"
                @error="urlPreview = null"
              />
            </div>

            <button
              data-test-id="upload-url-confirm"
              class="w-full rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
              :disabled="!urlInput.trim() || isUploading"
              @click="uploadFromUrl"
            >
              {{ isUploading ? 'Uploading\u2026' : 'Upload from URL' }}
            </button>
          </TabsContent>
        </TabsRoot>

        <div class="mt-4 flex justify-end">
          <DialogClose as-child>
            <button
              data-test-id="upload-cancel"
              class="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </DialogClose>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
