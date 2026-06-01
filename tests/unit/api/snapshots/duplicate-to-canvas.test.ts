import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import handler from '../../../../api/snapshots/duplicate-to-canvas'

// Dummy Supabase env so verifyAuthFull reaches the token check without a network call.
const SAVED: Record<string, string | undefined> = {}
const setEnv = (k: string, v: string) => {
  SAVED[k] = process.env[k]
  process.env[k] = v
}
beforeAll(() => {
  if (!process.env['VITE_SUPABASE_URL']) setEnv('VITE_SUPABASE_URL', 'http://127.0.0.1:1')
  if (!process.env['VITE_SUPABASE_ANON_KEY']) setEnv('VITE_SUPABASE_ANON_KEY', 'dummy')
})
afterAll(() => {
  for (const [k, v] of Object.entries(SAVED)) {
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  }
})

describe('POST /api/snapshots/duplicate-to-canvas', () => {
  it('401 without a JWT', async () => {
    const res = await handler(
      new Request('http://x/api/snapshots/duplicate-to-canvas', { method: 'POST', body: '{}' }),
    )
    expect(res.status).toBe(401)
  })

  it('400 with a JWT-less... actually 401 takes precedence — bad body needs auth first', async () => {
    // Without auth the handler short-circuits to 401 before parsing the body.
    const res = await handler(
      new Request('http://x', { method: 'POST', body: 'not-json' }),
    )
    expect(res.status).toBe(401)
  })
})
