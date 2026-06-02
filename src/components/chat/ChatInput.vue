<script setup lang="ts">
import {
  TooltipContent,
  TooltipPortal,
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger
} from 'reka-ui'
import { computed, nextTick, ref } from 'vue'

import ProductReferenceChipRow from '@/components/chat/ProductReferenceChipRow.vue'
import { uiButton } from '@/components/ui/button'
import { uiInput } from '@/components/ui/input'
import KovaIcon from '@/components/ui/KovaIcon.vue'
import { SHOW_DEV_FEATURES } from '@/constants'
import { useAIChat } from '@/composables/use-chat'

import type { PendingAttachment } from '@/composables/use-chat-images'
import type { ChatProductReference } from '@/types/kova/chat'

const { modelID } = useAIChat()

const {
  status,
  attachments = [],
  productReferences = []
} = defineProps<{
  status: 'ready' | 'submitted' | 'streaming' | 'error'
  attachments?: readonly PendingAttachment[]
  productReferences?: readonly ChatProductReference[]
}>()

const emit = defineEmits<{
  submit: [text: string]
  stop: []
  'attach-image': []
  'attach-clipboard': [file: File]
  'remove-attachment': [id: string]
  'remove-reference': [{ productId: string }]
}>()

const input = ref('')
const textareaEl = ref<HTMLTextAreaElement>()

const isStreaming = computed(() => status === 'streaming' || status === 'submitted')
const selectedModelName = computed(() => modelID.value)
const hasAttachments = computed(() => attachments.length > 0)
const isUploading = computed(() => attachments.some((a) => a.isUploading))
const canSubmit = computed(
  () => (input.value.trim().length > 0 || hasAttachments.value) && !isUploading.value
)

function resizeTextarea() {
  const el = textareaEl.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, 120)}px`
}

function handleKeydown(e: KeyboardEvent) {
  if (e.code === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSubmit(e)
  }
}

function handleInput() {
  nextTick(resizeTextarea)
}

function handleSubmit(e: Event) {
  e.preventDefault()
  if (!canSubmit.value) return
  emit('submit', input.value.trim())
  input.value = ''
  nextTick(resizeTextarea)
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
          <KovaIcon name="bot" class="size-3" />
          {{ selectedModelName }}
        </div>
      </div>

      <!--
        Founder-locked composer-footer vertical order (§12.12 item 7):
        image attachments → product chips → textarea → send/stop.
      -->

      <!-- 1. Attachment thumbnails (image attachments) -->
      <div v-if="hasAttachments" class="mb-2 flex flex-wrap gap-1.5">
        <div
          v-for="a in attachments"
          :key="a.id"
          data-test-id="chat-attachment-thumbnail"
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
            <KovaIcon name="loader-circle" class="size-4 animate-spin text-white" />
          </div>
          <button
            type="button"
            data-test-id="chat-remove-attachment"
            class="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-surface text-canvas opacity-0 shadow-sm transition-opacity group-hover:opacity-100 hover:bg-hover"
            @click="emit('remove-attachment', a.id)"
          >
            <KovaIcon name="x" class="size-2.5" />
          </button>
        </div>
      </div>

      <!-- 2. Product-reference chip row (below attachments, above textarea) -->
      <ProductReferenceChipRow
        :references="productReferences"
        @remove="emit('remove-reference', $event)"
      />

      <!-- 3. Input form (textarea + send/stop) -->
      <form class="flex items-end gap-1.5" @submit="handleSubmit">
        <TooltipRoot>
          <TooltipTrigger as-child>
            <button
              type="button"
              data-test-id="chat-attach-image-button"
              class="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-hover hover:text-[#ccc] disabled:opacity-50"
              :disabled="isStreaming"
              @click="emit('attach-image')"
            >
              <KovaIcon name="image" class="size-4" />
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
        <textarea
          ref="textareaEl"
          v-model="input"
          rows="1"
          data-test-id="chat-input"
          placeholder="Design an email with Kova AI..."
          :class="
            uiInput({ class: 'min-w-0 flex-1 resize-none overflow-y-auto placeholder:text-muted' })
          "
          :disabled="isStreaming"
          @keydown="handleKeydown"
          @input="handleInput"
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
              <KovaIcon name="square" class="size-3" />
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
              <KovaIcon name="send" class="size-3" />
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
