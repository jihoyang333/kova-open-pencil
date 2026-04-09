import { describe, test, expect, beforeEach, mock } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'
import { createMockUser } from '../../helpers/mock-user'

const mockFrom = mock(() => ({}))

mock.module('@/lib/supabase', () => ({
  supabase: {
    from: mockFrom,
    auth: {
      getSession: mock(() =>
        Promise.resolve({ data: { session: { user: { id: 'user-1' } } }, error: null })
      ),
      onAuthStateChange: mock(() => ({ data: { subscription: { unsubscribe: () => {} } } })),
    },
  },
}))

const { useChatStore } = await import('@/stores/chat')
const { useAuthStore } = await import('@/stores/auth')

const sampleConversation = {
  id: 'conv-1',
  user_id: 'user-1',
  brand_id: 'b1',
  canvas_id: 'canvas-1',
  title: null,
  created_at: '2026-04-01T00:00:00Z',
  updated_at: '2026-04-01T00:00:00Z',
}

const sampleMessage = {
  id: 'msg-1',
  conversation_id: 'conv-1',
  user_id: 'user-1',
  role: 'user',
  content: 'Design a sales email',
  attachments: [],
  tool_calls: [],
  created_at: '2026-04-01T00:00:00Z',
}

describe('chat store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockFrom.mockClear()
    const authStore = useAuthStore()
    authStore.user = createMockUser()
  })

  test('fetchConversations loads conversations for a canvas', async () => {
    mockFrom.mockReturnValueOnce({
      select: () => ({
        eq: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: [sampleConversation], error: null }),
          }),
        }),
      }),
    })

    const store = useChatStore()
    await store.fetchConversations('b1', 'canvas-1')
    expect(store.conversations).toHaveLength(1)
    expect(store.conversations[0].id).toBe('conv-1')
  })

  test('createConversation inserts and returns a new conversation', async () => {
    mockFrom.mockReturnValueOnce({
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: sampleConversation, error: null }),
        }),
      }),
    })

    const store = useChatStore()
    const conv = await store.createConversation('b1', 'canvas-1')
    expect(conv.id).toBe('conv-1')
    expect(store.conversations).toContainEqual(sampleConversation)
  })

  test('addMessage persists a message and adds to active messages', async () => {
    mockFrom.mockReturnValueOnce({
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: sampleMessage, error: null }),
        }),
      }),
    })

    const store = useChatStore()
    store.activeConversationId = 'conv-1'
    await store.addMessage('conv-1', 'user', 'Design a sales email')
    expect(store.messages).toHaveLength(1)
  })

  test('createConversation throws when not authenticated', async () => {
    const store = useChatStore()
    const authStore = useAuthStore()
    authStore.user = null
    await expect(store.createConversation('b1', 'canvas-1')).rejects.toThrow('Not authenticated')
  })

  test('deleteConversation removes from state', async () => {
    mockFrom.mockReturnValueOnce({
      delete: () => ({
        eq: () => Promise.resolve({ error: null }),
      }),
    })

    const store = useChatStore()
    store.conversations = [sampleConversation]
    await store.deleteConversation('conv-1')
    expect(store.conversations).toHaveLength(0)
  })
})
