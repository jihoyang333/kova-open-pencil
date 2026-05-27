/**
 * useInspectorRouter — Cluster 06 Task 6.
 *
 * Per PRD 06 §12.15 RATIFIED 2026-05-17, Cluster 06 ships the registry +
 * PageSection (priority 10, supports='none'); Cluster 07b registers
 * Position/Layout/Appearance/Fill/Stroke/Typography/Effects/Export/Variables
 * at priorities 20-100 at app boot.
 *
 * The router sorts ascending by priority and filters by selection support.
 * Decoupled — adding/removing sections in 07b does not require 06 changes.
 */
import { computed, ref, type ComputedRef } from 'vue'
import type { InspectorSectionDef } from '@/types/inspector'
import { useEditorStore } from '@/stores/editor'

const sections = ref<InspectorSectionDef[]>([])

export function registerInspectorSection(def: InspectorSectionDef): void {
  if (sections.value.some((x) => x.id === def.id)) return
  sections.value = [...sections.value, def]
}

export function unregisterInspectorSection(id: string): void {
  sections.value = sections.value.filter((x) => x.id !== id)
}

export function clearInspectorSections(): void {
  sections.value = []
}

export interface UseInspectorRouter {
  activeSections: ComputedRef<InspectorSectionDef[]>
}

export function useInspectorRouter(): UseInspectorRouter {
  const editor = useEditorStore()

  const activeSections = computed<InspectorSectionDef[]>(() => {
    void editor.state.sceneVersion
    const ids = [...editor.state.selectedIds]
    const isMulti = ids.length > 1
    const noSelection = ids.length === 0
    const firstNode = !isMulti && !noSelection ? editor.graph.getNode(ids[0]) : undefined
    const selectedType = firstNode?.type ?? null

    return sections.value
      .filter((s) => {
        if (s.supports === 'none') return noSelection
        if (noSelection) return false
        if (isMulti && s.multiSelect === false) return false
        if (s.supports === 'all') return true
        return Array.isArray(s.supports) && selectedType !== null && s.supports.includes(selectedType)
      })
      .sort((a, b) => a.priority - b.priority)
  })

  return { activeSections }
}
