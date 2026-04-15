<script setup lang="ts">
import {
  ScrollAreaRoot,
  ScrollAreaScrollbar,
  ScrollAreaThumb,
  ScrollAreaViewport,
} from 'reka-ui'
import { computed, markRaw, nextTick, onBeforeUnmount, ref, watch } from 'vue'

import { clearToolLogEntries, didHitStepLimit } from '@/ai/tools'
import ChatInput from '@/components/chat/ChatInput.vue'
import ChatMessage from '@/components/chat/ChatMessage.vue'
import PromptChips from '@/components/chat/PromptChips.vue'
import { useAIChat } from '@/composables/use-chat'
import { useChatImages } from '@/composables/use-chat-images'
import { toast } from '@/composables/use-toast'
import { useChatStore } from '@/stores/chat'

import type { CampaignType, ChatAttachmentForAI } from '@/ai/build-system-prompt'
import type { Chat } from '@ai-sdk/vue'
import type { UIMessage } from 'ai'

const { canvasId, brandId } = defineProps<{
  canvasId: string
  brandId: string
}>()

const {
  ensureChat,
  resetChat,
  setActiveCampaignType,
  setActiveChatAttachmentsForAI,
} = useAIChat()
const chatStore = useChatStore()
const chatImages = useChatImages(brandId)
const fileInput = ref<HTMLInputElement | null>(null)

const isExpanded = ref(false)
const chat = ref<Chat<UIMessage> | null>(null)
const messagesEnd = ref<HTMLDivElement>()
const initError = ref<string | null>(null)

const messages = computed(() => chat.value?.messages ?? [])
const status = computed(() => chat.value?.status ?? 'ready')
const isThinking = computed(() => {
  const s = status.value
  if (s !== 'submitted' && s !== 'streaming') return false
  if (messages.value.length === 0) return true
  const last = messages.value[messages.value.length - 1]
  if (last.role !== 'assistant') return true
  const parts = last.parts
  if (parts.length === 0) return true
  const lastPart = parts[parts.length - 1] as Record<string, unknown>
  if (lastPart.type === 'step-start') return true
  if ('toolCallId' in lastPart && lastPart.state === 'output-available') return true
  if ('toolCallId' in lastPart && lastPart.state === 'output-error') return true
  return s === 'submitted'
})

const showContinue = computed(() => {
  if (status.value !== 'ready') return false
  if (messages.value.length === 0) return false
  const last = messages.value[messages.value.length - 1]
  return last.role === 'assistant' && didHitStepLimit()
})

// Initialize: load conversations for this canvas.
watch(
  () => brandId,
  async (bid) => {
    await chatStore.fetchConversations(bid, canvasId)
    if (chatStore.conversations.length === 0) {
      const conv = await chatStore.createConversation(bid, canvasId)
      chatStore.activeConversationId = conv.id
    } else {
      chatStore.activeConversationId = chatStore.conversations[0].id
    }
  },
  { immediate: true },
)

function scrollToBottom() {
  nextTick(() => {
    messagesEnd.value?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  })
}

watch(messages, scrollToBottom, { deep: true })

