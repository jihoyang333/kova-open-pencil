import { describe, expect, test } from 'bun:test'

describe('buildSystemPrompt', () => {
  test('always starts with SYSTEM_PROMPT constant', async () => {
    const { buildSystemPrompt } = await import('@/ai/build-system-prompt')
    const result = await buildSystemPrompt({
      brandProfile: null,
      availableImages: [],
      brandMemories: [],
    })
    expect(result).toContain('Available elements') // Known content from system-prompt.md
  })

  test('includes email design principles', async () => {
    const { buildSystemPrompt } = await import('@/ai/build-system-prompt')
    const result = await buildSystemPrompt({
      brandProfile: null,
      availableImages: [],
      brandMemories: [],
    })
    expect(result).toContain('Email Design Principles')
  })

  test('includes email section definitions', async () => {
    const { buildSystemPrompt } = await import('@/ai/build-system-prompt')
    const result = await buildSystemPrompt({
      brandProfile: null,
      availableImages: [],
      brandMemories: [],
    })
    expect(result).toContain('Email Section Definitions')
  })

  test('includes image handling instructions', async () => {
    const { buildSystemPrompt } = await import('@/ai/build-system-prompt')
    const result = await buildSystemPrompt({
      brandProfile: null,
      availableImages: [],
      brandMemories: [],
    })
    expect(result).toContain('Image Handling')
  })

  test('omits brand kit when brandProfile is null', async () => {
    const { buildSystemPrompt } = await import('@/ai/build-system-prompt')
    const result = await buildSystemPrompt({
      brandProfile: null,
      availableImages: [],
      brandMemories: [],
    })
    expect(result).not.toContain('Brand Kit:')
  })

  test('includes brand kit when brand profile provided', async () => {
    const { buildSystemPrompt } = await import('@/ai/build-system-prompt')
    const result = await buildSystemPrompt({
      brandProfile: {
        id: 'b1',
        user_id: 'u1',
        name: 'Test Brand',
        colors: { primary: '#FF0000', secondary: '#00FF00', accent: '#0000FF', background: '#FFFFFF' },
        fonts: { heading: 'Inter', body: 'Roboto' },
        logo_url: null,
        voice: 'Professional',
        industry: 'Tech',
        url: null,
        created_at: '',
        updated_at: '',
      },
      availableImages: [],
      brandMemories: [],
    })
    expect(result).toContain('Brand Kit: Test Brand')
    expect(result).toContain('#FF0000')
  })

  test('includes fallback inference when no campaignType', async () => {
    const { buildSystemPrompt } = await import('@/ai/build-system-prompt')
    const result = await buildSystemPrompt({
      brandProfile: null,
      availableImages: [],
      brandMemories: [],
    })
    expect(result).toContain('Analyze the user')
  })

  test('includes campaign guide when campaignType provided', async () => {
    const { buildSystemPrompt } = await import('@/ai/build-system-prompt')
    const result = await buildSystemPrompt({
      brandProfile: null,
      availableImages: [],
      brandMemories: [],
      campaignType: 'sales',
    })
    // The sales campaign guide should be loaded instead of fallback
    expect(result).not.toContain('Campaign Type Inference')
  })

  test('uses fallback inference for unknown campaignType', async () => {
    const { buildSystemPrompt } = await import('@/ai/build-system-prompt')
    const result = await buildSystemPrompt({
      brandProfile: null,
      availableImages: [],
      brandMemories: [],
      // @ts-expect-error — testing runtime behavior with invalid value
      campaignType: 'newsletter',
    })
    expect(result).toContain('Campaign Type Inference')
  })

  test('includes brand memories when provided', async () => {
    const { buildSystemPrompt } = await import('@/ai/build-system-prompt')
    const result = await buildSystemPrompt({
      brandProfile: null,
      availableImages: [],
      brandMemories: [{ id: '1', content: 'CTAs should be coral', source: 'auto' as const }],
    })
    expect(result).toContain('Brand Memories')
    expect(result).toContain('CTAs should be coral')
  })

  test('omits brand memories section when empty', async () => {
    const { buildSystemPrompt } = await import('@/ai/build-system-prompt')
    const result = await buildSystemPrompt({
      brandProfile: null,
      availableImages: [],
      brandMemories: [],
    })
    expect(result).not.toContain('Brand Memories')
  })

  test('includes available images when provided', async () => {
    const { buildSystemPrompt } = await import('@/ai/build-system-prompt')
    const result = await buildSystemPrompt({
      brandProfile: null,
      availableImages: [
        {
          fileName: 'hero.jpg',
          fileType: 'image/jpeg',
          width: 1800,
          height: 1200,
          publicUrl: 'https://cdn.example.com/hero.jpg',
          mediaId: 'm1',
        },
      ],
      brandMemories: [],
    })
    expect(result).toContain('Available Media Library Images')
    expect(result).toContain('hero.jpg')
  })

  test('limits images to MAX_IMAGES (20)', async () => {
    const { buildSystemPrompt } = await import('@/ai/build-system-prompt')
    const images = Array.from({ length: 25 }, (_, i) => ({
      fileName: `img${i}.jpg`,
      fileType: 'image/jpeg',
      width: 100,
      height: 100,
      publicUrl: `https://cdn.example.com/img${i}.jpg`,
      mediaId: `m${i}`,
    }))
    const result = await buildSystemPrompt({
      brandProfile: null,
      availableImages: images,
      brandMemories: [],
    })
    expect(result).toContain('img0.jpg')
    expect(result).toContain('img19.jpg')
    expect(result).not.toContain('img20.jpg')
    expect(result).toContain('Showing 20 most recent')
  })

  test('includes chat attachments section when chatAttachments provided', async () => {
    const { buildSystemPrompt } = await import('@/ai/build-system-prompt')
    const result = await buildSystemPrompt({
      brandProfile: null,
      availableImages: [],
      brandMemories: [],
      chatAttachments: [
        {
          fileName: 'ref.jpg',
          width: 800,
          height: 600,
          publicUrl:
            'https://x.supabase.co/storage/v1/object/sign/chat-attachments/ref.jpg',
        },
      ],
    })
    expect(result).toContain('Images Attached This Turn')
    expect(result).toContain('ref.jpg')
    expect(result).toContain(
      'https://x.supabase.co/storage/v1/object/sign/chat-attachments/ref.jpg',
    )
    expect(result).toMatch(/only.*explicitly ask/i)
  })

  test('omits chat attachments section when list is empty', async () => {
    const { buildSystemPrompt } = await import('@/ai/build-system-prompt')
    const result = await buildSystemPrompt({
      brandProfile: null,
      availableImages: [],
      brandMemories: [],
      chatAttachments: [],
    })
    expect(result).not.toContain('Images Attached This Turn')
  })

  test('chat attachments section is distinct from media library section', async () => {
    const { buildSystemPrompt } = await import('@/ai/build-system-prompt')
    const result = await buildSystemPrompt({
      brandProfile: null,
      availableImages: [
        {
          fileName: 'lib.jpg',
          fileType: 'image/jpeg',
          width: 100,
          height: 100,
          publicUrl: 'https://x.supabase.co/storage/v1/object/public/media/lib.jpg',
          mediaId: 'm1',
        },
      ],
      brandMemories: [],
      chatAttachments: [
        {
          fileName: 'att.jpg',
          width: 100,
          height: 100,
          publicUrl:
            'https://x.supabase.co/storage/v1/object/sign/chat-attachments/att.jpg',
        },
      ],
    })
    expect(result).toContain('Available Media Library Images')
    expect(result).toContain('Images Attached This Turn')
  })

  test('includes memory instructions', async () => {
    const { buildSystemPrompt } = await import('@/ai/build-system-prompt')
    const result = await buildSystemPrompt({
      brandProfile: null,
      availableImages: [],
      brandMemories: [],
    })
    expect(result).toContain('Brand Memory Instructions')
  })
})
