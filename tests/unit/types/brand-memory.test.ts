import { describe, test, expect } from 'bun:test'
import type { BrandMemory, BrandMemorySource } from '@/types/kova/brand-memory'

describe('BrandMemory type', () => {
  test('BrandMemory has the expected shape', () => {
    const memory: BrandMemory = {
      id: 'mem-1',
      brand_id: 'brand-1',
      user_id: 'user-1',
      content: 'CTAs should always use coral',
      source: 'auto',
      created_at: '2026-04-15T00:00:00Z',
    }
    expect(memory.id).toBe('mem-1')
    expect(memory.source).toBe('auto')
  })

  test('source is narrowed to auto | user', () => {
    const sources: BrandMemorySource[] = ['auto', 'user']
    expect(sources).toHaveLength(2)
  })
})
