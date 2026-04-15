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

  test('no-op when no user message is present (assistant + tool only)', async () => {
    const { stripPreviousTurnImages } = await import('@/composables/use-chat-images')

    const messages = [
      { role: 'system' as const, content: 'You are an assistant' },
      {
        role: 'assistant' as const,
        content: [
          { type: 'text' as const, text: 'Here is what I saw' },
          { type: 'file' as const, data: 'base64', mediaType: 'image/jpeg' },
        ],
      },
    ]

    const result = stripPreviousTurnImages(messages)

    // Without a user anchor, nothing should be stripped — the function is a no-op.
    expect(result[0].content).toBe('You are an assistant')
    expect(result[1].content).toEqual([
      { type: 'text', text: 'Here is what I saw' },
      { type: 'file', data: 'base64', mediaType: 'image/jpeg' },
    ])
  })

  test('preserves assistant tool-call parts in older turns', async () => {
    const { stripPreviousTurnImages } = await import('@/composables/use-chat-images')

    const messages = [
      {
        role: 'user' as const,
        content: [
          { type: 'text' as const, text: 'place a hero image' },
          { type: 'file' as const, data: 'olddata', mediaType: 'image/jpeg' },
        ],
      },
      {
        role: 'assistant' as const,
        content: [
          { type: 'text' as const, text: 'Placing it now.' },
          {
            type: 'tool-call' as const,
            toolCallId: 'call_1',
            toolName: 'placeMediaImage',
            input: { node_id: 'n1', image_url: 'https://x/y.jpg', scale_mode: 'fill' },
          },
        ],
      },
      {
        role: 'user' as const,
        content: [{ type: 'text' as const, text: 'Looks great' }],
      },
    ]

    const result = stripPreviousTurnImages(messages)

    // Assistant tool-call part in an older turn must survive untouched.
    const assistantParts = result[1].content as Array<Record<string, unknown>>
    expect(assistantParts).toContainEqual(
      expect.objectContaining({
        type: 'tool-call',
        toolCallId: 'call_1',
        toolName: 'placeMediaImage',
      }),
    )
  })

})

describe('assertReadyForSend', () => {
  test('throws when any attachment is still uploading', async () => {
    const { assertReadyForSend } = await import('@/composables/use-chat-images')
    const atts = [
      {
        id: '1',
        fileName: 'a.jpg',
        localPreviewUrl: '',
        source: 'clipboard' as const,
        width: null,
        height: null,
        isUploading: true,
        visionBlob: new Blob(),
      },
    ]
    expect(() => assertReadyForSend(atts)).toThrow(/still uploading|Waiting/i)
  })

  test('throws when an attachment has no visionBlob', async () => {
    const { assertReadyForSend } = await import('@/composables/use-chat-images')
    const atts = [
      {
        id: '1',
        fileName: 'a.jpg',
        localPreviewUrl: '',
        source: 'clipboard' as const,
        width: null,
        height: null,
        isUploading: false,
      },
    ]
    expect(() => assertReadyForSend(atts)).toThrow(/vision|missing/i)
  })

  test('no-op when every attachment is ready', async () => {
    const { assertReadyForSend } = await import('@/composables/use-chat-images')
    const atts = [
      {
        id: '1',
        fileName: 'a.jpg',
        localPreviewUrl: '',
        source: 'clipboard' as const,
        width: 10,
        height: 10,
        isUploading: false,
        visionBlob: new Blob(),
      },
    ]
    expect(() => assertReadyForSend(atts)).not.toThrow()
  })

  test('no-op on empty attachment list', async () => {
    const { assertReadyForSend } = await import('@/composables/use-chat-images')
    expect(() => assertReadyForSend([])).not.toThrow()
  })
})

describe('stripPreviousTurnImages (cont.)', () => {
  test('preserves tool-result messages in older turns', async () => {
    const { stripPreviousTurnImages } = await import('@/composables/use-chat-images')

    const messages = [
      {
        role: 'user' as const,
        content: [{ type: 'text' as const, text: 'run it' }],
      },
      {
        role: 'tool' as const,
        content: [
          {
            type: 'tool-result' as const,
            toolCallId: 'call_1',
            toolName: 'placeMediaImage',
            output: { success: true, node_id: 'n1' },
          },
        ],
      },
      {
        role: 'user' as const,
        content: [{ type: 'text' as const, text: 'thanks' }],
      },
    ]

    const result = stripPreviousTurnImages(messages)

    const toolParts = result[1].content as Array<Record<string, unknown>>
    expect(toolParts).toContainEqual(
      expect.objectContaining({
        type: 'tool-result',
        toolCallId: 'call_1',
        output: { success: true, node_id: 'n1' },
      }),
    )
  })
})
