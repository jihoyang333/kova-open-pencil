/**
 * useRightPanelStore — Cluster 06 Task 3.
 *
 * PRD 06 RATIFIED 2026-05-17:
 *   §12.13 — Default tab on FIRST canvas open = 'ai' (Kova differentiator over Figma).
 *   §12.14 — STICKY on layer-click: this store MUST NOT subscribe to selection events.
 *
 * Prototype tab is explicitly out of scope (founder ratification 2026-05-15).
 */
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export type RightPanelTab = 'design' | 'ai'

function storageKey(canvasId: string): string {
  return `right-panel-tab:${canvasId}`
}

function readPersisted(canvasId: string): RightPanelTab | null {
  try {
    const raw = localStorage.getItem(storageKey(canvasId))
    return raw === 'design' || raw === 'ai' ? raw : null
  } catch {
    return null
  }
}

function writePersisted(canvasId: string, tab: RightPanelTab): void {
  try {
    localStorage.setItem(storageKey(canvasId), tab)
  } catch {
    /* localStorage unavailable */
  }
}

export const useRightPanelStore = defineStore('right-panel', () => {
  const activeTab = ref<RightPanelTab>('ai')
  const currentCanvasId = ref<string | null>(null)

  const isDesignActive = computed(() => activeTab.value === 'design')
  const isAiActive = computed(() => activeTab.value === 'ai')

  function setActiveTab(tab: RightPanelTab): void {
    // L12 — runtime guard against external callers (storage corruption,
    // devtools, future migration paths). TypeScript prevents in-source
    // 'prototype' calls; this catches anything that slips through.
    if (tab !== 'design' && tab !== 'ai') {
      throw new Error(`invalid_tab: ${tab}`)
    }
    activeTab.value = tab
    if (currentCanvasId.value) {
      writePersisted(currentCanvasId.value, tab)
    }
  }

  function toggleAi(): void {
    setActiveTab(activeTab.value === 'ai' ? 'design' : 'ai')
  }

  function initFor(canvasId: string): void {
    currentCanvasId.value = canvasId
    const persisted = readPersisted(canvasId)
    activeTab.value = persisted ?? 'ai'
  }

  // §12.14 STICKY: do NOT import useEditorStore; do NOT subscribe to selection.
  // Sticky behavior verified by static-check test.

  return {
    activeTab,
    currentCanvasId,
    isDesignActive,
    isAiActive,
    setActiveTab,
    toggleAi,
    initFor,
  }
})
