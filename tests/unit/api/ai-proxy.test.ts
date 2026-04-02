import { describe, test, expect, mock, beforeEach, afterEach } from 'bun:test'

// Mock authenticateRequest
const mockAuth = mock(() => Promise.resolve({ userId: 'user-1' }))
mock.module('@/../../api/_shared/auth', () => ({
  authenticateRequest: mockAuth,
}))

// Mock supabase — rpc-based rate limiting
const mockRpc = mock(() =>
  Promise.resolve({ data: [{ allowed: true, current_count: 1 }], error: null })
)
mock.module('@supabase/supabase-js', () => ({
  createClient: () => ({
    rpc: mockRpc,
  }),
}))

// Capture original fetch so we can restore it
const originalFetch = globalThis.fetch

describe('ai-proxy handler', () => {
  beforeEach(() => {
    mockAuth.mockClear()
    mockRpc.mockClear()
    globalThis.fetch = originalFetch
    process.env.ANTHROPIC_API_KEY = 'test-key'
    process.env.VITE_SUPABASE_URL = 'https://test.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
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

  test('returns 429 when daily generation limit reached', async () => {
    mockRpc.mockResolvedValueOnce({
      data: [{ allowed: false, current_count: 200 }],
      error: null,
    })

    const handler = (await import('../../../api/ai-proxy/v1/messages')).default
    const req = new Request('http://localhost/api/ai-proxy/v1/messages', {
      method: 'POST',
      body: JSON.stringify({ model: 'claude-sonnet-4-6', messages: [] }),
    })
    const res = await handler(req)
    expect(res.status).toBe(429)

    const body = await res.json()
    expect(body.error).toContain('Daily limit reached')
    expect(body.retry_after).toBeGreaterThan(0)
  })

  test('forwards to Anthropic and streams response on success', async () => {
    mockRpc.mockResolvedValueOnce({
      data: [{ allowed: true, current_count: 5 }],
      error: null,
    })

    const ssePayload = 'data: {"type":"content_block_delta"}\n\n'
    globalThis.fetch = mock(() =>
      Promise.resolve(
        new Response(ssePayload, {
          status: 200,
          headers: { 'Content-Type': 'text/event-stream' },
        })
      )
    )

    const handler = (await import('../../../api/ai-proxy/v1/messages')).default
    const req = new Request('http://localhost/api/ai-proxy/v1/messages', {
      method: 'POST',
      body: JSON.stringify({ model: 'claude-sonnet-4-6', messages: [{ role: 'user', content: 'hi' }] }),
    })
    const res = await handler(req)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('text/event-stream')

    const body = await res.text()
    expect(body).toContain('content_block_delta')
  })
})
