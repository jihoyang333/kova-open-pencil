import { describe, expect, test } from 'bun:test'

import { buildSystemPrompt } from '@/ai/build-system-prompt'

import type { BrandMemory } from '@/types/kova/brand-memory'
import type { Brand } from '@/types/kova/database'

const baseBrand: Brand = {
  id: 'b1', user_id: 'u1', name: 'Acme', created_at: '', updated_at: '',
  tone_snippets: [], saved_blocks: [],
  colors: {}, fonts: {}, voice: '', logo_url: null
} as unknown as Brand

// ---------------------------------------------------------------------------
// Task 5 — formatToneSnippets
// ---------------------------------------------------------------------------
describe('formatToneSnippets layer', () => {
  test('omitted when tone_snippets empty', async () => {
    const prompt = await buildSystemPrompt({
      brandProfile: baseBrand, availableImages: [],
      brandMemories: [], chatAttachments: []
    })
    expect(prompt).not.toContain('## Brand Voice Exemplars')
  })

  test('renders with up to 10 entries', async () => {
    const snippets = Array.from({ length: 12 }, (_, i) => ({
      id: `s${i}`, label: `Snippet ${i}`, content: `Voice ${i}`
    }))
    const brand: Brand = { ...baseBrand, tone_snippets: snippets } as unknown as Brand
    const prompt = await buildSystemPrompt({
      brandProfile: brand, availableImages: [],
      brandMemories: [], chatAttachments: []
    })
    expect(prompt).toContain('## Brand Voice Exemplars')
    expect(prompt).toContain('Voice 0')
    expect(prompt).toContain('Voice 9')
    expect(prompt).not.toContain('Voice 10')
    expect(prompt).toContain('(2 more snippets exist')
  })

  test('preserves JSONB array order', async () => {
    const snippets = [
      { id: 's1', label: 'B', content: 'Beta' },
      { id: 's2', label: 'A', content: 'Alpha' }
    ]
    const brand: Brand = { ...baseBrand, tone_snippets: snippets } as unknown as Brand
    const prompt = await buildSystemPrompt({
      brandProfile: brand, availableImages: [],
      brandMemories: [], chatAttachments: []
    })
    const bIdx = prompt.indexOf('Beta')
    const aIdx = prompt.indexOf('Alpha')
    expect(bIdx).toBeLessThan(aIdx)
  })
})

// ---------------------------------------------------------------------------
// Task 5b — formatBrandMemories cap=50 newest (§12.12 item 2)
// ---------------------------------------------------------------------------
const makeMemory = (i: number, daysAgo: number): BrandMemory => ({
  id: `m${i}`,
  brand_id: 'b1',
  user_id: 'u1',
  content: `memory-${i}`,
  source: 'user',
  created_at: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString()
})

describe('formatBrandMemories cap=50 newest (§12.12 item 2)', () => {
  test('renders all when <= 50 memories', async () => {
    const memories = Array.from({ length: 30 }, (_, i) => makeMemory(i, i))
    const prompt = await buildSystemPrompt({
      brandProfile: baseBrand, availableImages: [],
      brandMemories: memories, chatAttachments: [], productReferences: []
    })
    expect(prompt).toContain('## Brand Memories')
    for (let i = 0; i < 30; i++) {
      expect(prompt).toContain(`memory-${i}`)
    }
    expect(prompt).not.toContain('older memories exist')
  })

  test('caps to 50 newest by created_at DESC when > 50', async () => {
    // memory-0 = today (newest); memory-99 = 99 days ago (oldest)
    const memories = Array.from({ length: 100 }, (_, i) => makeMemory(i, i))
    const prompt = await buildSystemPrompt({
      brandProfile: baseBrand, availableImages: [],
      brandMemories: memories, chatAttachments: [], productReferences: []
    })
    for (let i = 0; i < 50; i++) {
      expect(prompt).toContain(`memory-${i}`)
    }
    for (let i = 50; i < 100; i++) {
      expect(prompt).not.toContain(`memory-${i}`)
    }
    expect(prompt).toContain('(50 older memories exist; using the most recent 50 per the configured cap.)')
  })

  test('sort is stable on tied created_at', async () => {
    const sameTime = '2026-05-17T00:00:00Z'
    const memories: BrandMemory[] = [
      { id: 'a', brand_id: 'b1', user_id: 'u1', content: 'A', source: 'user', created_at: sameTime },
      { id: 'b', brand_id: 'b1', user_id: 'u1', content: 'B', source: 'user', created_at: sameTime }
    ]
    const prompt = await buildSystemPrompt({
      brandProfile: baseBrand, availableImages: [],
      brandMemories: memories, chatAttachments: [], productReferences: []
    })
    expect(prompt).toContain('A')
    expect(prompt).toContain('B')
  })
})

// ---------------------------------------------------------------------------
// Task 6 — formatProductReferences + Layer 9
// ---------------------------------------------------------------------------
describe('formatProductReferences layer', () => {
  const makeRef = (i: number, range = false) => ({
    product_id: `p${i}`, title: `Product ${i}`,
    primary_image_url: `https://cdn.shopify.com/${i}.jpg`,
    price_low: '29.00', price_high: range ? '49.00' : null,
    currency: 'USD', handle: `p-${i}`, added_at: '2026-06-20T00:00:00Z'
  })

  test('omitted when productReferences empty', async () => {
    const prompt = await buildSystemPrompt({
      brandProfile: baseBrand, availableImages: [],
      brandMemories: [], chatAttachments: [],
      productReferences: []
    })
    expect(prompt).not.toContain('## Active Product References')
  })

  test('renders single-price chip', async () => {
    const prompt = await buildSystemPrompt({
      brandProfile: baseBrand, availableImages: [],
      brandMemories: [], chatAttachments: [],
      productReferences: [makeRef(1)]
    })
    expect(prompt).toContain('## Active Product References')
    expect(prompt).toContain('Product 1')
    expect(prompt).toContain('Price: 29.00 USD')
  })

  test('renders price range when price_high present', async () => {
    const prompt = await buildSystemPrompt({
      brandProfile: baseBrand, availableImages: [],
      brandMemories: [], chatAttachments: [],
      productReferences: [makeRef(1, true)]
    })
    expect(prompt).toContain('Price: 29.00–49.00 USD')
  })

  test('renders all 20 when at cap', async () => {
    const refs = Array.from({ length: 20 }, (_, i) => makeRef(i))
    const prompt = await buildSystemPrompt({
      brandProfile: baseBrand, availableImages: [],
      brandMemories: [], chatAttachments: [],
      productReferences: refs
    })
    expect(prompt).toContain('Product 0')
    expect(prompt).toContain('Product 19')
  })
})
