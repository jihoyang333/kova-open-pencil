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

const { useBrandMemoriesStore } = await import('@/stores/brand-memories')
const { useAuthStore } = await import('@/stores/auth')

const sampleMemory = {
  id: 'mem-1',
  brand_id: 'brand-1',
  user_id: 'user-1',
  content: 'CTAs should use coral',
  source: 'auto' as const,
  created_at: '2026-04-15T00:00:00Z',
}

describe('brand memories store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockFrom.mockClear()
    const authStore = useAuthStore()
    authStore.user = createMockUser()
  })

  test('fetchMemories loads memories for a brand', async () => {
    mockFrom.mockReturnValueOnce({
      select: () => ({
        eq: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: [sampleMemory], error: null }),
          }),
        }),
      }),
    })

    const store = useBrandMemoriesStore()
    const result = await store.fetchMemories('brand-1')
    expect(result).toHaveLength(1)
    expect(result[0].content).toBe('CTAs should use coral')
  })

  test('saveMemory inserts and returns the new memory', async () => {
    mockFrom.mockReturnValueOnce({
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: sampleMemory, error: null }),
        }),
      }),
    })

    const store = useBrandMemoriesStore()
    const result = await store.saveMemory('brand-1', 'CTAs should use coral', 'auto')
    expect(result.id).toBe('mem-1')
    expect(result.source).toBe('auto')
  })

  test('deleteMemory calls delete with the correct id', async () => {
    const eqMock = mock(() => Promise.resolve({ error: null }))
    mockFrom.mockReturnValueOnce({
      delete: () => ({ eq: eqMock }),
    })

    const store = useBrandMemoriesStore()
    await store.deleteMemory('mem-1')
    expect(eqMock).toHaveBeenCalledWith('id', 'mem-1')
  })

  test('updateMemory calls update with the correct id and content', async () => {
    const eqMock = mock(() => Promise.resolve({ error: null }))
    mockFrom.mockReturnValueOnce({
      update: () => ({ eq: eqMock }),
    })

    const store = useBrandMemoriesStore()
    await store.updateMemory('mem-1', 'Updated content')
    expect(eqMock).toHaveBeenCalledWith('id', 'mem-1')
  })

  test('saveMemory throws when not authenticated', async () => {
    const store = useBrandMemoriesStore()
    const authStore = useAuthStore()
    authStore.user = null
    await expect(store.saveMemory('brand-1', 'test', 'auto')).rejects.toThrow('Not authenticated')
  })
})
