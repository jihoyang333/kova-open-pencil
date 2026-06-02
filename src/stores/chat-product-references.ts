import { defineStore } from 'pinia'
import { computed } from 'vue'

import { useChatStore } from '@/stores/chat'

import type { ChatProductReference } from '@/types/kova/chat'

export const MAX_PRODUCT_REFERENCES = 20

/**
 * Per-conversation Shopify product-reference chip state.
 *
 * W4 C-MED27: this store NEVER writes to Supabase directly. All persistence
 * flows through `useChatStore.updateProductReferences` (the single mutation
 * entry point). `importProducts`, `removeReference`, and `clearReferences`
 * compute the next refs array locally and delegate.
 */
export const useChatProductReferencesStore = defineStore('chat-product-references', () => {
  const chatStore = useChatStore()

  const activeReferences = computed<readonly ChatProductReference[]>(() => {
    const conv = chatStore.conversations.find((c) => c.id === chatStore.activeConversationId)
    return conv?.product_references ?? []
  })

  const isAtCapacity = computed(() => activeReferences.value.length >= MAX_PRODUCT_REFERENCES)

  async function importProducts(
    conversationId: string,
    incoming: readonly ChatProductReference[]
  ): Promise<void> {
    const conv = chatStore.conversations.find((c) => c.id === conversationId)
    if (!conv) throw new Error(`Conversation ${conversationId} not found`)

    const existingIds = new Set(conv.product_references.map((r) => r.product_id))
    const deduped = incoming.filter((r) => !existingIds.has(r.product_id))
    const merged = [...conv.product_references, ...deduped].slice(0, MAX_PRODUCT_REFERENCES)

    if (merged.length === conv.product_references.length) return

    await chatStore.updateProductReferences(conversationId, merged)
  }

  async function removeReference(conversationId: string, productId: string): Promise<void> {
    const conv = chatStore.conversations.find((c) => c.id === conversationId)
    if (!conv) return
    const next = conv.product_references.filter((r) => r.product_id !== productId)
    if (next.length === conv.product_references.length) return
    await chatStore.updateProductReferences(conversationId, next)
  }

  async function clearReferences(conversationId: string): Promise<void> {
    await chatStore.updateProductReferences(conversationId, [])
  }

  return {
    activeReferences,
    isAtCapacity,
    MAX_PRODUCT_REFERENCES,
    importProducts,
    removeReference,
    clearReferences
  }
})
