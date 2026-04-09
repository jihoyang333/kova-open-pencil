<script setup lang="ts">
import {
  ScrollAreaRoot,
  ScrollAreaScrollbar,
  ScrollAreaThumb,
  ScrollAreaViewport,
} from 'reka-ui'
import { computed, markRaw, nextTick, ref, watch } from 'vue'

import { clearToolLogEntries, didHitStepLimit } from '@/ai/tools'
import ChatInput from '@/components/chat/ChatInput.vue'
import ChatMessage from '@/components/chat/ChatMessage.vue'
import PromptChips from '@/components/chat/PromptChips.vue'
import { useAIChat } from '@/composables/use-chat'
import { useBrandsStore } from '@/stores/brands'
import { useChatStore } from '@/stores/chat'

import type { Chat } from '@ai-sdk/vue'
import type { UIMessage } from 'ai'

const props = defineProps<{
  canvasId: string
}>()

const { ensureChat, resetChat } = useAIChat()
const brandsStore = useBrandsStore()
const chatStore = useChatStore()

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

// TODO(M5.5): Wired into buildSystemPrompt() when it replaces the static system prompt.
const activeCampaignType = ref<string | undefined>(undefined)

// Initialize: load conversations for this canvas.
watch(
  () => brandsStore.selectedBrandId,
  async (brandId) => {
    if (!brandId) return
    await chatStore.fetchConversations(brandId, props.canvasId)
    if (chatStore.conversations.length === 0) {
      const conv = await chatStore.createConversation(brandId, props.canvasId)
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

async function handleSubmit(text: string, campaignType?: string) {
  if (status.value === 'streaming' || status.value === 'submitted') return
  if (!isExpanded.value) isExpanded.value = true

  activeCampaignType.value = campaignType

  try {
    initError.value = null
    const c = await ensureChat()
    if (c) chat.value = markRaw(c)
  } catch (e) {
    console.error('Failed to initialize chat:', e)
    initError.value = e instanceof Error ? e.message : String(e)
    return
  }

  // Persist user message
  if (chatStore.activeConversationId) {
    await chatStore.addMessage(chatStore.activeConversationId, 'user', text)
  }
  // TODO(M5.5): Persist assistant response on stream complete.

  chat.value?.sendMessage({ text }).catch((e: unknown) => {
    console.error('Chat error:', e)
  })
}

function handleStop() {
  chat.value?.stop()
}

async function handleNewTab() {
  const brandId = brandsStore.selectedBrandId
  if (!brandId) return
  const conv = await chatStore.createConversation(brandId, props.canvasId)
  chatStore.activeConversationId = conv.id
  chat.value = null
  resetChat()
  clearToolLogEntries()
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
    class="fixed bottom-4 left-4 z-50 flex h-[500px] w-[400px] flex-col rounded-2xl border border-border bg-panel shadow-2xl"
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
    <ChatInput :status="status" @submit="handleSubmit" @stop="handleStop" />
  </div>
</template>