async function handleSubmit(text: string, campaignType?: CampaignType) {
  if (status.value === 'streaming' || status.value === 'submitted') return
  if (chatImages.hasPendingUploads()) {
    toast.show('Waiting for image upload to finish…', 'warning')
    return
  }
  if (!isExpanded.value) isExpanded.value = true

  setActiveCampaignType(campaignType)

  const chatAttachmentsForAI: ChatAttachmentForAI[] = chatImages.attachments.value
    .filter((a) => a.storageUrl && !a.isUploading)
    .map((a) => ({
      fileName: a.fileName,
      width: a.width,
      height: a.height,
      publicUrl: a.storageUrl as string,
    }))
  setActiveChatAttachmentsForAI(chatAttachmentsForAI)

  try {
    initError.value = null
    const c = await ensureChat()
    if (c) chat.value = markRaw(c)
  } catch (e) {
    console.error('Failed to initialize chat:', e)
    initError.value = e instanceof Error ? e.message : String(e)
    return
  }

  // Re-check after async ensureChat — an upload may have started/finished meanwhile.
  if (chatImages.hasPendingUploads()) {
    toast.show('Waiting for image upload to finish…', 'warning')
    return
  }

  let payload: { text: string; files: Awaited<ReturnType<typeof chatImages.buildMessagePayload>>['files'] }
  try {
    payload = await chatImages.buildMessagePayload(text)
  } catch (e) {
    console.error('Failed to build message payload:', e)
    toast.show('Could not prepare attached images. Please re-attach and try again.', 'error')
    return
  }

  // Persist user message (non-blocking — don't prevent AI send on persistence failure)
  if (chatStore.activeConversationId) {
    try {
      await chatStore.addMessage(chatStore.activeConversationId, 'user', payload.text)
    } catch (e) {
      console.error('Failed to persist message:', e)
    }
  }
  // TODO(M5.5): Persist assistant response on stream complete.

  chat.value
    ?.sendMessage({ text: payload.text, files: payload.files })
    .then(() => {
      // Only clear on success so the user can retry after a 401/rate-limit without re-pasting.
      chatImages.clearAttachments()
    })
    .catch((e: unknown) => {
      console.error('Chat error:', e)
      toast.show(e instanceof Error ? e.message : 'Chat request failed', 'error')
    })
}

function handleStop() {
  chat.value?.stop()
}

function handleAttachImage() {
  fileInput.value?.click()
}

async function handleFileSelected(e: Event) {
  const target = e.target as HTMLInputElement
  const files = target.files
  if (!files) return

  const images = Array.from(files).filter((f) => f.type.startsWith('image/'))
  target.value = ''
  if (images.length === 0) return

  // attachFromClipboard inserts the pending placeholder synchronously, so running these
  // in parallel is safe — each call awaits its own upload independently.
  const results = await Promise.allSettled(
    images.map((file) => chatImages.attachFromClipboard(file)),
  )
  for (const r of results) {
    if (r.status === 'rejected') {
      console.error('Failed to attach image:', r.reason)
      const msg = r.reason instanceof Error ? r.reason.message : 'Failed to attach image'
      toast.show(msg, 'error')
    }
  }
}

async function handleAttachClipboard(file: File) {
  try {
    await chatImages.attachFromClipboard(file)
  } catch (err) {
    console.error('Failed to attach pasted image:', err)
    const msg = err instanceof Error ? err.message : 'Failed to attach pasted image'
    toast.show(msg, 'error')
  }
}

function handleRemoveAttachment(id: string) {
  chatImages.removeAttachment(id)
}

onBeforeUnmount(() => {
  chatImages.clearAttachments()
})

async function handleNewTab() {
  const conv = await chatStore.createConversation(brandId, canvasId)
  chatStore.activeConversationId = conv.id
  chat.value = null
  resetChat()
  clearToolLogEntries()
  chatImages.clearAttachments()
}

async function handleSwitchTab(conversationId: string) {
  chatStore.activeConversationId = conversationId
  await chatStore.fetchMessages(conversationId)
  chat.value = null
  resetChat()
  clearToolLogEntries()
}
</script>

