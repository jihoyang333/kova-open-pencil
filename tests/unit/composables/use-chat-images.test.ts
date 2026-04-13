import { describe, test, expect } from 'bun:test'

describe('stripPreviousTurnImages', () => {
  test('strips file parts from older messages, keeps current turn', async () => {
    const { stripPreviousTurnImages } = await import('@/composables/use-chat-images')

    const messages = [
      {
        role: 'system' as const,
        content: 'You are a design assistant',
      },
      {
        role: 'user' as const,
        content: [
          { type: 'text' as const, text: 'Look at this' },
          { type: 'file' as const, data: 'base64data', mediaType: 'image/jpeg' },
        ],
      },
      {
        role: 'assistant' as const,
        content: [{ type: 'text' as const, text: 'Nice image' }],
      },
      {
        role: 'user' as const,
        content: [
          { type: 'text' as const, text: 'Now change the colors' },
          { type: 'file' as const, data: 'newbase64', mediaType: 'image/jpeg' },
        ],
      },
    ]

    const result = stripPreviousTurnImages(messages)

    // System message (index 0): string content unchanged
    expect(result[0].content).toBe('You are a design assistant')

    // First user message (index 1): file part replaced with text reference
    const firstUserContent = result[1].content as Array<Record<string, unknown>>
    expect(firstUserContent).not.toContainEqual(
      expect.objectContaining({ type: 'file' }),
    )
    expect(firstUserContent).toContainEqual(
      expect.objectContaining({
        type: 'text',
        text: expect.stringContaining('[Previously attached'),
      }),
    )

    // Assistant message (index 2): untouched
    expect(result[2].content).toEqual([{ type: 'text', text: 'Nice image' }])

    // Last user message (index 3, current turn): file part preserved
    const lastUserContent = result[3].content as Array<Record<string, unknown>>
    expect(lastUserContent).toContainEqual(
      expect.objectContaining({ type: 'file', data: 'newbase64' }),
    )
  })

  test('handles messages with no file parts (no-op on current turn)', async () => {
    const { stripPreviousTurnImages } = await import('@/composables/use-chat-images')

    const messages = [
      { role: 'user' as const, content: [{ type: 'text' as const, text: 'hello' }] },
    ]

    const result = stripPreviousTurnImages(messages)
    expect(result[0].content).toEqual([{ type: 'text', text: 'hello' }])
  })

  test('returns empty array when given empty input', async () => {
    const { stripPreviousTurnImages } = await import('@/composables/use-chat-images')
    expect(stripPreviousTurnImages([])).toEqual([])
  })
})
