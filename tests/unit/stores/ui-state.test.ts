import { beforeEach, describe, expect, test } from 'bun:test'
import { createPinia, setActivePinia } from 'pinia'
import { useUIStateStore } from '@/stores/ui-state'

beforeEach(() => {
  setActivePinia(createPinia())
  window.localStorage.clear()
})

describe('useUIStateStore', () => {
  test('defaults are correct', () => {
    const s = useUIStateStore()
    expect(s.pagesCollapsed).toBe(false)
    expect(s.layersCollapsed).toBe(false)
    expect(s.sidebarLeftWidth).toBe(240)
    expect(s.sidebarRightWidth).toBe(264)
    expect(s.recentColors).toEqual([])
    expect(s.lastActiveBrandId).toBeNull()
    expect(s.lastActiveCanvasId).toBeNull()
    expect(s.dismissedToasts).toEqual([])
  })

  test('pushRecentColor adds at head', () => {
    const s = useUIStateStore()
    s.pushRecentColor('#ff00aa')
    expect(s.recentColors).toEqual(['#ff00aa'])
  })

  test('pushRecentColor dedupes case-insensitively', () => {
    const s = useUIStateStore()
    s.pushRecentColor('#FF00AA')
    s.pushRecentColor('#ff00aa')
    expect(s.recentColors).toEqual(['#ff00aa'])
  })

  test('pushRecentColor caps at 12 with FIFO eviction (founder ratified 2026-05-17)', () => {
    const s = useUIStateStore()
    for (let i = 0; i < 30; i++) {
      s.pushRecentColor(`#${i.toString(16).padStart(6, '0')}`)
    }
    expect(s.recentColors.length).toBe(12)
    expect(s.recentColors[0]).toBe('#00001d')
    expect(s.recentColors[11]).toBe('#000012')
  })

  test('dismissToast is idempotent', () => {
    const s = useUIStateStore()
    s.dismissToast('confetti-2026')
    s.dismissToast('confetti-2026')
    expect(s.dismissedToasts).toEqual(['confetti-2026'])
  })

  test('all localStorage keys prefixed kova:ui:', () => {
    const s = useUIStateStore()
    s.pagesCollapsed = true
    s.pushRecentColor('#abc123')
    s.lastActiveBrandId = 'brand-1'
    const keys = Object.keys(window.localStorage)
    for (const k of keys) {
      expect(k.startsWith('kova:ui:')).toBe(true)
    }
  })
})
