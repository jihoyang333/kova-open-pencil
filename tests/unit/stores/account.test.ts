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
  rpcCalls: [] as Array<{ fn: string; args: Record<string, unknown> }>,
  rpcError: null as null | { code: string; message: string },
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
      rpc: async (fn: string, args: Record<string, unknown>) => {
        supabaseState.rpcCalls.push({ fn, args })
        if (supabaseState.rpcError !== null) return { data: null, error: supabaseState.rpcError }
        return { data: null, error: null }
      },
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
  supabaseState.rpcCalls = []
  supabaseState.rpcError = null
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

  it('preferences JSON-deep change is detected on draft', async () => {
    const s = useAccountStore()
    await s.load()
    s.patch({ preferences: { theme: 'light' } })
    expect(s.isDirty).toBe(true)
  })

  it('save() does NOT write preferences (Cluster 12 owns them via update_user_pref RPC)', async () => {
    const s = useAccountStore()
    await s.load()
    s.patch({ preferences: { theme: 'light' } })
    s.patch({ name: 'New Name' })
    await s.save()
    expect(supabaseState.lastUpdate).toEqual({ name: 'New Name' })
    expect(supabaseState.lastUpdate).not.toHaveProperty('preferences')
  })

  it('setPreferenceAtomic writes via set_user_preference RPC + mirrors draft+original', async () => {
    const s = useAccountStore()
    await s.load()
    expect(s.isDirty).toBe(false)
    const ok = await s.setPreferenceAtomic('textSize', '112.5')
    expect(ok).toBe(true)
    expect(supabaseState.rpcCalls).toHaveLength(1)
    expect(supabaseState.rpcCalls[0]).toEqual({
      fn: 'set_user_preference',
      args: { p_key: 'textSize', p_value: '112.5' },
    })
    expect(s.draft.preferences.textSize).toBe('112.5')
    expect(s.isDirty).toBe(false)
  })

  it('setPreferenceAtomic surfaces RPC errors via toast', async () => {
    const s = useAccountStore()
    await s.load()
    supabaseState.rpcError = { code: '42501', message: 'permission denied' }
    const ok = await s.setPreferenceAtomic('textSize', '112.5')
    expect(ok).toBe(false)
    expect(s.draft.preferences.textSize).toBeUndefined()
  })
})
