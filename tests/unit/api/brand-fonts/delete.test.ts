import { beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test'

// Cluster 05 PRD §5.1.2 — unit tests for DELETE /api/brand-fonts/:id.

const OWNER_USER_ID = '11111111-1111-1111-1111-111111111111'
const OTHER_USER_ID = '22222222-2222-2222-2222-222222222222'
const BRAND_ID = '33333333-3333-3333-3333-333333333333'
const FONT_ID = '44444444-4444-4444-4444-444444444444'

const authState = { mode: 'owner' as 'owner' | 'unauthorized' }

mock.module('../../../../api/_shared/auth', () => ({
  authenticateRequest: async () => {
    if (authState.mode === 'owner') return { userId: OWNER_USER_ID }
    return new Response(JSON.stringify({ error: 'auth' }), { status: 401 })
  },
}))

interface DbState {
  row: { id: string; brand_id: string; file_path: string; brands: { user_id: string } } | null
  deleteError: { message: string } | null
  storageRemoveCalls: string[][]
  channelSends: Array<{ event: string; payload: unknown }>
}

const db: DbState = { row: null, deleteError: null, storageRemoveCalls: [], channelSends: [] }

mock.module('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (table: string) => {
      if (table === 'brand_fonts') {
        return {
          select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: db.row, error: null }) }) }),
          delete: () => ({ eq: async () => (db.deleteError ? { error: db.deleteError } : { error: null }) }),
        }
      }
      throw new Error(`unexpected table: ${table}`)
    },
    storage: {
      from: () => ({
        remove: async (paths: string[]) => {
          db.storageRemoveCalls.push(paths)
          return { error: null }
        },
      }),
    },
    channel: () => ({
      send: async (msg: { event: string; payload: unknown }) => {
        db.channelSends.push({ event: msg.event, payload: msg.payload })
        return {}
      },
    }),
    removeChannel: async () => ({}),
  }),
}))

const handler = (await import('../../../../api/brand-fonts/[id]')).default

function del(fontId: string): Request {
  return new Request(`http://x/api/brand-fonts/${fontId}`, {
    method: 'DELETE',
    headers: { Authorization: 'Bearer t' },
  })
}

beforeAll(() => {
  process.env.VITE_SUPABASE_URL = 'https://test.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test'
})

beforeEach(() => {
  authState.mode = 'owner'
  db.row = { id: FONT_ID, brand_id: BRAND_ID, file_path: `${BRAND_ID}/${FONT_ID}.woff2`, brands: { user_id: OWNER_USER_ID } }
  db.deleteError = null
  db.storageRemoveCalls = []
  db.channelSends = []
})

describe('DELETE /api/brand-fonts/:id', () => {
  it('200 success removes storage + row + emits font_removed', async () => {
    const res = await handler(del(FONT_ID))
    expect(res.status).toBe(200)
    expect((await res.json()).success).toBe(true)
    expect(db.storageRemoveCalls[0]).toEqual([`${BRAND_ID}/${FONT_ID}.woff2`])
    expect(db.channelSends[0].event).toBe('font_removed')
  })

  it('405 on non-DELETE', async () => {
    const res = await handler(new Request(`http://x/api/brand-fonts/${FONT_ID}`, { method: 'POST' }))
    expect(res.status).toBe(405)
  })

  it('401 when unauthenticated', async () => {
    authState.mode = 'unauthorized'
    const res = await handler(del(FONT_ID))
    expect(res.status).toBe(401)
  })

  it('400 on non-uuid id', async () => {
    const res = await handler(del('not-a-uuid'))
    expect(res.status).toBe(400)
  })

  it('404 when row missing', async () => {
    db.row = null
    const res = await handler(del(FONT_ID))
    expect(res.status).toBe(404)
  })

  it('403 when not owner', async () => {
    db.row = { id: FONT_ID, brand_id: BRAND_ID, file_path: 'p', brands: { user_id: OTHER_USER_ID } }
    const res = await handler(del(FONT_ID))
    expect(res.status).toBe(403)
  })

  it('500 on row delete failure', async () => {
    db.deleteError = { message: 'boom' }
    const res = await handler(del(FONT_ID))
    expect(res.status).toBe(500)
  })
})
