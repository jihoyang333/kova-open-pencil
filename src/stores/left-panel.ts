/**
 * useLeftPanelStore — Cluster 06 Task 11.
 *
 * Per PRD 06 §12.1 RATIFIED 2026-05-17: left panel renders THREE stacked
 * collapsible sections (Pages, Layers, Shop). Collapsed state persists
 * per-user via localStorage.
 *
 * Shop is default-collapsed unless the active brand has a confirmed
 * Shopify connection — that override is applied at the component layer
 * (LeftPanel.vue computes :default-open from useShopifyConnection).
 */
import { defineStore } from 'pinia'
import { reactive, watch } from 'vue'

export type LeftPanelSection = 'pages' | 'layers' | 'shop'
export type SectionExpansion = Record<LeftPanelSection, boolean>

const STORAGE_KEY = 'left-panel-expanded'

const DEFAULT_STATE: SectionExpansion = {
  pages: true,
  layers: true,
  shop: false,
}

function loadInitial(): SectionExpansion {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_STATE }
    const parsed = JSON.parse(raw) as Partial<SectionExpansion>
    return {
      pages: parsed.pages ?? DEFAULT_STATE.pages,
      layers: parsed.layers ?? DEFAULT_STATE.layers,
      shop: parsed.shop ?? DEFAULT_STATE.shop,
    }
  } catch {
    return { ...DEFAULT_STATE }
  }
}

export const useLeftPanelStore = defineStore('left-panel', () => {
  const expanded = reactive<SectionExpansion>(loadInitial())

  watch(
    expanded,
    (next) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        /* localStorage unavailable */
      }
    },
    { deep: true }
  )

  function toggle(section: LeftPanelSection): void {
    expanded[section] = !expanded[section]
  }

  function setExpanded(section: LeftPanelSection, open: boolean): void {
    expanded[section] = open
  }

  return { expanded, toggle, setExpanded }
})
