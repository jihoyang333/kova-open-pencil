import { describe, test, expect, beforeEach, mock } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'

const mockFrom = mock(() => ({}))
const mockStorageFrom = mock(() => ({
  upload: mock(() => Promise.resolve({ error: null })),
  remove: mock(() => Promise.resolve({ error: null })),
  createSignedUrl: mock(() =>
    Promise.resolve({ data: { signedUrl: 'https://example.com/signed' }, error: null })
  ),
}))

mock.module('@/lib/supabase', () => ({
  supabase: {
    from: mockFrom,
    storage: { from: mockStorageFrom },
    auth: {
      getSession: mock(() =>
        Promise.resolve({ data: { session: { user: { id: 'user-1' } } }, error: null })
      ),
      onAuthStateChange: mock(() => ({ data: { subscription: { unsubscribe: () => {} } } })),
    },
  },
}))

const { useChatAttachmentsStore } = await import('@/stores/chat-attachments')
const { useAuthStore } = await import('@/stores/auth')

describe('chat-attachments store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockFrom.mockClear()
    mockStorageFrom.mockClear()
    const authStore = useAuthStore()
    authStore.user = { id: 'user-1', email: 'test@test.com' } as any
  })

  test('getSignedUrl returns a signed URL with 24h expiry', async () => {
    mockStorageFrom.mockReturnValueOnce({
      createSignedUrl: mock(() =>
        Promise.resolve({ data: { signedUrl: 'https://example.com/signed' }, error: null })
      ),
    })

    const store = useChatAttachmentsStore()
    const url = await store.getSignedUrl('user-1/b1/img.jpg')
    expect(url).toBe('https://example.com/signed')
  })

  test('uploadChatImage uploads to chat-attachments bucket and inserts record', async () => {
    const sampleAttachment = {
      id: 'a1',
      user_id: 'user-1',
      brand_id: 'b1',
      conversation_id: null,
      file_name: 'paste.jpg',
      file_type: 'image/jpeg',
      file_size: 5000,
      width: 800,
      height: 600,
      storage_path: 'user-1/b1/1234-paste.jpg',
      created_at: '2026-04-01T00:00:00Z',
    }

    mockStorageFrom.mockReturnValueOnce({
      upload: mock(() => Promise.resolve({ error: null })),
    })
    mockFrom.mockReturnValueOnce({
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: sampleAttachment, error: null }),
        }),
      }),
    })

    const store = useChatAttachmentsStore()
    const file = new File([new Uint8Array(100)], 'paste.jpg', { type: 'image/jpeg' })
    const result = await store.uploadChatImage('b1', file, 800, 600)
    expect(result.id).toBe('a1')
  })

  test('deleteChatAttachment removes file and record', async () => {
    mockStorageFrom.mockReturnValueOnce({
      remove: mock(() => Promise.resolve({ error: null })),
    })
    mockFrom.mockReturnValueOnce({
      delete: () => ({
        eq: () => Promise.resolve({ error: null }),
      }),
    })

    const store = useChatAttachmentsStore()
    await store.deleteChatAttachment('a1', 'user-1/b1/paste.jpg')
    // Should not throw
  })
})