<template>
  <!-- Minimized bar -->
  <div
    v-if="!isExpanded"
    class="fixed bottom-4 left-4 z-50 flex h-10 w-80 cursor-pointer items-center gap-2 rounded-xl border border-border bg-panel px-3 shadow-2xl transition-all hover:shadow-[0_25px_50px_-6px_rgba(0,0,0,0.6)]"
    @click="isExpanded = true"
  >
    <icon-lucide-message-circle class="size-4 text-muted" />
    <span class="flex-1 truncate text-sm text-muted">Design with Kova AI...</span>
    <icon-lucide-send class="size-3.5 text-muted" />
  </div>

  <!-- Expanded popup -->
  <div
    v-else
    class="fixed bottom-4 left-4 z-50 flex h-[500px] w-[400px] flex-col rounded-2xl border border-border bg-panel shadow-2xl select-text"
  >
    <!-- Header: tab bar -->
    <div class="flex shrink-0 items-center gap-1 border-b border-border px-2 py-1.5">
      <div class="flex flex-1 items-center gap-1 overflow-x-auto">
        <button
          v-for="conv in chatStore.conversations"
          :key="conv.id"
          class="shrink-0 rounded-lg px-2.5 py-1 text-xs transition-colors"
          :class="
            conv.id === chatStore.activeConversationId
              ? 'bg-muted/20 font-medium text-white'
              : 'text-muted hover:bg-hover hover:text-[#ccc]'
          "
          @click="handleSwitchTab(conv.id)"
        >
          {{ conv.title ?? 'New chat' }}
        </button>
      </div>
      <button
        class="flex size-6 items-center justify-center rounded-lg text-muted transition-colors hover:bg-hover hover:text-[#ccc]"
        title="New chat"
        @click="handleNewTab"
      >
        <icon-lucide-plus class="size-3.5" />
      </button>
      <button
        class="flex size-6 items-center justify-center rounded-lg text-muted transition-colors hover:bg-hover hover:text-[#ccc]"
        title="Minimize"
        @click="isExpanded = false"
      >
        <icon-lucide-minus class="size-3.5" />
      </button>
    </div>

    <!-- Message area -->
    <ScrollAreaRoot class="min-h-0 flex-1">
      <ScrollAreaViewport class="h-full px-3 py-3 [&>div]:h-full">
        <!-- Empty state -->
        <div
          v-if="messages.length === 0"
          class="flex h-full flex-col items-center justify-center gap-4"
        >
          <div class="flex flex-col items-center gap-2 text-muted">
            <icon-lucide-sparkles class="size-8" />
            <p class="text-center text-sm">What would you like to create?</p>
          </div>
          <PromptChips @select="handleSubmit" />
        </div>

        <!-- Messages -->
        <div v-else class="flex flex-col gap-3">
          <ChatMessage v-for="msg in messages" :key="msg.id" :message="msg" />

          <!-- Thinking indicator -->
          <div v-if="isThinking" class="flex gap-2">
            <div
              class="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted/20 text-[10px] font-bold text-muted"
            >
              AI
            </div>
            <div class="flex items-center gap-1 py-2">
              <span class="size-1.5 animate-bounce rounded-full bg-muted" style="animation-delay: 0ms" />
              <span class="size-1.5 animate-bounce rounded-full bg-muted" style="animation-delay: 150ms" />
              <span class="size-1.5 animate-bounce rounded-full bg-muted" style="animation-delay: 300ms" />
            </div>
          </div>

          <!-- Continue button -->
          <div v-if="showContinue" class="flex justify-center py-2">
            <button
              class="flex items-center gap-1.5 rounded-full bg-accent/10 px-4 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent/20"
              @click="handleSubmit('Continue where you left off')"
            >
              <icon-lucide-play class="size-3" />
              Continue
            </button>
          </div>

          <div ref="messagesEnd" />
        </div>
      </ScrollAreaViewport>
      <ScrollAreaScrollbar orientation="vertical" class="flex w-1.5 touch-none p-px select-none">
        <ScrollAreaThumb class="relative flex-1 rounded-full bg-muted/30" />
      </ScrollAreaScrollbar>
    </ScrollAreaRoot>

    <!-- Error banner -->
    <div
      v-if="initError"
      class="flex items-center gap-2 border-t border-red-500/20 bg-red-500/10 px-3 py-2 text-[11px] text-red-400"
    >
      <icon-lucide-circle-alert class="size-3.5 shrink-0" />
      <span class="min-w-0 flex-1">{{ initError }}</span>
      <button class="shrink-0 text-red-300 hover:text-red-200" @click="initError = null">
        <icon-lucide-x class="size-3" />
      </button>
    </div>

    <!-- Input -->
    <ChatInput
      :status="status"
      :attachments="chatImages.attachments.value"
      @submit="handleSubmit"
      @stop="handleStop"
      @attach-image="handleAttachImage"
      @attach-clipboard="handleAttachClipboard"
      @remove-attachment="handleRemoveAttachment"
    />

    <!-- Hidden file input for image selection -->
    <!-- TODO(M5.5): Replace with media library picker dialog -->
    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      multiple
      class="hidden"
      data-test-id="chat-file-input"
      @change="handleFileSelected"
    />
  </div>
</template>
