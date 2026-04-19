import { describe, it, expect, mock, beforeEach } from 'bun:test'

const mockPublishJSON = mock(() => Promise.resolve({ messageId: 'msg_test_123' }))

mock.module('@upstash/qstash', () => ({
  Client: class {
    constructor(_opts: { token: string }) {}
    publishJSON = mockPublishJSON
  },
}))

// Import after mock.module so the module gets the mocked Client
const { publishToQStash } = await import('../../../api/_shared/qstash')

describe('publishToQStash', () => {
  beforeEach(() => {
    mockPublishJSON.mockClear()
  })

  it('calls publishJSON with the given url and body', async () => {
    const url = 'https://example.com/api/worker'
    const body = { brand_id: 'brand-1', cursor: 0, count_total: 100, url: 'https://cdn/bulk.jsonl' }

    await publishToQStash(url, body)

    expect(mockPublishJSON).toHaveBeenCalledTimes(1)
    expect(mockPublishJSON).toHaveBeenCalledWith({ url, body })
  })

  it('passes arbitrary body shapes without modification', async () => {
    const url = 'https://example.com/api/other'
    const body = { nested: { a: 1 }, arr: [1, 2, 3], flag: true }

    await publishToQStash(url, body)

    expect(mockPublishJSON).toHaveBeenCalledWith({ url, body })
  })

  it('propagates errors thrown by publishJSON', async () => {
    mockPublishJSON.mockImplementation(() => Promise.reject(new Error('QStash unavailable')))

    await expect(publishToQStash('https://example.com/api/worker', {})).rejects.toThrow('QStash unavailable')
  })
})
