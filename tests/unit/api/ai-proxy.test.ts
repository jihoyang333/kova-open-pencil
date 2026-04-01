import { describe, test, expect, mock, beforeEach } from 'bun:test'

// Mock authenticateRequest
const mockAuth = mock(() => Promise.resolve({ userId: 'user-1' }))
mock.module('@/../../api/_shared/auth', () => ({
  authenticateRequest: mockAuth,
}))

// Mock supabase
const mockFrom = mock(() => ({}))
mock.module('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: mockFrom,
  }),
}))

describe('ai-proxy handler', () => {
  beforeEach(() => {
    mockAuth.mockClear()
    mockFrom.mockClear()
    process.env.ANTHROPIC_API_KEY = 'test-key'
    process.env.VITE_SUPABASE_URL = 'https://test.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
  })

  test('rejects non-POST requests with 405', async () => {
    const handler = (await import('../../../api/ai-proxy/v1/messages')).default
    const req = new Request('http://localhost/api/ai-proxy/v1/messages', { method: 'GET' })
    const res = await handler(req)
    expect(res.status).toBe(405)
  })

  test('returns 401 when auth fails', async () => {
    mockAuth.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    )
    const handler = (await import('../../../api/ai-proxy/v1/messages')).default
    const req = new Request('http://localhost/api/ai-proxy/v1/messages', {
      method: 'POST',
      body: JSON.stringify({ model: 'claude-sonnet-4-6', messages: [] }),
    })
    const res = await handler(req)
    expect(res.status).toBe(401)
  })

  test('returns 413 when body exceeds 4MB', async () => {
    const handler = (await import('../../../api/ai-proxy/v1/messages')).default
    const bigBody = 'x'.repeat(4.1 * 1024 * 1024)
    const req = new Request('http://localhost/api/ai-proxy/v1/messages', {
      method: 'POST',
      body: bigBody,
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await handler(req)
    expect(res.status).toBe(413)
  })
})
