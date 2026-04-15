<script setup lang="ts">
import {
  TooltipContent,
  TooltipPortal,
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger
} from 'reka-ui'
import { computed, ref } from 'vue'

import { uiButton } from '@/components/ui/button'
import { uiInput } from '@/components/ui/input'
import { SHOW_DEV_FEATURES } from '@/constants'
import { useAIChat } from '@/composables/use-chat'

import type { PendingAttachment } from '@/composables/use-chat-images'

const { modelID } = useAIChat()

const { status, attachments = [] } = defineProps<{
  status: 'ready' | 'submitted' | 'streaming' | 'error'
  attachments?: readonly PendingAttachment[]
}>()

const emit = defineEmits<{
  submit: [text: string]
  stop: []
  'attach-image': []
  'attach-clipboard': [file: File]
  'remove-attachment': [id: string]
}>()

const input = ref('')

const isStreaming = computed(() => status === 'streaming' || status === 'submitted')
const selectedModelName = computed(() => modelID.value)
const hasAttachments = computed(() => attachments.length > 0)
const isUploading = computed(() => attachments.some((a) => a.isUploading))
const canSubmit = computed(
  () => (input.value.trim().length > 0 || hasAttachments.value) && !isUploading.value,
)

function handleSubmit(e: Event) {
  e.preventDefault()
  if (!canSubmit.value) return
  emit('submit', input.value.trim())
  input.value = ''
}

function handlePaste(e: ClipboardEvent) {
  const items = e.clipboardData?.items
  if (!items) return
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      e.preventDefault()
      const file = item.getAsFile()
      if (file) emit('attach-clipboard', file)
      return
    }
  }
}
</script>

<template>
  <TooltipProvider>
    <div class="shrink-0 border-t border-border px-3 py-2">
      <!-- Model display (dev only) -->
      <div v-if="SHOW_DEV_FEATURES" class="mb-1.5 flex items-center gap-1">
        <div class="flex items-center gap-1 px-1.5 py-0.5 text-[10px] text-muted">
          <icon-lucide-bot class="size-3" />
          {{ selectedModelName }}
        </div>
      </div>

      <!-- Attachment thumbnails -->
      <div v-if="hasAttachments" class="mb-2 flex flex-wrap gap-1.5">
        <div
          v-for="a in attachments"
          :key="a.id"
          class="group relative"
        >
          <img
            :src="a.localPreviewUrl"
            :alt="a.fileName"
            class="size-12 rounded-md border border-border object-cover"
          />
          <div
            v-if="a.isUploading"
            class="absolute inset-0 flex items-center justify-center rounded-md bg-black/50"
          >
            <icon-lucide-loader-circle class="size-4 animate-spin text-white" />
          </div>
          <button
            type="button"
            data-test-id="chat-remove-attachment"
            class="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-surface text-canvas opacity-0 shadow-sm transition-opacity hover:bg-hover group-hover:opacity-100"
            @click="emit('remove-attachment', a.id)"
          >
            <icon-lucide-x class="size-2.5" />
          </button>
        </div>
      </div>

      <!-- Input form -->
      <form class="flex items-center gap-1.5" @submit="handleSubmit">
        <TooltipRoot>
          <TooltipTrigger as-child>
            <button
              type="button"
              data-test-id="chat-attach-image-button"
              class="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-hover hover:text-[#ccc] disabled:opacity-50"
              :disabled="isStreaming"
              @click="emit('attach-image')"
            >
              <icon-lucide-image class="size-4" />
            </button>
          </TooltipTrigger>
          <TooltipPortal>
            <TooltipContent
              side="top"
              :side-offset="4"
              class="rounded bg-surface px-2 py-1 text-[10px] text-canvas"
            >
              Attach image
            </TooltipContent>
          </TooltipPortal>
        </TooltipRoot>
        <input
          v-model="input"
          type="text"
          data-test-id="chat-input"
          placeholder="Design an email with Kova AI..."
          :class="uiInput({ class: 'min-w-0 flex-1 placeholder:text-muted' })"
          :disabled="isStreaming"
          @paste="handlePaste"
          @copy.stop
          @cut.stop
        />
        <TooltipRoot v-if="isStreaming">
          <TooltipTrigger as-child>
            <button
              type="button"
              data-test-id="chat-stop-button"
              :class="
                uiButton({
                  tone: 'accent',
                  shape: 'rounded',
                  size: 'sm',
                  class: 'shrink-0 px-2.5 py-1.5 font-medium'
                })
              "
              @click="emit('stop')"
            >
              <icon-lucide-square class="size-3" />
            </button>
          </TooltipTrigger>
          <TooltipPortal>
            <TooltipContent
              side="top"
              :side-offset="4"
              class="rounded bg-surface px-2 py-1 text-[10px] text-canvas"
            >
              Stop generating
            </TooltipContent>
          </TooltipPortal>
        </TooltipRoot>
        <TooltipRoot v-else>
          <TooltipTrigger as-child>
            <button
              type="submit"
              data-test-id="chat-send-button"
              :class="
                uiButton({
                  tone: 'accent',
                  shape: 'rounded',
                  size: 'sm',
                  class: 'shrink-0 px-2.5 py-1.5 font-medium'
                })
              "
              :disabled="!canSubmit"
            >
              <icon-lucide-send class="size-3" />
            </button>
          </TooltipTrigger>
          <TooltipPortal>
            <TooltipContent
              side="top"
              :side-offset="4"
              class="rounded bg-surface px-2 py-1 text-[10px] text-canvas"
            >
              Send message
            </TooltipContent>
          </TooltipPortal>
        </TooltipRoot>
      </form>
    </div>
  </TooltipProvider>
</template>
