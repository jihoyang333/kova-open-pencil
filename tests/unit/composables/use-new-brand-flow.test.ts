import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { createPinia, setActivePinia } from 'pinia'

import { useNewBrandFlow } from '@/composables/use-new-brand-flow'

// W9b Cluster 03 — wizard state machine (Plan 03 Task 19).
// Pinia must be active because flow.commitAndAdvance calls useBrandsStore.
// Commit-path itself is tested via store unit tests separately.

describe('useNewBrandFlow', () => {
  beforeEach(() => setActivePinia(createPinia()))
  afterEach(() => setActivePinia(undefined as never))

  test('initial state is name-url with empty fields', () => {
    const flow = useNewBrandFlow()
    expect(flow.step.value).toBe('name-url')
    expect(flow.name.value).toBe('')
    expect(flow.url.value).toBe('')
    expect(flow.description.value).toBe('')
    expect(flow.brandId.value).toBe(null)
    expect(flow.isDirty.value).toBe(false)
  })

  test('isDirty turns true when any field non-empty', () => {
    const flow = useNewBrandFlow()
    flow.name.value = 'Patagonia'
    expect(flow.isDirty.value).toBe(true)
  })

  test('advance walks name-url → shopify → brand-kit → done', () => {
    const flow = useNewBrandFlow()
    flow.advance()
    expect(flow.step.value).toBe('shopify')
    flow.advance()
    expect(flow.step.value).toBe('brand-kit')
    flow.advance()
    expect(flow.step.value).toBe('done')
    flow.advance() // no-op past terminal
    expect(flow.step.value).toBe('done')
  })

  test('back walks done backwards but stops at name-url', () => {
    const flow = useNewBrandFlow()
    flow.advance() // shopify
    flow.advance() // brand-kit
    flow.back()
    expect(flow.step.value).toBe('shopify')
    flow.back()
    expect(flow.step.value).toBe('name-url')
    flow.back() // no-op
    expect(flow.step.value).toBe('name-url')
  })

  test('back from done is no-op (terminal step has no back)', () => {
    const flow = useNewBrandFlow()
    flow.goTo('done')
    flow.back()
    expect(flow.step.value).toBe('done')
  })

  test('reset clears all state', () => {
    const flow = useNewBrandFlow()
    flow.name.value = 'X'
    flow.url.value = 'https://x.com'
    flow.description.value = 'd'
    flow.advance()
    flow.reset()
    expect(flow.step.value).toBe('name-url')
    expect(flow.name.value).toBe('')
    expect(flow.url.value).toBe('')
    expect(flow.description.value).toBe('')
    expect(flow.brandId.value).toBe(null)
  })
})
