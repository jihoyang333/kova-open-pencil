/**
 * useAccountStore — PRD 04 §6.2.2. Profile draft + unsaved tracking.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test'
import { createPinia, setActivePinia } from 'pinia'

const supabaseState = {
  authUserId: 'user-acct-1' as string | null,
  userRow: null as null | { name: string | null; avatar_storage_path: string | null; preferences: Record<string, unknown> | null },
  lastUpdate: null as null | Record<string, unknown>,
  updateError: null as null | { message: string },
}

let useAccountStore: typeof import('../../../src/stores/account')['useAccountStore']

beforeAll(async () => {
  mock.module('@/lib/supabase', () => ({
    supabase: {
      auth: {
        getUser: async () => ({ data: { user: supabaseState.authUserId === null ? null : { id: supabaseState.authUserId } } }),
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: supabaseState.userRow, error: null }),
          }),
        }),
        update: (row: Record<string, unknown>) => ({
          eq: async () => {
            if (supabaseState.updateError !== null) return { error: supabaseState.updateError }
            supabaseState.lastUpdate = row
            return { error: null }
          },
        }),
      }),
    },
  }))
  ;({ useAccountStore } = await import('../../../src/stores/account'))
})

afterAll(() => mock.restore())

beforeEach(() => {
  setActivePinia(createPinia())
  supabaseState.userRow = { name: 'Jiho', avatar_storage_path: null, preferences: { theme: 'dark' } }
  supabaseState.lastUpdate = null
  supabaseState.updateError = null
})

describe('useAccountStore', () => {
  it('load hydrates original + draft, isDirty false', async () => {
    const s = useAccountStore()
    await s.load()
    expect(s.draft.name).toBe('Jiho')
    expect(s.isDirty).toBe(false)
  })

  it('patch sets isDirty true; discard reverts', async () => {
    const s = useAccountStore()
    await s.load()
    s.patch({ name: 'New Name' })
    expect(s.isDirty).toBe(true)
    s.discard()
    expect(s.draft.name).toBe('Jiho')
    expect(s.isDirty).toBe(false)
  })

  it('save only updates fields that changed; clears isDirty', async () => {
    const s = useAccountStore()
    await s.load()
    s.patch({ name: 'New Name' })
    const ok = await s.save()
    expect(ok).toBe(true)
    expect(supabaseState.lastUpdate).toEqual({ name: 'New Name' })
    expect(s.isDirty).toBe(false)
  })

  it('save with DB error returns false + keeps draft', async () => {
    const s = useAccountStore()
    await s.load()
    s.patch({ name: 'Different' })
    supabaseState.updateError = { message: 'db error' }
    const ok = await s.save()
    expect(ok).toBe(false)
    expect(s.error).toBe('db error')
    expect(s.draft.name).toBe('Different')
  })

  it('preferences JSON-deep change is detected', async () => {
    const s = useAccountStore()
    await s.load()
    s.patch({ preferences: { theme: 'light' } })
    expect(s.isDirty).toBe(true)
    await s.save()
    expect(supabaseState.lastUpdate).toEqual({ preferences: { theme: 'light' } })
  })
})
