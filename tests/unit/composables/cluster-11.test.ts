// Combined Phase 2 composable unit tests (Cluster 11 Plan Tasks 2.1-2.5).

import { describe, it, expect, beforeEach } from 'bun:test'
import { ref, nextTick } from 'vue'
import type { Router } from 'vue-router'
import { useTheme } from '@/composables/use-theme'
import { useIdempotencyKey } from '@/composables/use-idempotency-key'
import { useReducedMotion } from '@/composables/use-reduced-motion'

// Minimal fake router: only the fields useTheme reads are populated. Avoids
// vue-router's createMemoryHistory which requires a real window.history.
function makeRouter(meta: { theme?: 'light' | 'dark' }): Router {
  const route = ref({ meta })
  return { currentRoute: route } as unknown as Router
}

describe('useTheme (Task 2.1)', () => {
  beforeEach(() => {
    delete document.documentElement.dataset['theme']
  })

  it('defaults to dark when route.meta.theme is unset', async () => {
    const { theme } = useTheme(makeRouter({}))
    await nextTick()
    expect(theme.value).toBe('dark')
    expect(document.documentElement.dataset['theme']).toBe('dark')
  })

  it('sets light when route.meta.theme=light', async () => {
    const { theme } = useTheme(makeRouter({ theme: 'light' }))
    await nextTick()
    expect(theme.value).toBe('light')
    expect(document.documentElement.dataset['theme']).toBe('light')
  })
})

describe('useIdempotencyKey (Task 2.3)', () => {
  it('generates a UUID v4', () => {
    const { generate } = useIdempotencyKey()
    const k = generate()
    expect(k).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    )
  })

  it('generates unique values', () => {
    const { generate } = useIdempotencyKey()
    expect(generate()).not.toBe(generate())
  })
})

describe('useReducedMotion (Task 2.2)', () => {
  it('returns a reactive ref backed by matchMedia', () => {
    const { reduced } = useReducedMotion()
    expect(typeof reduced.value).toBe('boolean')
  })
})
