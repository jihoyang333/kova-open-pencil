import { defineStore } from 'pinia'
import { ref } from 'vue'

import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'

import type {
  ChatConversation,
  ChatMessage,
  ChatMessageAttachment,
  ChatProductReference
} from '@/types/kova/chat'

export const useChatStore = defineStore('chat', () => {
  const authStore = useAuthStore()

  const conversations = ref<ChatConversation[]>([])
  const messages = ref<ChatMessage[]>([])
  const activeConversationId = ref<string | null>(null)
  const isLoading = ref(false)

  async function fetchConversations(brandId: string, canvasId: string): Promise<void> {
    isLoading.value = true
    try {
      const { data, error } = await supabase
        .from('chat_conversations')
        .select('*')
        .eq('brand_id', brandId)
        .eq('canvas_id', canvasId)
        .order('updated_at', { ascending: false })

      if (error) throw new Error(error.message)
      conversations.value = data ?? []
    } finally {
      isLoading.value = false
    }
  }

  async function createConversation(brandId: string, canvasId: string): Promise<ChatConversation> {
    const userId = authStore.user?.id
    if (!userId) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('chat_conversations')
      .insert({ user_id: userId, brand_id: brandId, canvas_id: canvasId })
      .select()
      .single()

    if (error || !data) throw new Error(error?.message ?? 'Failed to create conversation')

    const conversation = data as ChatConversation
    conversations.value = [conversation, ...conversations.value]
    return conversation
  }

  async function deleteConversation(conversationId: string): Promise<void> {
    const { error } = await supabase.from('chat_conversations').delete().eq('id', conversationId)

    if (error) throw new Error(error.message)

    conversations.value = conversations.value.filter((c) => c.id !== conversationId)
    if (activeConversationId.value === conversationId) {
      activeConversationId.value = conversations.value[0]?.id ?? null
      messages.value = []
    }
  }

  async function fetchMessages(conversationId: string): Promise<void> {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (error) throw new Error(error.message)
    messages.value = data ?? []
  }

  async function addMessage(
    conversationId: string,
    role: 'user' | 'assistant',
    content: string,
    attachments: readonly ChatMessageAttachment[] = [],
    toolCalls: readonly Record<string, unknown>[] = []
  ): Promise<ChatMessage> {
    const userId = authStore.user?.id
    if (!userId) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: conversationId,
        user_id: userId,
        role,
        content,
        attachments,
        tool_calls: toolCalls
      })
      .select()
      .single()

    if (error || !data) throw new Error(error?.message ?? 'Failed to add message')

    const message = data as ChatMessage
    if (activeConversationId.value === conversationId) {
      messages.value = [...messages.value, message]
    }
    return message
  }

  async function updateConversationTitle(conversationId: string, title: string): Promise<void> {
    const now = new Date().toISOString()

    const { error } = await supabase
      .from('chat_conversations')
      .update({ title, updated_at: now })
      .eq('id', conversationId)

    if (error) throw new Error(error.message)

    conversations.value = conversations.value.map((c) =>
      c.id === conversationId ? { ...c, title, updated_at: now } : c
    )
  }

  /**
   * W4 C-MED27: SINGLE MUTATION ENTRY for chat_conversations.product_references.
   * All callers (useChatProductReferencesStore.importProducts / removeReference /
   * clearReferences; chip UI; Shop-panel import) MUST invoke this action — no direct
   * `supabase.from('chat_conversations').update({ product_references })` is allowed
   * anywhere else in the codebase.
   *
   * Order: persist to Supabase FIRST, then patch local Pinia state. A failed persist
   * leaves local state unchanged so the UI never lies about server state.
   */
  async function updateProductReferences(
    conversationId: string,
    refs: readonly ChatProductReference[]
  ): Promise<void> {
    const { error } = await supabase
      .from('chat_conversations')
      .update({ product_references: refs })
      .eq('id', conversationId)
    if (error) throw new Error(error.message)

    conversations.value = conversations.value.map((c) =>
      c.id === conversationId ? { ...c, product_references: refs } : c
    )
  }

  return {
    conversations,
    messages,
    activeConversationId,
    isLoading,
    fetchConversations,
    createConversation,
    deleteConversation,
    fetchMessages,
    addMessage,
    updateConversationTitle,
    updateProductReferences
  }
})
