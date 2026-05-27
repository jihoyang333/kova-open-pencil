/**
 * useRightPanelTab — Cluster 06 Task 7.
 */
import { describe, test, expect, beforeEach } from 'bun:test'
import { setActivePinia, createPinia } from 'pinia'
import {
  useRightPanelTab,
  __resetRightPanelTabListeners,
} from '@/composables/use-right-panel-tab'
import { useRightPanelStore } from '@/stores/right-panel'

function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => queueMicrotask(resolve))
}

describe('useRightPanelTab (Cluster 06 Task 7)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    __resetRightPanelTabListeners()
  })

  test('switchToDesign + switchToAi delegate to store', () => {
    const store = useRightPanelStore()
    const tab = useRightPanelTab()
    tab.switchToAi()
    expect(store.activeTab).toBe('ai')
    tab.switchToDesign()
    expect(store.activeTab).toBe('design')
  })

  test('focusAiComposer switches tab + fires focus listeners', async () => {
    const tab = useRightPanelTab()
    let focused = 0
    const off = tab.onFocusRequest(() => focused++)

    tab.switchToDesign()
    tab.focusAiComposer()

    await flushMicrotasks()
    expect(useRightPanelStore().activeTab).toBe('ai')
    expect(focused).toBe(1)

    off()
  })

  test('onFocusRequest returns unsubscribe', async () => {
    const tab = useRightPanelTab()
    let focused = 0
    const off = tab.onFocusRequest(() => focused++)
    off()
    tab.focusAiComposer()
    await flushMicrotasks()
    expect(focused).toBe(0)
  })

  test('multiple subscribers all fire', async () => {
    const tab = useRightPanelTab()
    let a = 0
    let b = 0
    tab.onFocusRequest(() => a++)
    tab.onFocusRequest(() => b++)
    tab.focusAiComposer()
    await flushMicrotasks()
    expect(a).toBe(1)
    expect(b).toBe(1)
  })
})
