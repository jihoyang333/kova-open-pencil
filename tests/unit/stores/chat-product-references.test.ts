import { setActivePinia, createPinia } from 'pinia'
import { beforeEach, describe, expect, test } from 'bun:test'

import { useChatStore } from '@/stores/chat'
import { useChatProductReferencesStore } from '@/stores/chat-product-references'

import type { ChatProductReference } from '@/types/kova/chat'

const makeRef = (id: string): ChatProductReference => ({
  product_id: id, title: `Product ${id}`, primary_image_url: null,
  price_low: '29.00', price_high: null, currency: 'USD',
  handle: `p-${id}`, added_at: '2026-06-20T00:00:00Z'
})

function stubPersist(): void {
  const chatStore = useChatStore()
  chatStore.updateProductReferences = async (id, refs) => {
    chatStore.conversations = chatStore.conversations.map((c) =>
      c.id === id ? { ...c, product_references: refs } : c
    )
  }
}

describe('useChatProductReferencesStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const chatStore = useChatStore()
    chatStore.conversations = [
      { id: 'c1', user_id: 'u', brand_id: 'b', canvas_id: 'cv', title: null,
        created_at: '', updated_at: '', product_references: [] }
    ]
    chatStore.activeConversationId = 'c1'
  })

  test('activeReferences reflects current conversation', () => {
    const store = useChatProductReferencesStore()
    expect(store.activeReferences).toEqual([])
  })

  test('importProducts de-dupes by product_id', async () => {
    stubPersist()
    const store = useChatProductReferencesStore()
    await store.importProducts('c1', [makeRef('a'), makeRef('b')])
    await store.importProducts('c1', [makeRef('a'), makeRef('c')])
    expect(store.activeReferences.map((r) => r.product_id)).toEqual(['a', 'b', 'c'])
  })

  test('importProducts caps at 20', async () => {
    stubPersist()
    const store = useChatProductReferencesStore()
    const bulk = Array.from({ length: 25 }, (_, i) => makeRef(`id-${i}`))
    await store.importProducts('c1', bulk)
    expect(store.activeReferences).toHaveLength(20)
    expect(store.isAtCapacity).toBe(true)
  })

  test('removeReference removes single chip', async () => {
    stubPersist()
    const store = useChatProductReferencesStore()
    await store.importProducts('c1', [makeRef('a'), makeRef('b')])
    await store.removeReference('c1', 'a')
    expect(store.activeReferences.map((r) => r.product_id)).toEqual(['b'])
  })

  test('clearReferences empties the list', async () => {
    stubPersist()
    const store = useChatProductReferencesStore()
    await store.importProducts('c1', [makeRef('a'), makeRef('b')])
    await store.clearReferences('c1')
    expect(store.activeReferences).toEqual([])
  })
})
