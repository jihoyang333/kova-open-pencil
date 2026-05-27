/**
 * useRightPanelStore — Cluster 06 Task 3.
 *
 * Covers PRD 06 RATIFICATIONS:
 *   §12.13 — Default tab on first canvas open = 'ai'
 *   §12.14 — STICKY on layer-click (store must not subscribe to selection)
 *   Prototype tab explicitly out of scope.
 */
import { describe, test, expect, beforeEach } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'
import { useRightPanelStore } from '@/stores/right-panel'

describe('useRightPanelStore (Cluster 06 Task 3)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  test('activeTab default = "ai" (§12.13 — Kova chat-first UX)', () => {
    const store = useRightPanelStore()
    expect(store.activeTab).toBe('ai')
    expect(store.isAiActive).toBe(true)
    expect(store.isDesignActive).toBe(false)
  })

  test('setActiveTab switches', () => {
    const store = useRightPanelStore()
    store.setActiveTab('design')
    expect(store.activeTab).toBe('design')
    expect(store.isDesignActive).toBe(true)
    expect(store.isAiActive).toBe(false)
  })

  test('persists per-canvas via localStorage', () => {
    const store = useRightPanelStore()
    store.initFor('canvas-1')
    store.setActiveTab('design')
    expect(localStorage.getItem('right-panel-tab:canvas-1')).toBe('design')
  })

  test('initFor with no localStorage key defaults to "ai" (first open)', () => {
    const store = useRightPanelStore()
    store.initFor('canvas-fresh')
    expect(store.activeTab).toBe('ai')
  })

  test('initFor hydrates from localStorage when key present', () => {
    localStorage.setItem('right-panel-tab:canvas-2', 'design')
    const store = useRightPanelStore()
    store.initFor('canvas-2')
    expect(store.activeTab).toBe('design')
  })

  test('initFor ignores invalid localStorage value, falls back to "ai"', () => {
    localStorage.setItem('right-panel-tab:canvas-3', 'prototype')
    const store = useRightPanelStore()
    store.initFor('canvas-3')
    expect(store.activeTab).toBe('ai')
  })

  test('setActiveTab rejects "prototype" runtime', () => {
    const store = useRightPanelStore()
    expect(() => store.setActiveTab('prototype' as unknown as 'design' | 'ai')).toThrow(
      'invalid_tab: prototype'
    )
  })

  test('toggleAi flips between ai and design', () => {
    const store = useRightPanelStore()
    expect(store.activeTab).toBe('ai')
    store.toggleAi()
    expect(store.activeTab).toBe('design')
    store.toggleAi()
    expect(store.activeTab).toBe('ai')
  })

  test('REGRESSION GUARD (§12.14 sticky): store source does NOT import editor / selection', async () => {
    const raw = await Bun.file('src/stores/right-panel.ts').text()
    // Strip block + line comments before scanning so we only check real code.
    const code = raw
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^[ \t]*\/\/.*$/gm, '')
    expect(code).not.toMatch(/\buseEditorStore\b/)
    expect(code).not.toMatch(/\bselectedNodeIds\b/)
    expect(code).not.toMatch(/\bselectionStore\b/)
    expect(code).not.toMatch(/from\s+['"]@\/stores\/editor['"]/)
  })
})
