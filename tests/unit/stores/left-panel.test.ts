/**
 * useLeftPanelStore — Cluster 06 Task 11 tests.
 *
 * Per PRD 06 §12.1: three stacked collapsible sections (Pages, Layers, Shop).
 * Pages + Layers default-expanded, Shop default-collapsed. Expansion persists
 * per-user via localStorage.
 */
import { describe, test, expect, beforeEach } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'
import { useLeftPanelStore } from '@/stores/left-panel'

describe('useLeftPanelStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  test('defaults: pages + layers expanded, shop collapsed', () => {
    const lp = useLeftPanelStore()
    expect(lp.expanded.pages).toBe(true)
    expect(lp.expanded.layers).toBe(true)
    expect(lp.expanded.shop).toBe(false)
  })

  test('toggle flips a section', () => {
    const lp = useLeftPanelStore()
    lp.toggle('shop')
    expect(lp.expanded.shop).toBe(true)
    lp.toggle('shop')
    expect(lp.expanded.shop).toBe(false)
  })

  test('setExpanded sets explicit state', () => {
    const lp = useLeftPanelStore()
    lp.setExpanded('layers', false)
    expect(lp.expanded.layers).toBe(false)
  })

  test('persists expansion to localStorage', async () => {
    const lp = useLeftPanelStore()
    lp.setExpanded('shop', true)
    // watcher is async (Vue flush); allow a microtask tick
    await Promise.resolve()
    await new Promise((r) => setTimeout(r, 0))
    const raw = localStorage.getItem('left-panel-expanded')
    expect(raw).toBeTruthy()
    expect(JSON.parse(raw as string).shop).toBe(true)
  })

  test('rehydrates persisted state on a fresh store', () => {
    localStorage.setItem(
      'left-panel-expanded',
      JSON.stringify({ pages: false, layers: true, shop: true })
    )
    setActivePinia(createPinia())
    const lp = useLeftPanelStore()
    expect(lp.expanded.pages).toBe(false)
    expect(lp.expanded.shop).toBe(true)
  })

  test('falls back to defaults on malformed localStorage', () => {
    localStorage.setItem('left-panel-expanded', '{not json')
    setActivePinia(createPinia())
    const lp = useLeftPanelStore()
    expect(lp.expanded.pages).toBe(true)
    expect(lp.expanded.shop).toBe(false)
  })
})
