import { describe, test, expect, mock } from 'bun:test'

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

describe('saveBrandMemory tool', () => {
  test('saveBrandMemory execute returns confirmation and calls saveMemory with the live brand id', async () => {
    let savedBrandId = ''
    let savedContent = ''
    let savedSource = ''

    mock.module('@/stores/brands', () => ({
      useBrandsStore: () => ({ selectedBrand: { id: 'brand-live' } }),
    }))
    mock.module('@/stores/brand-memories', () => ({
      useBrandMemoriesStore: () => ({
        saveMemory: async (brandId: string, content: string, source: 'auto' | 'user') => {
          savedBrandId = brandId
          savedContent = content
          savedSource = source
          return {
            id: 'mem-new', brand_id: brandId, user_id: 'u-1',
            content, source, created_at: '2026-04-15T00:00:00Z',
          }
        },
      }),
    }))

    const { createKovaTools } = await import('@/ai/kova-tools')
    const storeStub = {} as Parameters<typeof createKovaTools>[0]
    const tools = createKovaTools(storeStub)

    const result = await (tools.saveBrandMemory as { execute: (args: { content: string; source: 'auto' | 'user' }) => Promise<string> }).execute({
      content: 'CTAs should use coral',
      source: 'auto',
    })

    expect(result).toContain('CTAs should use coral')
    expect(savedBrandId).toBe('brand-live')
    expect(savedContent).toBe('CTAs should use coral')
    expect(savedSource).toBe('auto')
  })

  test('saveBrandMemory returns a failure string (not throw) when no brand is selected', async () => {
    mock.module('@/stores/brands', () => ({
      useBrandsStore: () => ({ selectedBrand: null }),
    }))
    mock.module('@/stores/brand-memories', () => ({
      useBrandMemoriesStore: () => ({
        saveMemory: async () => { throw new Error('should not be called') },
      }),
    }))

    const { createKovaTools } = await import('@/ai/kova-tools')
    const tools = createKovaTools({} as Parameters<typeof createKovaTools>[0])
    const result = await (tools.saveBrandMemory as { execute: (args: { content: string; source: 'auto' | 'user' }) => Promise<string> }).execute({
      content: 'x', source: 'auto',
    })
    expect(result).toMatch(/no brand selected|failed/i)
  })
})

test('createKovaTools exposes both placeMediaImage and saveBrandMemory', async () => {
  const { createKovaTools } = await import('@/ai/kova-tools')
  const tools = createKovaTools({} as Parameters<typeof createKovaTools>[0])
  expect(tools.placeMediaImage).toBeDefined()
  expect(tools.saveBrandMemory).toBeDefined()
})
