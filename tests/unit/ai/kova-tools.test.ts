import { describe, test, expect } from 'bun:test'

describe('kova tool schema contract', () => {
  test('every kova tool exposes an `inputSchema` producing JSON Schema with type: "object" (Anthropic requirement)', async () => {
    const { createKovaTools } = await import('@/ai/kova-tools')

    // Minimal EditorStore stub — createKovaTools only wires callbacks, it does not
    // touch the store at tool-definition time.
    const storeStub = {} as Parameters<typeof createKovaTools>[0]
    const tools = createKovaTools(storeStub)

    for (const [name, toolDef] of Object.entries(tools)) {
      const schema = (toolDef as { inputSchema?: { jsonSchema?: { type?: string } } }).inputSchema
      expect(schema, `tool "${name}" must define inputSchema (not the deprecated "parameters" key)`).toBeDefined()
      const jsonSchema = await schema?.jsonSchema
      expect(jsonSchema?.type, `tool "${name}" inputSchema must serialize to { type: "object" }`).toBe('object')
    }
  })
})

describe('placeMediaImage URL validation', () => {
  test('rejects non-Supabase URLs', async () => {
    const { validateImageUrl } = await import('@/ai/kova-tools')
    expect(() => validateImageUrl('https://evil.com/malware.png')).toThrow()
    expect(() => validateImageUrl('https://example.com/img.jpg')).toThrow()
  })

  test('accepts Supabase storage URLs', async () => {
    const { validateImageUrl } = await import('@/ai/kova-tools')
    expect(() =>
      validateImageUrl('https://abc.supabase.co/storage/v1/object/public/media-assets/img.png')
    ).not.toThrow()
  })

  test('rejects javascript: and data: URLs', async () => {
    const { validateImageUrl } = await import('@/ai/kova-tools')
    expect(() => validateImageUrl('javascript:alert(1)')).toThrow()
    expect(() => validateImageUrl('data:image/png;base64,abc')).toThrow()
  })
})
